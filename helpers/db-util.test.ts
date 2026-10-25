import { afterAll, expect, test } from 'bun:test';
import type { MongoClient } from 'mongodb';
import { connectToDb } from './db-util';

// These tests run in order: they share the connection cached on globalThis.
const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
let client: MongoClient | undefined;

afterAll(async () => {
  await client?.db('wcg_test_dbutil').dropDatabase();
  await client?.close();
});

test('failed connect is not cached', async () => {
  delete process.env.MONGODB_URI;
  await expect(connectToDb()).rejects.toThrow('MONGODB_URI');
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = 'wcg_test_dbutil';
  const connection = await connectToDb();
  client = connection.client;
  expect(connection.db.databaseName).toBe('wcg_test_dbutil');
});

test('concurrent callers share one client', async () => {
  const [a, b] = await Promise.all([connectToDb(), connectToDb()]);
  expect(a.client).toBe(b.client);
});
