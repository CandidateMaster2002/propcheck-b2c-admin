import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

// POST /api/admin/migrate-shortids
// One-time migration: backfills shortId (last 6 chars of _id, uppercased) for all
// existing properties that don't have it set yet.
export async function POST() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    // Step 1: Ensure the shortId index exists in MongoDB
    await Property.ensureIndexes();

    // Step 2: Cursor-based pagination using _id (always indexed, never scans)
    const BATCH_SIZE = 500;
    let lastId: any = null;
    let totalModified = 0;

    while (true) {
      const matchQuery: any = lastId ? { _id: { $gt: lastId } } : {};

      const batch = await Property.find(matchQuery)
        .select('_id shortId')
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean() as any[];

      if (batch.length === 0) break;

      lastId = (batch[batch.length - 1] as any)._id;

      const toUpdate = batch.filter((doc: any) => !doc.shortId);
      if (toUpdate.length > 0) {
        await Property.bulkWrite(
          toUpdate.map((doc: any) => ({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { shortId: doc._id.toString().slice(-6).toUpperCase() } },
            },
          }))
        );
        totalModified += toUpdate.length;
      }
    }

    return NextResponse.json({
      status: true,
      message: `Migration complete. Updated ${totalModified} records.`,
      modifiedCount: totalModified,
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
