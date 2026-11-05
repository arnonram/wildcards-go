import type { DatabaseSync } from 'node:sqlite';
import { type Db, MongoClient } from 'mongodb';
import type { Env } from './env';
import { createMongoStore, ensureMongoIndexes } from './store/mongo';
import { createSqliteStore, openSqlite } from './store/sqlite';
import type { CharacterStore } from './store/types';

export type Storage =
  | { kind: 'mongo'; uri: string; dbName: string }
  | { kind: 'sqlite'; path: string };

export type Backend =
  | { kind: 'mongo'; client: MongoClient; db: Db; store: CharacterStore }
  | { kind: 'sqlite'; db: DatabaseSync; path: string; store: CharacterStore };

/**
 * MongoDB when `MONGODB_URI` is set (the hosted site), SQLite when
 * `DATABASE_PATH` is (self-hosted). Mongo wins when both are set.
 */
export function storageFromEnv(env: Env): Storage {
  if (env.MONGODB_URI) {
    if (!env.MONGODB_DB) throw new Error('MONGODB_DB environmental variable missing');
    return { kind: 'mongo', uri: env.MONGODB_URI, dbName: env.MONGODB_DB };
  }
  if (env.DATABASE_PATH) return { kind: 'sqlite', path: env.DATABASE_PATH };
  // No silent default: a hosted server that lost MONGODB_URI must stop, not
  // start on an empty SQLite file.
  throw new Error(
    'No storage configured. Set MONGODB_URI (with MONGODB_DB) or DATABASE_PATH (a SQLite file)',
  );
}

export async function openBackend(storage: Storage): Promise<Backend> {
  if (storage.kind === 'sqlite') {
    const db = openSqlite(storage.path);
    return { kind: 'sqlite', db, path: storage.path, store: createSqliteStore(db) };
  }

  // Fail fast so API requests (and the offline sync queue) do not hang when
  // MongoDB is temporarily unavailable.
  const client = new MongoClient(storage.uri, { serverSelectionTimeoutMS: 5_000 });
  try {
    await client.connect();
    const db = client.db(storage.dbName);
    await ensureMongoIndexes(db);
    return { kind: 'mongo', client, db, store: createMongoStore(db) };
  } catch (error) {
    await client.close();
    throw error;
  }
}

// Kept on globalThis so `next dev` hot reloads reuse the connection instead
// of leaking a new client each time.
const cache = globalThis as typeof globalThis & { __wcgBackend?: Promise<Backend> };

async function connect(): Promise<Backend> {
  const storage = storageFromEnv(process.env);
  const backend = await openBackend(storage);
  console.info(
    `[wcg] storage: ${storage.kind} (${storage.kind === 'mongo' ? storage.dbName : storage.path})`,
  );
  return backend;
}

/**
 * One shared backend. Concurrent first callers await the same promise; a
 * failed attempt is dropped so the next request tries again.
 */
export function getBackend(): Promise<Backend> {
  cache.__wcgBackend ??= connect().catch((error) => {
    cache.__wcgBackend = undefined;
    throw error;
  });
  return cache.__wcgBackend;
}
