import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MongoClient } from 'mongodb';
import { getBackend, storageFromEnv } from './backend';
import { openSqlite } from './store/sqlite';

test('MONGODB_URI selects mongo', () => {
  expect(storageFromEnv({ MONGODB_URI: 'mongodb://x', MONGODB_DB: 'd' })).toEqual({
    kind: 'mongo',
    uri: 'mongodb://x',
    dbName: 'd',
  });
});

test('no storage setting at all is refused, naming both options', () => {
  expect(() => storageFromEnv({})).toThrow('Set MONGODB_URI (with MONGODB_DB) or DATABASE_PATH');
});

test('DATABASE_PATH selects sqlite', () => {
  expect(storageFromEnv({ DATABASE_PATH: '/data/wcg.db' })).toEqual({
    kind: 'sqlite',
    path: '/data/wcg.db',
  });
});

test('mongo wins when both are set', () => {
  expect(
    storageFromEnv({ MONGODB_URI: 'mongodb://x', MONGODB_DB: 'd', DATABASE_PATH: '/data/wcg.db' })
      .kind,
  ).toBe('mongo');
});

test('mongo without a database name is refused', () => {
  expect(() => storageFromEnv({ MONGODB_URI: 'mongodb://x' })).toThrow('MONGODB_DB');
});

test('unopenable database file fails with the path in the message', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wcg-backend-'));
  try {
    // A directory where the file should be: SQLite's own error names no path.
    expect(() => openSqlite(dir)).toThrow(`Cannot open SQLite database at ${dir}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// These run in order: they share the backend cached on globalThis.
const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
let client: MongoClient | undefined;

afterAll(async () => {
  await client?.db('wcg_test_backend').dropDatabase();
  await client?.close();
});

test('failed connect is not cached', async () => {
  process.env.MONGODB_URI = uri;
  delete process.env.MONGODB_DB;
  await expect(getBackend()).rejects.toThrow('MONGODB_DB');
  process.env.MONGODB_DB = 'wcg_test_backend';
  const backend = await getBackend();
  if (backend.kind !== 'mongo') throw new Error('expected mongo');
  client = backend.client;
  expect(backend.db.databaseName).toBe('wcg_test_backend');
});

test('concurrent callers share one backend', async () => {
  const [a, b] = await Promise.all([getBackend(), getBackend()]);
  expect(a).toBe(b);
});
