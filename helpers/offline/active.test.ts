import { beforeEach, expect, test } from 'bun:test';
import { activateStore, getActiveDb, getSyncStatus, listCharacters } from './active';
import { createCharacter } from './characters';
import { WcgDb } from './db';

beforeEach(async () => {
  activateStore(null);
  await new WcgDb('wcg').characters.clear();
});

test("switching accounts never lists the previous account's characters", async () => {
  const a = `u-${crypto.randomUUID()}`;
  const b = `u-${crypto.randomUUID()}`;
  activateStore(a);
  await createCharacter();
  activateStore(b);
  expect(await listCharacters(getActiveDb())).toEqual([]);
  activateStore(a);
  expect(await listCharacters(getActiveDb())).toHaveLength(1);
});

test('signed out uses the wcg store, has no engine and reports signedOut', () => {
  activateStore(null);
  expect(getActiveDb().name).toBe('wcg');
  expect(getSyncStatus().signedOut).toBe(true);
});

test('an account store is named after its user', () => {
  activateStore('abc');
  expect(getActiveDb().name).toBe('wcg-u-abc');
});
