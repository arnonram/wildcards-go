import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { type Db, MongoClient } from 'mongodb';
import { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { createMongoStore, ensureMongoIndexes } from './mongo';
import { createSqliteStore, openSqlite } from './sqlite';
import { type CharacterStore, CURSOR_LAG_MS, isPortraitType } from './types';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
let db: Db;

const A = 'user-a';
const B = 'user-b';

/** A `now` far enough ahead that the cursor lag never applies. */
const FAR_FUTURE = 1e12;

afterAll(async () => {
  await client.close();
});

function character(name: string, id = crypto.randomUUID()) {
  // Shaped like a request body: JSON has no undefined fields.
  const data: WildCardCharacter = JSON.parse(
    JSON.stringify({ ...new WildCardCharacter(name), _id: id }),
  );
  return { id, data };
}

/** One backend under test: a fresh, empty store per test, and raw row counts. */
type Harness = {
  name: string;
  fresh(): Promise<CharacterStore>;
  count(table: 'portraits' | 'deletedUsers'): Promise<number>;
};

const mongoHarness: Harness = {
  name: 'mongo',
  async fresh() {
    db = client.db('wcg_test');
    await db.dropDatabase();
    await ensureMongoIndexes(db);
    return createMongoStore(db);
  },
  count: (table) => db.collection(table).countDocuments(),
};

let sqlite: DatabaseSync | undefined;

const sqliteHarness: Harness = {
  name: 'sqlite',
  async fresh() {
    sqlite?.close();
    sqlite = openSqlite(':memory:');
    return createSqliteStore(sqlite);
  },
  async count(table) {
    const name = table === 'portraits' ? 'portraits' : 'deleted_users';
    const row = sqlite?.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number };
    return row.n;
  },
};

const harnesses: Harness[] = [mongoHarness, sqliteHarness];

