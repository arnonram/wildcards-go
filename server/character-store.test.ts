import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { type Db, MongoClient } from 'mongodb';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import {
  CURSOR_LAG_MS,
  ensureIndexes,
  getPortrait,
  isPortraitType,
  listChangedSince,
  putCharacter,
  putPortrait,
} from './character-store';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
let db: Db;

const A = 'user-a';
const B = 'user-b';

/** A `now` far enough ahead that the cursor lag never applies. */
const FAR_FUTURE = 1e12;

beforeEach(async () => {
  db = client.db('wcg_test');
  await db.dropDatabase();
});

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

describe('putCharacter', () => {
  test('create with baseVersion 0 stores version 1', async () => {
    const { id, data } = character('Ana');
    const result = await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 1000);
    expect(result).toEqual({ ok: { version: 1, modifiedAt: 1000 } });
  });

  test('create on existing id conflicts', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 1000);
    const result = await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 2000);
    expect(result).toEqual({
      conflict: { id, version: 1, modifiedAt: 1000, deleted: false, data },
    });
  });

  test('update with matching baseVersion increments', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 1000);
    const renamed = { ...data, name: 'Bea' };
    const result = await putCharacter(
      db,
      A,
      id,
      { baseVersion: 1, deleted: false, data: renamed },
      2000,
    );
    expect(result).toEqual({ ok: { version: 2, modifiedAt: 2000 } });
    const { characters } = await listChangedSince(db, A, 0, FAR_FUTURE);
    expect(characters[0].data).toEqual(renamed);
  });

  test('stale baseVersion conflicts with server copy', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 1000);
    await putCharacter(db, A, id, { baseVersion: 1, deleted: false, data }, 2000);
    const result = await putCharacter(db, A, id, { baseVersion: 1, deleted: false, data }, 3000);
    expect('conflict' in result && result.conflict?.version).toBe(2);
  });

  test('update of missing id conflicts with null', async () => {
    const { id, data } = character('Ana');
    const result = await putCharacter(db, A, id, { baseVersion: 3, deleted: false, data }, 1000);
    expect(result).toEqual({ conflict: null });
  });

  test('delete is a versioned write', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 1000);
    const result = await putCharacter(db, A, id, { baseVersion: 1, deleted: true, data }, 2000);
    expect(result).toEqual({ ok: { version: 2, modifiedAt: 2000 } });
    const { characters } = await listChangedSince(db, A, 0, FAR_FUTURE);
    expect(characters).toHaveLength(1);
    expect(characters[0].deleted).toBe(true);
    expect(characters[0].data).toBeUndefined();
  });

  test('edit on a tombstone restores data', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 1000);
    await putCharacter(db, A, id, { baseVersion: 1, deleted: true, data }, 2000);
    const result = await putCharacter(db, A, id, { baseVersion: 2, deleted: false, data }, 3000);
    expect(result).toEqual({ ok: { version: 3, modifiedAt: 3000 } });
    const { characters } = await listChangedSince(db, A, 0, FAR_FUTURE);
    expect(characters[0]).toEqual({ id, version: 3, modifiedAt: 3000, deleted: false, data });
  });
});

