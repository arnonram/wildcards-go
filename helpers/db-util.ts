import { type Db, MongoClient } from 'mongodb';
import { ensureIndexes } from '../server/character-store';

type Connection = { client: MongoClient; db: Db };

// Kept on globalThis so `next dev` hot reloads reuse the connection instead
// of leaking a new client each time.
const cache = globalThis as typeof globalThis & { __wcgMongo?: Promise<Connection> };

async function connect(): Promise<Connection> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error('MONGODB_URI environmental variable missing');
  }

  if (!dbName) {
    throw new Error('MONGODB_DB environmental variable missing');
  }

  // Fail fast so API requests (and the offline sync queue) do not hang when
  // MongoDB is temporarily unavailable.
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    await ensureIndexes(db);
    return { client, db };
  } catch (error) {
    await client.close();
    throw error;
  }
}

/**
 * One shared connection. Concurrent first callers await the same promise; a
 * failed attempt is dropped so the next request tries again.
 */
export function connectToDb(): Promise<Connection> {
  cache.__wcgMongo ??= connect().catch((error) => {
    cache.__wcgMongo = undefined;
    throw error;
  });
  return cache.__wcgMongo;
}