for (const h of harnesses) {
  describe(h.name, () => {
    let store: CharacterStore;

    beforeEach(async () => {
      store = await h.fresh();
    });

    describe('putCharacter', () => {
      test('create with baseVersion 0 stores version 1', async () => {
        const { id, data } = character('Ana');
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 0, deleted: false, data },
          1000,
        );
        expect(result).toEqual({ ok: { version: 1, modifiedAt: 1000 } });
      });

      test('create on existing id conflicts', async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 0, deleted: false, data },
          2000,
        );
        expect(result).toEqual({
          conflict: { id, version: 1, modifiedAt: 1000, deleted: false, data },
        });
      });

      test('update with matching baseVersion increments', async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
        const renamed = { ...data, name: 'Bea' };
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 1, deleted: false, data: renamed },
          2000,
        );
        expect(result).toEqual({ ok: { version: 2, modifiedAt: 2000 } });
        const { characters } = await store.listChangedSince(A, 0, FAR_FUTURE);
        expect(characters[0].data).toEqual(renamed);
      });

      test('stale baseVersion conflicts with server copy', async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
        await store.putCharacter(A, id, { baseVersion: 1, deleted: false, data }, 2000);
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 1, deleted: false, data },
          3000,
        );
        expect('conflict' in result && result.conflict?.version).toBe(2);
      });

      test('update of missing id conflicts with null', async () => {
        const { id, data } = character('Ana');
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 3, deleted: false, data },
          1000,
        );
        expect(result).toEqual({ conflict: null });
      });

      test('delete is a versioned write', async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 1, deleted: true, data },
          2000,
        );
        expect(result).toEqual({ ok: { version: 2, modifiedAt: 2000 } });
        const { characters } = await store.listChangedSince(A, 0, FAR_FUTURE);
        expect(characters).toHaveLength(1);
        expect(characters[0].deleted).toBe(true);
        expect(characters[0].data).toBeUndefined();
      });

      test('edit on a tombstone restores data', async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
        await store.putCharacter(A, id, { baseVersion: 1, deleted: true, data }, 2000);
        const result = await store.putCharacter(
          A,
          id,
          { baseVersion: 2, deleted: false, data },
          3000,
        );
        expect(result).toEqual({ ok: { version: 3, modifiedAt: 3000 } });
        const { characters } = await store.listChangedSince(A, 0, FAR_FUTURE);
        expect(characters[0]).toEqual({ id, version: 3, modifiedAt: 3000, deleted: false, data });
      });
    });

    describe('listChangedSince', () => {
      test('listChangedSince includes rows equal to the cursor', async () => {
        const a = character('A');
        const b = character('B');
        await store.putCharacter(A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
        await store.putCharacter(A, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1000);
        const result = await store.listChangedSince(A, 1000, FAR_FUTURE);
        expect(result.characters.map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
        expect(result.cursor).toBe(1000);
      });

      test('listChangedSince excludes older rows', async () => {
        const a = character('A');
        const b = character('B');
        await store.putCharacter(A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 900);
        await store.putCharacter(A, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1100);
        const result = await store.listChangedSince(A, 1000, FAR_FUTURE);
        expect(result.characters.map((c) => c.id)).toEqual([b.id]);
        expect(result.cursor).toBe(1100);
      });

      test('cursor stays at since when nothing changed', async () => {
        expect(await store.listChangedSince(A, 1234, FAR_FUTURE)).toEqual({
          characters: [],
          cursor: 1234,
        });
      });

      test('cursor lags behind now so late commits are re-pulled', async () => {
        const a = character('A');
        const b = character('B');
        await store.putCharacter(A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
        await store.putCharacter(A, b.id, { baseVersion: 0, deleted: false, data: b.data }, 50_000);
        const result = await store.listChangedSince(A, 0, 60_000);
        expect(result.characters).toHaveLength(2);
        expect(result.cursor).toBe(60_000 - CURSOR_LAG_MS);
      });

      test('cursor never moves backwards', async () => {
        expect(await store.listChangedSince(A, 40_000, 50_000)).toEqual({
          characters: [],
          cursor: 40_000,
        });
      });
    });

    describe('portraits', () => {
      /** A live character, which putPortrait requires. */
      async function live(owner = A) {
        const { id, data } = character('Ana');
        await store.putCharacter(owner, id, { baseVersion: 0, deleted: false, data }, 1000);
        return { id, data };
      }

      test('putPortrait then getPortrait returns same bytes and rev', async () => {
        const { id } = await live();
        await store.putPortrait(A, id, 'rev-1', 'image/webp', new Uint8Array([1, 2, 3]));
        expect(await store.getPortrait(A, id)).toEqual({
          rev: 'rev-1',
          contentType: 'image/webp',
          bytes: new Uint8Array([1, 2, 3]),
        });
      });

      test('putPortrait overwrites previous rev', async () => {
        const { id } = await live();
        await store.putPortrait(A, id, 'rev-1', 'image/webp', new Uint8Array([1]));
        await store.putPortrait(A, id, 'rev-2', 'image/png', new Uint8Array([9, 9]));
        expect(await store.getPortrait(A, id)).toEqual({
          rev: 'rev-2',
          contentType: 'image/png',
          bytes: new Uint8Array([9, 9]),
        });
      });

      test('getPortrait of unknown id is null', async () => {
        expect(await store.getPortrait(A, crypto.randomUUID())).toBeNull();
      });

      test('deleting a character deletes its portrait', async () => {
        const { id, data } = await live();
        await store.putPortrait(A, id, 'r1', 'image/webp', new Uint8Array([1]));
        await store.putCharacter(A, id, { baseVersion: 1, deleted: true, data }, 2000);
        expect(await store.getPortrait(A, id)).toBeNull();
        // getPortrait hides any deleted character's portrait; the row must be gone too.
        expect(await h.count('portraits')).toBe(0);
      });

      test('putPortrait refuses a deleted character', async () => {
        const { id, data } = await live();
        await store.putCharacter(A, id, { baseVersion: 1, deleted: true, data }, 2000);
        expect(await store.putPortrait(A, id, 'r1', 'image/webp', new Uint8Array([1]))).toBe(false);
        expect(await store.getPortrait(A, id)).toBeNull();
      });

      test('putPortrait refuses an unknown character', async () => {
        const id = crypto.randomUUID();
        expect(await store.putPortrait(A, id, 'r1', 'image/webp', new Uint8Array([1]))).toBe(false);
      });
    });

    describe('ownership', () => {
      test("pull returns only the owner's characters", async () => {
        const a = character('A');
        const b = character('B');
        await store.putCharacter(A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
        await store.putCharacter(B, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1000);
        const { characters } = await store.listChangedSince(A, 0, FAR_FUTURE);
        expect(characters.map((c) => c.id)).toEqual([a.id]);
      });

      test("create on another owner's id is notFound, never their data", async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(B, id, { baseVersion: 0, deleted: false, data }, 1000);
        expect(
          await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 2000),
        ).toEqual({
          notFound: true,
        });
      });

      test("update or delete of another owner's character is notFound", async () => {
        const { id, data } = character('Ana');
        await store.putCharacter(B, id, { baseVersion: 0, deleted: false, data }, 1000);
        expect(
          await store.putCharacter(A, id, { baseVersion: 1, deleted: false, data }, 2000),
        ).toEqual({
          notFound: true,
        });
        expect(
          await store.putCharacter(A, id, { baseVersion: 1, deleted: true, data }, 2000),
        ).toEqual({
          notFound: true,
        });
      });

      test('portraits of another owner are invisible and unwritable', async () => {
        const id = crypto.randomUUID();
        const { data } = character('Bea', id);
        await store.putCharacter(B, id, { baseVersion: 0, deleted: false, data }, 1000);
        await store.putPortrait(B, id, 'r1', 'image/webp', new Uint8Array([1]));
        expect(await store.getPortrait(A, id)).toBeNull();
        expect(await store.putPortrait(A, id, 'r2', 'image/webp', new Uint8Array([2]))).toBe(false);
        expect((await store.getPortrait(B, id))?.rev).toBe('r1');
      });
    });

    describe('account deletion', () => {
      test("deleteOwnerData removes the owner's characters and portraits only", async () => {
        const mine = character('Mine');
        const theirs = character('Theirs');
        await store.putCharacter(
          A,
          mine.id,
          { baseVersion: 0, deleted: false, data: mine.data },
          1000,
        );
        await store.putCharacter(
          B,
          theirs.id,
          { baseVersion: 0, deleted: false, data: theirs.data },
          1000,
        );
        await store.putPortrait(A, mine.id, 'r1', 'image/webp', new Uint8Array([1]));
        await store.putPortrait(B, theirs.id, 'r2', 'image/webp', new Uint8Array([2]));

        await store.deleteOwnerData(A);

        expect((await store.listChangedSince(A, 0, FAR_FUTURE)).characters).toEqual([]);
        expect(await h.count('portraits')).toBe(1);
        expect((await store.listChangedSince(B, 0, FAR_FUTURE)).characters).toHaveLength(1);
        expect((await store.getPortrait(B, theirs.id))?.rev).toBe('r2');
      });

      test('a deleted user is remembered by id only', async () => {
        expect(await store.isUserDeleted(A)).toBe(false);
        await store.markUserDeleted(A, 5000);
        expect(await store.isUserDeleted(A)).toBe(true);
        expect(await store.isUserDeleted(B)).toBe(false);
      });

      test('marking a user deleted twice is harmless', async () => {
        await store.markUserDeleted(A, 5000);
        await store.markUserDeleted(A, 6000);
        expect(await h.count('deletedUsers')).toBe(1);
      });
    });
  });
}

