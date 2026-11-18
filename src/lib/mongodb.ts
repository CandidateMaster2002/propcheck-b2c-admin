import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows querySrv ECONNREFUSED with MongoDB Atlas SRV connection strings
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.DB_URL || '';
  if (!uri) {
    throw new Error('CRITICAL: MONGODB_URI environment variable is required');
  }
  return uri;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const MONGODB_URI = getMongoUri();
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority' as const,
      appName: 'PropChk-B2C'
    };


    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection promise rejected:', error.message);
      console.error('📊 Error details:', JSON.stringify(error, null, 2));
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed in dbConnect:');
    console.error('📛 Error name:', e.name);
    console.error('💬 Error message:', e.message);
    console.error('📚 Error stack:', e.stack);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
