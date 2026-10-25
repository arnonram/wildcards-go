import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { type Db, MongoClient } from 'mongodb';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { getPortrait, listChangedSince, putCharacter, putPortrait } from './character-store';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
let db: Db;

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
    const result = await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
    expect(result).toEqual({ ok: { version: 1, modifiedAt: 1000 } });
  });

  test('create on existing id conflicts', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
    const result = await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 2000);
    expect(result).toEqual({
      conflict: { id, version: 1, modifiedAt: 1000, deleted: false, data },
    });
  });

  test('update with matching baseVersion increments', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
    const renamed = { ...data, name: 'Bea' };
    const result = await putCharacter(
      db,
      id,
      { baseVersion: 1, deleted: false, data: renamed },
      2000,
    );
    expect(result).toEqual({ ok: { version: 2, modifiedAt: 2000 } });
    const { characters } = await listChangedSince(db, 0);
    expect(characters[0].data).toEqual(renamed);
  });

  test('stale baseVersion conflicts with server copy', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
    await putCharacter(db, id, { baseVersion: 1, deleted: false, data }, 2000);
    const result = await putCharacter(db, id, { baseVersion: 1, deleted: false, data }, 3000);
    expect('conflict' in result && result.conflict?.version).toBe(2);
  });

  test('update of missing id conflicts with null', async () => {
    const { id, data } = character('Ana');
    const result = await putCharacter(db, id, { baseVersion: 3, deleted: false, data }, 1000);
    expect(result).toEqual({ conflict: null });
  });

  test('delete is a versioned write', async () => {
    const { id, data } = character('Ana');
    await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
    const result = await putCharacter(db, id, { baseVersion: 1, deleted: true, data }, 2000);
    expect(result).toEqual({ ok: { version: 2, modifiedAt: 2000 } });
    const { characters } = await listChangedSince(db, 0);
    expect(characters).toHaveLength(1);
    expect(characters[0].deleted).toBe(true);
  });
});

describe('listChangedSince', () => {
  test('listChangedSince includes rows equal to the cursor', async () => {
    const a = character('A');
    const b = character('B');
    await putCharacter(db, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
    await putCharacter(db, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1000);
    const result = await listChangedSince(db, 1000);
    expect(result.characters.map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
    expect(result.cursor).toBe(1000);
  });

  test('listChangedSince excludes older rows', async () => {
    const a = character('A');
    const b = character('B');
    await putCharacter(db, a.id, { baseVersion: 0, deleted: false, data: a.data }, 900);
    await putCharacter(db, b.id, { baseVersion: 0, deleted: false, data: b.data }, 1100);
    const result = await listChangedSince(db, 1000);
    expect(result.characters.map((c) => c.id)).toEqual([b.id]);
    expect(result.cursor).toBe(1100);
  });

  test('cursor stays at since when nothing changed', async () => {
    expect(await listChangedSince(db, 1234)).toEqual({ characters: [], cursor: 1234 });
  });
});

describe('portraits', () => {
  test('putPortrait then getPortrait returns same bytes and rev', async () => {
    const id = crypto.randomUUID();
    await putPortrait(db, id, 'rev-1', 'image/webp', new Uint8Array([1, 2, 3]));
    expect(await getPortrait(db, id)).toEqual({
      rev: 'rev-1',
      contentType: 'image/webp',
      bytes: new Uint8Array([1, 2, 3]),
    });
  });

  test('putPortrait overwrites previous rev', async () => {
    const id = crypto.randomUUID();
    await putPortrait(db, id, 'rev-1', 'image/webp', new Uint8Array([1]));
    await putPortrait(db, id, 'rev-2', 'image/png', new Uint8Array([9, 9]));
    expect(await getPortrait(db, id)).toEqual({
      rev: 'rev-2',
      contentType: 'image/png',
      bytes: new Uint8Array([9, 9]),
    });
  });

  test('getPortrait of unknown id is null', async () => {
    expect(await getPortrait(db, crypto.randomUUID())).toBeNull();
  });
});
