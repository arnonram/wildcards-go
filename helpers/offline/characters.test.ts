import { beforeEach, expect, test } from 'bun:test';
import type { ServerCharacter } from '../../dtos/sync';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import {
  createCharacter,
  deleteCharacter,
  resolveConflict,
  saveCharacter,
  setPortrait,
} from './characters';
import { openTestDb, type WcgDb } from './db';

let name: string;
let db: WcgDb;

beforeEach(() => {
  name = crypto.randomUUID();
  db = openTestDb(name);
});

async function row(id: string) {
  const found = await db.characters.get(id);
  if (!found) throw new Error(`no row ${id}`);
  return found;
}

function serverCopy(id: string, version: number, characterName: string): ServerCharacter {
  return {
    id,
    version,
    modifiedAt: 5000,
    deleted: false,
    data: { _id: id, name: characterName } as WildCardCharacter,
  };
}

test('createCharacter makes a dirty version-0 row', async () => {
  const id = await createCharacter(db);
  const created = await row(id);
  expect(created.version).toBe(0);
  expect(created.dirty).toBe(1);
  expect(created.deleted).toBe(0);
  expect(created.data._id).toBe(id);
  expect(created.data.attributes).toHaveLength(5);
});

test('saveCharacter persists without waiting for sync', async () => {
  const id = await createCharacter(db);
  const data = { ...(await row(id)).data, name: 'Saved' };
  const stamp = await saveCharacter(data, db);
  const reopened = await openTestDb(name).characters.get(id);
  expect(reopened?.data.name).toBe('Saved');
  expect(reopened?.localUpdatedAt).toBe(stamp);
});

test('saveCharacter clears syncError', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { syncError: 'nope', dirty: 0 });
  await saveCharacter((await row(id)).data, db);
  const saved = await row(id);
  expect(saved.syncError).toBeUndefined();
  expect(saved.dirty).toBe(1);
});

test('deleteCharacter keeps a dirty tombstone', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { dirty: 0, version: 2 });
  await deleteCharacter(id, db);
  const deleted = await row(id);
  expect(deleted.deleted).toBe(1);
  expect(deleted.dirty).toBe(1);
});

test('setPortrait sets matching rev on character and portrait', async () => {
  const id = await createCharacter(db);
  const rev = await setPortrait(id, new Blob([new Uint8Array([1, 2])], { type: 'image/webp' }), db);
  const character = await row(id);
  expect(character.data.portraitRev).toBe(rev);
  const portrait = await db.portraits.get(id);
  expect(character.data.portraitRev).toBeString();
  expect(portrait?.rev).toBe(character.data.portraitRev as string);
  expect(portrait?.dirty).toBe(1);
  expect(character.dirty).toBe(1);
});

test('resolveConflict mine adopts server version and stays dirty', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { conflict: serverCopy(id, 4, 'Theirs') });
  await resolveConflict(id, 'mine', db);
  const resolved = await row(id);
  expect(resolved.version).toBe(4);
  expect(resolved.dirty).toBe(1);
  expect(resolved.conflict).toBeUndefined();
  expect(resolved.data.name).not.toBe('Theirs');
});

test('resolveConflict theirs replaces data and clears dirty', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { conflict: serverCopy(id, 4, 'Theirs') });
  await resolveConflict(id, 'theirs', db);
  const resolved = await row(id);
  expect(resolved.version).toBe(4);
  expect(resolved.dirty).toBe(0);
  expect(resolved.conflict).toBeUndefined();
  expect(resolved.data.name).toBe('Theirs');
});

test('resolveConflict theirs with null conflict removes row', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { conflict: null });
  await resolveConflict(id, 'theirs', db);
  expect(await db.characters.get(id)).toBeUndefined();
});

test('every write notifies the local change listener', async () => {
  const { setOnLocalChange } = await import('./characters');
  let calls = 0;
  setOnLocalChange(() => {
    calls++;
  });
  const id = await createCharacter(db);
  await saveCharacter((await row(id)).data, db);
  await deleteCharacter(id, db);
  setOnLocalChange(null);
  expect(calls).toBe(3);
});

test('writes in the same millisecond get increasing stamps', async () => {
  const realNow = Date.now;
  Date.now = () => 1_000;
  try {
    const id = await createCharacter(db);
    const first = (await row(id)).localUpdatedAt;
    const second = await saveCharacter((await row(id)).data, db);
    const third = await saveCharacter((await row(id)).data, db);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  } finally {
    Date.now = realNow;
  }
});