describe('listChangedSince', () => {
  test('listChangedSince includes rows equal to the cursor', async () => {
    const a = character('A');
    const b = character('B');
    await putCharacter(db, A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
    await putCharacter(db, A, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1000);
    const result = await listChangedSince(db, A, 1000, FAR_FUTURE);
    expect(result.characters.map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
    expect(result.cursor).toBe(1000);
  });

  test('listChangedSince excludes older rows', async () => {
    const a = character('A');
    const b = character('B');
    await putCharacter(db, A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 900);
    await putCharacter(db, A, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1100);
    const result = await listChangedSince(db, A, 1000, FAR_FUTURE);
    expect(result.characters.map((c) => c.id)).toEqual([b.id]);
    expect(result.cursor).toBe(1100);
  });

  test('cursor stays at since when nothing changed', async () => {
    expect(await listChangedSince(db, A, 1234, FAR_FUTURE)).toEqual({
      characters: [],
      cursor: 1234,
    });
  });

  test('cursor lags behind now so late commits are re-pulled', async () => {
    const a = character('A');
    const b = character('B');
    await putCharacter(db, A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
    await putCharacter(db, A, b.id, { baseVersion: 0, deleted: false, data: b.data }, 50_000);
    const result = await listChangedSince(db, A, 0, 60_000);
    expect(result.characters).toHaveLength(2);
    expect(result.cursor).toBe(60_000 - CURSOR_LAG_MS);
  });

  test('cursor never moves backwards', async () => {
    expect(await listChangedSince(db, A, 40_000, 50_000)).toEqual({
      characters: [],
      cursor: 40_000,
    });
  });
});

describe('portraits', () => {
  /** A live character, which putPortrait requires. */
  async function live(owner = A) {
    const { id, data } = character('Ana');
    await putCharacter(db, owner, id, { baseVersion: 0, deleted: false, data }, 1000);
    return { id, data };
  }

  test('putPortrait then getPortrait returns same bytes and rev', async () => {
    const { id } = await live();
    await putPortrait(db, A, id, 'rev-1', 'image/webp', new Uint8Array([1, 2, 3]));
    expect(await getPortrait(db, A, id)).toEqual({
      rev: 'rev-1',
      contentType: 'image/webp',
      bytes: new Uint8Array([1, 2, 3]),
    });
  });

  test('putPortrait overwrites previous rev', async () => {
    const { id } = await live();
    await putPortrait(db, A, id, 'rev-1', 'image/webp', new Uint8Array([1]));
    await putPortrait(db, A, id, 'rev-2', 'image/png', new Uint8Array([9, 9]));
    expect(await getPortrait(db, A, id)).toEqual({
      rev: 'rev-2',
      contentType: 'image/png',
      bytes: new Uint8Array([9, 9]),
    });
  });

  test('getPortrait of unknown id is null', async () => {
    expect(await getPortrait(db, A, crypto.randomUUID())).toBeNull();
  });

  test('deleting a character deletes its portrait', async () => {
    const { id, data } = await live();
    await putPortrait(db, A, id, 'r1', 'image/webp', new Uint8Array([1]));
    await putCharacter(db, A, id, { baseVersion: 1, deleted: true, data }, 2000);
    expect(await getPortrait(db, A, id)).toBeNull();
  });

  test('putPortrait refuses a deleted character', async () => {
    const { id, data } = await live();
    await putCharacter(db, A, id, { baseVersion: 1, deleted: true, data }, 2000);
    expect(await putPortrait(db, A, id, 'r1', 'image/webp', new Uint8Array([1]))).toBe(false);
    expect(await getPortrait(db, A, id)).toBeNull();
  });

  test('putPortrait refuses an unknown character', async () => {
    const id = crypto.randomUUID();
    expect(await putPortrait(db, A, id, 'r1', 'image/webp', new Uint8Array([1]))).toBe(false);
  });
});

test('ensureIndexes indexes owner and modifiedAt', async () => {
  await ensureIndexes(db);
  const names = (await db.collection('characters').indexes()).map((index) => index.name);
  expect(names).toContain('ownerId_1_modifiedAt_1');
});

describe('ownership', () => {
  test("pull returns only the owner's characters", async () => {
    const a = character('A');
    const b = character('B');
    await putCharacter(db, A, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
    await putCharacter(db, B, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1000);
    const { characters } = await listChangedSince(db, A, 0, FAR_FUTURE);
    expect(characters.map((c) => c.id)).toEqual([a.id]);
  });

  test("create on another owner's id is notFound, never their data", async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, B, id, { baseVersion: 0, deleted: false, data }, 1000);
    expect(await putCharacter(db, A, id, { baseVersion: 0, deleted: false, data }, 2000)).toEqual({
      notFound: true,
    });
  });

  test("update or delete of another owner's character is notFound", async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, B, id, { baseVersion: 0, deleted: false, data }, 1000);
    expect(await putCharacter(db, A, id, { baseVersion: 1, deleted: false, data }, 2000)).toEqual({
      notFound: true,
    });
    expect(await putCharacter(db, A, id, { baseVersion: 1, deleted: true, data }, 2000)).toEqual({
      notFound: true,
    });
  });

  test('portraits of another owner are invisible and unwritable', async () => {
    const id = crypto.randomUUID();
    const { data } = character('Bea', id);
    await putCharacter(db, B, id, { baseVersion: 0, deleted: false, data }, 1000);
    await putPortrait(db, B, id, 'r1', 'image/webp', new Uint8Array([1]));
    expect(await getPortrait(db, A, id)).toBeNull();
    expect(await putPortrait(db, A, id, 'r2', 'image/webp', new Uint8Array([2]))).toBe(false);
    expect((await getPortrait(db, B, id))?.rev).toBe('r1');
  });

  test('isPortraitType allows only jpeg, png and webp', () => {
    expect(isPortraitType('image/webp')).toBe(true);
    expect(isPortraitType('image/jpeg; charset=binary')).toBe(true);
    expect(isPortraitType('image/png')).toBe(true);
    expect(isPortraitType('image/svg+xml')).toBe(false);
    expect(isPortraitType('text/html')).toBe(false);
  });
});
