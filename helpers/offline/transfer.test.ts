import { beforeEach, expect, test } from 'bun:test';
import { createCharacter, deleteCharacter, saveCharacter, setPortrait } from './characters';
import { openTestDb, type WcgDb } from './db';
import { exportCharacters, importCharacters } from './transfer';

let db: WcgDb;
let other: WcgDb;

beforeEach(() => {
  db = openTestDb(crypto.randomUUID());
  other = openTestDb(crypto.randomUUID());
});

function found<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('not found');
  return value;
}

async function named(database: WcgDb, name: string) {
  const id = await createCharacter(database);
  const row = found(await database.characters.get(id));
  await saveCharacter({ ...row.data, name }, database);
  return id;
}

test('export then import copies characters and portraits under new ids', async () => {
  const id = await named(db, 'Red');
  await setPortrait(id, new Blob([new Uint8Array([1, 2, 250])], { type: 'image/webp' }), db);
  await named(db, 'Blue');

  const file = await exportCharacters(undefined, db);
  expect(await importCharacters(await file.text(), other)).toBe(2);

  const rows = await other.characters.toArray();
  expect(rows.map((row) => row.data.name).sort()).toEqual(['Blue', 'Red']);
  for (const row of rows) {
    expect(row.id).not.toBe(id);
    expect(row.data._id).toBe(row.id);
    expect(row.version).toBe(0);
    expect(row.dirty).toBe(1);
  }
  const red = found(rows.find((row) => row.data.name === 'Red'));
  const portrait = found(await other.portraits.get(red.id));
  expect(red.data.portraitRev).toBeString();
  expect(portrait.rev).toBe(String(red.data.portraitRev));
  expect(portrait.dirty).toBe(1);
  expect(portrait.blob.type).toBe('image/webp');
  expect([...new Uint8Array(await portrait.blob.arrayBuffer())]).toEqual([1, 2, 250]);
  const blue = found(rows.find((row) => row.data.name === 'Blue'));
  expect(blue.data.portraitRev).toBeUndefined();
});

test('importing into the same store never overwrites the original', async () => {
  const id = await named(db, 'Red');
  await importCharacters(await (await exportCharacters([id], db)).text(), db);
  expect(await db.characters.count()).toBe(2);
  expect((await db.characters.get(id))?.data.name).toBe('Red');
});

test('export can pick characters and skips deleted ones', async () => {
  const keep = await named(db, 'Keep');
  const gone = await named(db, 'Gone');
  await named(db, 'Other');
  await deleteCharacter(gone, db);

  const all = JSON.parse(await (await exportCharacters(undefined, db)).text());
  expect(all.characters.map((c: { data: { name: string } }) => c.data.name).sort()).toEqual([
    'Keep',
    'Other',
  ]);
  const one = JSON.parse(await (await exportCharacters([keep], db)).text());
  expect(one.characters).toHaveLength(1);
});

test('import rejects files that are not a Wild Cards Go export', async () => {
  await expect(importCharacters('not json', db)).rejects.toThrow('not a Wild Cards Go export');
  await expect(importCharacters('{"characters":[]}', db)).rejects.toThrow(
    'not a Wild Cards Go export',
  );
});

test('import rejects the whole file if any character is malformed', async () => {
  const file = JSON.parse(await (await exportCharacters([await named(db, 'Ok')], db)).text());
  file.characters.push({ data: { name: 'Broken' } });
  await expect(importCharacters(JSON.stringify(file), other)).rejects.toThrow('damaged');
  expect(await other.characters.count()).toBe(0);
});

test('import rejects a portrait that is not an image', async () => {
  const file = JSON.parse(await (await exportCharacters([await named(db, 'Ok')], db)).text());
  file.characters[0].portrait = 'data:text/html;base64,PGI+';
  await expect(importCharacters(JSON.stringify(file), other)).rejects.toThrow('damaged');
});
