// MongoDB connection (document data: medical reports, clinical notes, audit logs).
// One client is reused across requests and hot reloads. A failed connection is
// not cached, so the app recovers as soon as MongoDB comes back.
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

export async function getDb() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = null;
      throw err;
    });
  }
  const client = await global._mongoClientPromise;
  return client.db(process.env.MONGODB_DB || 'MultiHospitalHealthcare');
}

// Read helper for pages: returns { data, error } instead of throwing, so a page
// still renders its MySQL sections if MongoDB is down.
export async function tryMongo(work) {
  try {
    const db = await getDb();
    return { data: await work(db), error: null };
  } catch (err) {
    return { data: null, error: 'Document store (MongoDB) is unavailable' };
  }
}
