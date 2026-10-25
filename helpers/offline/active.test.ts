import { beforeEach, expect, test } from 'bun:test';
import {
  acceptAdoption,
  activateStore,
  dismissAdoption,
  getActiveDb,
  getAdoption,
  getSyncStatus,
  listCharacters,
} from './active';
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

async function settle() {
  for (let i = 0; i < 20; i += 1) await Bun.sleep(1);
}

test('opening an account with signed-out characters asks once per app start', async () => {
  const user = `u-${crypto.randomUUID()}`;
  await createCharacter();
  activateStore(user);
  await settle();
  expect(getAdoption()).toEqual({ count: 1 });
  dismissAdoption();
  expect(getAdoption()).toBeNull();
  activateStore(null);
  activateStore(user);
  await settle();
  expect(getAdoption()).toBeNull();
});

test('Not now moves nothing', async () => {
  const user = `u-${crypto.randomUUID()}`;
  const id = await createCharacter();
  activateStore(user);
  await settle();
  dismissAdoption();
  expect(await new WcgDb('wcg').characters.get(id)).toBeDefined();
  expect(await getActiveDb().characters.get(id)).toBeUndefined();
});

test('Add moves signed-out characters into the account store', async () => {
  const user = `u-${crypto.randomUUID()}`;
  const id = await createCharacter();
  activateStore(user);
  await settle();
  await acceptAdoption();
  expect(getAdoption()).toBeNull();
  expect((await getActiveDb().characters.get(id))?.version).toBe(0);
  expect(await new WcgDb('wcg').characters.count()).toBe(0);
});

test('no prompt when there are no signed-out characters', async () => {
  activateStore(`u-${crypto.randomUUID()}`);
  await settle();
  expect(getAdoption()).toBeNull();
});
