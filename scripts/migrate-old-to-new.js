/**
 * Migration Script: PropRightProd (old) → PropcheckB2Cprod (new)
 *
 * Migrates data from the old on-premise MongoDB to the new Atlas database.
 * Transforms field names where the new Next.js models expect different keys.
 *
 * Usage:
 *   node scripts/migrate-old-to-new.js
 *
 * Requirements:
 *   - VPN must be connected (old DB is on private IP)
 *   - Both databases must be reachable
 */

const { MongoClient, ObjectId } = require('mongodb');

// ---------------------------------------------------------------------------
// Connection URIs
// ---------------------------------------------------------------------------
const OLD_URI = 'mongodb://IfW8PMXeiZ4OPOMY:2jKtu6qoMlLunSWFeJxB@10.40.48.80:27017/PropRightProd';
const NEW_URI = 'mongodb+srv://server_db_user:fIniXzWa5zwjIIvJ@propcheck-dev.3djecbi.mongodb.net/PropcheckB2Cprod?retryWrites=true&w=majority&appName=propcheck-dev';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg) {  }
function logOk(msg) {  }
function logWarn(msg) {  }
function logErr(msg) { console.error(`  ❌ ${msg}`); }

// ---------------------------------------------------------------------------
// Migration definitions
// Each entry: { oldCollection, newCollection, transform? }
// transform receives a doc and returns the transformed doc (or null to skip)
// ---------------------------------------------------------------------------
const MIGRATIONS = [
  // 1. Agents: agentshomeinspection → agents
  {
    oldCollection: 'agentshomeinspection',
    newCollection: 'agents',
    transform: (doc) => ({
      ...doc,
      // Keep userName from old, also set name for new code compatibility
      name: doc.userName || doc.name || '',
      userName: doc.userName || doc.name || '',
    }),
  },

  // 2. Agent Statements: customercouponstatements → agentstatements
  {
    oldCollection: 'customercouponstatements',
    newCollection: 'agentstatements',
    transform: (doc) => {
      // Convert string agentId to ObjectId if possible
      let agentIdObj = doc.agentId;
      try {
        if (typeof doc.agentId === 'string' && doc.agentId.length === 24) {
          agentIdObj = new ObjectId(doc.agentId);
        }
      } catch { /* keep as-is */ }

      let inspectionIdObj = doc.inspectionId;
      try {
        if (typeof doc.inspectionId === 'string' && doc.inspectionId.length === 24) {
          inspectionIdObj = new ObjectId(doc.inspectionId);
        }
      } catch { /* keep as-is */ }

      const netAmount = doc.netAmount ??
        ((doc.amount || 0) - (doc.couponAmount || 0) - (doc.incentiveAmount || 0));

      return {
        _id: doc._id,
        inspectionId: inspectionIdObj || null,
        agentId: agentIdObj,
        bookingDate: doc.createdAt || doc.insectionDate || doc.createdDate || new Date(),
        customerName: doc.userName || '',
        agentName: '',  // will be filled by the app via populate
        couponCode: doc.couponCode || '',
        amount: doc.amount || 0,
        discount: doc.couponAmount || 0,
        incentiveAmount: doc.incentiveAmount || 0,
        netAmount: netAmount,
        customerAmount: doc.grandTotalAmount || 0,
        isPaid: (doc.transactionId && doc.transactionId.length > 0) ? true : false,
        isIncentivePaid: doc.incentiveStatus === 'Paid',
        utrNumber: doc.utrNumber || '',
        incentivePaidDate: doc.incentivePaidDate || null,
        createdAt: doc.createdAt || doc.createdDate || new Date(),
        updatedAt: doc.updatedAt || doc.updatedDate || new Date(),
        // Preserve old fields for reference
        _old_couponPercentage: doc.couponPercentage,
        _old_incentivePercentage: doc.incentivePercentage,
        _old_propertyName: doc.propertyName,
        _old_transactionId: doc.transactionId,
        _old_insectionDate: doc.insectionDate,
      };
    },
  },

  // 3. Inspection Prices: pricehomeinspection → inspectionprices
  {
    oldCollection: 'pricehomeinspection',
    newCollection: 'inspectionprices',
    transform: (doc) => ({
      ...doc,
      // Keep old fields and add new compat fields
      propertyType: doc.propertyType || '',
      propertySize: doc.propertySize || 0,
      propertyPrice: doc.propertyPrice || 0,
      basePrice: doc.propertyPrice || 0,  // compat alias
      variablePay: (doc.variablePay || []).map((v) => ({
        variableSize: v.variableSize || 0,
        variableAmount: v.variableAmount || 0,
      })),
      status: doc.status || 'Active',
    }),
  },

  // 4. Scoring Metrics: scoringmetrics → metricscores (for new MetricScore model)
  {
    oldCollection: 'scoringmetrics',
    newCollection: 'metricscores',
    transform: (doc) => ({
      _id: doc._id,
      major: doc.major || 0,
      minor: doc.minor || 0,
      cosmetic: doc.cosmetic || 0,
      createdAt: doc.createdDate || doc.createdAt || new Date(),
      updatedAt: doc.updatedDate || doc.updatedAt || new Date(),
    }),
  },

  // 5. Also copy scoringmetrics → scoringmetrics (keep original for existing scoring page)
  {
    oldCollection: 'scoringmetrics',
    newCollection: 'scoringmetrics',
    transform: (doc) => ({ ...doc }),
  },

  // 6. Coupons assigned list: couponsassignedlist → (keep same name for agent coupons)
  {
    oldCollection: 'couponsassignedlist',
    newCollection: 'couponsassignedlist',
    transform: (doc) => ({ ...doc }),
  },

  // 7. Coupons list: couponslist → couponslist
  {
    oldCollection: 'couponslist',
    newCollection: 'couponslist',
    transform: (doc) => ({ ...doc }),
  },

  // 8. Data management: data-manangement → data-manangement (keep same name)
  {
    oldCollection: 'data-manangement',
    newCollection: 'data-manangement',
    transform: (doc) => ({ ...doc }),
  },

  // 9. Inspectors: inspectors → inspectors
  {
    oldCollection: 'inspectors',
    newCollection: 'inspectors',
    transform: (doc) => ({ ...doc }),
  },

  // 10. Properties: Properties → properties (note case difference)
  {
    oldCollection: 'Properties',
    newCollection: 'properties',
    transform: (doc) => ({ ...doc }),
  },

  // 11. Administrators: administrators → administrators
  {
    oldCollection: 'administrators',
    newCollection: 'administrators',
    transform: (doc) => ({ ...doc }),
  },
];