test('isPortraitType allows only jpeg, png and webp', () => {
  expect(isPortraitType('image/webp')).toBe(true);
  expect(isPortraitType('image/jpeg; charset=binary')).toBe(true);
  expect(isPortraitType('image/png')).toBe(true);
  expect(isPortraitType('image/svg+xml')).toBe(false);
  expect(isPortraitType('text/html')).toBe(false);
});

describe('mongo only', () => {
  let store: CharacterStore;

  beforeEach(async () => {
    store = await mongoHarness.fresh();
  });

  test('ensureMongoIndexes indexes owner and modifiedAt', async () => {
    const names = (await db.collection('characters').indexes()).map((index) => index.name);
    expect(names).toContain('ownerId_1_modifiedAt_1');
  });

  test('a deleted user is stored by id only', async () => {
    await store.markUserDeleted(A, 5000);
    const doc = await db.collection('deletedUsers').findOne({});
    expect(Object.keys(doc ?? {}).sort()).toEqual(['_id', 'deletedAt']);
  });

  test('reads documents in the pre-refactor shape', async () => {
    const characters = db.collection<{ _id: string; [key: string]: unknown }>('characters');
    await characters.insertOne({
      _id: 'c1',
      ownerId: A,
      version: 3,
      modifiedAt: 500,
      deleted: false,
      data: { name: 'Old' },
    });
    await characters.insertOne({
      _id: 'c2',
      ownerId: A,
      version: 2,
      modifiedAt: 600,
      deleted: true,
    });
    await db
      .collection<{ _id: string; deletedAt: Date }>('deletedUsers')
      .insertOne({ _id: 'gone', deletedAt: new Date(1) });
    const result = await store.listChangedSince(A, 0, FAR_FUTURE);
    expect(result.characters).toEqual([
      { id: 'c1', version: 3, modifiedAt: 500, deleted: false, data: { name: 'Old', _id: 'c1' } },
      { id: 'c2', version: 2, modifiedAt: 600, deleted: true },
    ] as never);
    expect(await store.isUserDeleted('gone')).toBe(true);
  });
});