// ---------------------------------------------------------------------------
// Migration engine
// ---------------------------------------------------------------------------
async function migrateCollection(oldDb, newDb, config) {
  const { oldCollection, newCollection, transform } = config;

  log(`Migrating: ${oldCollection} → ${newCollection}`);

  // Check if source exists
  const oldColl = oldDb.collection(oldCollection);
  const sourceCount = await oldColl.countDocuments();

  if (sourceCount === 0) {
    logWarn(`Source "${oldCollection}" has 0 documents — skipping`);
    return { source: oldCollection, target: newCollection, migrated: 0, skipped: 0, status: 'empty_source' };
  }

  log(`  Found ${sourceCount} documents in source`);

  // Check if target already has data
  const newColl = newDb.collection(newCollection);
  const targetCount = await newColl.countDocuments();

  if (targetCount > 0) {
    logWarn(`Target "${newCollection}" already has ${targetCount} documents — clearing before migration`);
    await newColl.deleteMany({});
    logOk(`Cleared ${targetCount} documents from target`);
  }

  // Read all source docs
  const cursor = oldColl.find({});
  let migrated = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;
  let batch = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    try {
      const transformed = transform ? transform(doc) : doc;
      if (transformed === null) {
        skipped++;
        continue;
      }
      batch.push(transformed);

      if (batch.length >= BATCH_SIZE) {
        await newColl.insertMany(batch, { ordered: false });
        migrated += batch.length;
        batch = [];
        process.stdout.write(`\r  Migrated ${migrated} / ${sourceCount}...`);
      }
    } catch (err) {
      logErr(`Error transforming doc ${doc._id}: ${err.message}`);
      skipped++;
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    await newColl.insertMany(batch, { ordered: false });
    migrated += batch.length;
  }

   // newline after progress
  logOk(`Migrated ${migrated} documents, skipped ${skipped}`);

  return { source: oldCollection, target: newCollection, migrated, skipped, status: 'done' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {

  let oldClient, newClient;

  try {
    // Connect to OLD database
    log('Connecting to OLD database (PropRightProd @ 10.40.48.80)...');
    oldClient = new MongoClient(OLD_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    await oldClient.connect();
    const oldDb = oldClient.db('PropRightProd');
    logOk('Connected to OLD database');

    // List old collections for reference
    const oldCollections = await oldDb.listCollections().toArray();
    log(`OLD database has ${oldCollections.length} collections: ${oldCollections.map(c => c.name).join(', ')}`);

    // Connect to NEW database
    log('Connecting to NEW database (PropcheckB2Cprod @ Atlas)...');
    newClient = new MongoClient(NEW_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    await newClient.connect();
    const newDb = newClient.db('PropcheckB2Cprod');
    logOk('Connected to NEW database');


    // Run all migrations
    const results = [];
    for (const config of MIGRATIONS) {
      try {
        const result = await migrateCollection(oldDb, newDb, config);
        results.push(result);
      } catch (err) {
        logErr(`Failed to migrate ${config.oldCollection}: ${err.message}`);
        results.push({
          source: config.oldCollection,
          target: config.newCollection,
          migrated: 0,
          skipped: 0,
          status: `error: ${err.message}`,
        });
      }
    }

    // Print summary
    for (const r of results) {
      const src = r.source.padEnd(28);
      const tgt = r.target.padEnd(30);
      const cnt = String(r.migrated).padStart(7);
    }
    const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
    logOk(`Total documents migrated: ${totalMigrated}`);

    // Verify new counts
    log('Verifying new database counts...');
    const newCollections = await newDb.listCollections().toArray();
    for (const coll of newCollections) {
      const count = await newDb.collection(coll.name).countDocuments();
      if (count > 0) {
      }
    }

  } catch (err) {
    logErr(`Migration failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    if (oldClient) await oldClient.close();
    if (newClient) await newClient.close();
    log('Connections closed');
  }
}

main().catch(console.error);