describe('sqlite only', () => {
  let store: CharacterStore;

  beforeEach(async () => {
    store = await sqliteHarness.fresh();
  });

  test('2 MiB portrait round-trips byte-for-byte', async () => {
    const { id, data } = character('Ana');
    await store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
    const bytes = new Uint8Array(2 * 1024 * 1024);
    for (let i = 0; i < bytes.length; i += 65_536)
      crypto.getRandomValues(bytes.subarray(i, i + 65_536));
    await store.putPortrait(A, id, 'r1', 'image/webp', bytes);
    const portrait = await store.getPortrait(A, id);
    expect(portrait?.bytes).toBeInstanceOf(Uint8Array);
    expect(portrait?.bytes).toEqual(bytes);
  });

  test('a write waits out a held transaction and survives its rollback', async () => {
    const { id, data } = character('Ana');
    sqlite?.exec('BEGIN');
    const put = store.putCharacter(A, id, { baseVersion: 0, deleted: false, data }, 1000);
    await new Promise((resolve) => setTimeout(resolve, 5));
    sqlite?.exec('ROLLBACK');
    expect(await put).toEqual({ ok: { version: 1, modifiedAt: 1000 } });
    expect((await store.listChangedSince(A, 0, FAR_FUTURE)).characters.map((c) => c.id)).toEqual([
      id,
    ]);
  });

  test('a write gives up, naming the cause, when a transaction never ends', async () => {
    const { id, data } = character('Ana');
    sqlite?.exec('BEGIN');
    try {
      await expect(
        createSqliteStore(sqlite as DatabaseSync, { transactionWaitMs: 50 }).putCharacter(
          A,
          id,
          { baseVersion: 0, deleted: false, data },
          1000,
        ),
      ).rejects.toThrow('transaction');
    } finally {
      sqlite?.exec('ROLLBACK');
    }
  });

  test('openSqlite on a file creates the directory and reopens the same data', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wcg-store-'));
    try {
      const file = path.join(dir, 'x', 'y', 'wcg.db');
      const { id, data } = character('Ana');
      const first = openSqlite(file);
      await createSqliteStore(first).putCharacter(
        A,
        id,
        { baseVersion: 0, deleted: false, data },
        1000,
      );
      first.close();
      const second = openSqlite(file);
      const { characters } = await createSqliteStore(second).listChangedSince(A, 0, FAR_FUTURE);
      second.close();
      expect(characters.map((c) => c.id)).toEqual([id]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
