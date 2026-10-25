import { beforeEach, expect, test } from 'bun:test';
import {
  getRememberedAccount,
  onAccountStorage,
  rememberAccount,
  signOutOfDevice,
  startAccounts,
  toAccount,
} from './account';
import { activateStore, getActiveOwner } from './active';
import { createCharacter } from './characters';
import { WcgDb } from './db';
import { installBrowserGlobals, setOnline } from './test-env';

beforeEach(() => {
  installBrowserGlobals();
  activateStore(null);
});

const account = (userId: string) => ({ userId, name: userId.toUpperCase(), image: null });

test('remembered account falls back to email for display name', () => {
  expect(toAccount({ id: 'u1', name: '', email: 'a@b.c' }).name).toBe('a@b.c');
  expect(toAccount({ id: 'u1', name: 'Ana', email: 'a@b.c', image: 'x' })).toEqual({
    userId: 'u1',
    name: 'Ana',
    image: 'x',
  });
});

test('rememberAccount persists and activates the account store', () => {
  rememberAccount(account('u-a'));
  expect(getRememberedAccount()?.userId).toBe('u-a');
  expect(getActiveOwner()).toBe('u-a');
});

test('startup with a different session user switches to it', async () => {
  rememberAccount(account('u-a'));
  const stop = await startAccounts(async () => account('u-b'));
  expect(getActiveOwner()).toBe('u-b');
  expect(getRememberedAccount()?.userId).toBe('u-b');
  stop();
});

test('startup with a session and nothing remembered switches to it', async () => {
  const stop = await startAccounts(async () => account('u-b'));
  expect(getActiveOwner()).toBe('u-b');
  stop();
});

test('startup with no session keeps the remembered account', async () => {
  rememberAccount(account('u-a'));
  activateStore(null);
  const stop = await startAccounts(async () => null);
  expect(getActiveOwner()).toBe('u-a');
  stop();
});

test('startup offline opens the remembered account without a lookup', async () => {
  rememberAccount(account('u-a'));
  activateStore(null);
  setOnline(false);
  let looked = false;
  const stop = await startAccounts(async () => {
    looked = true;
    return null;
  });
  expect(looked).toBe(false);
  expect(getActiveOwner()).toBe('u-a');
  stop();
});

test('storage event switches the active store', () => {
  localStorage.setItem('wcg-account', JSON.stringify(account('u-c')));
  onAccountStorage({ key: 'wcg-account' });
  expect(getActiveOwner()).toBe('u-c');
  localStorage.removeItem('wcg-account');
  onAccountStorage({ key: 'wcg-account' });
  expect(getActiveOwner()).toBeNull();
});

test('sign-out offline changes nothing', async () => {
  rememberAccount(account('u-a'));
  setOnline(false);
  let called = false;
  const result = await signOutOfDevice(
    async () => true,
    async () => {
      called = true;
    },
  );
  expect(result).toBe('offline');
  expect(called).toBe(false);
  expect(getActiveOwner()).toBe('u-a');
});

test('sign-out with unsynced changes can be cancelled', async () => {
  const user = `u-${crypto.randomUUID()}`;
  rememberAccount(account(user));
  await createCharacter();
  let asked = 0;
  const result = await signOutOfDevice(
    async (count) => {
      asked = count;
      return false;
    },
    async () => {},
  );
  expect(asked).toBe(1);
  expect(result).toBe('cancelled');
  expect(getActiveOwner()).toBe(user);
});

test('sign-out keeps the account store and activates signed-out', async () => {
  const user = `u-${crypto.randomUUID()}`;
  rememberAccount(account(user));
  const id = await createCharacter();
  expect(
    await signOutOfDevice(
      async () => true,
      async () => {},
    ),
  ).toBe('done');
  expect(getActiveOwner()).toBeNull();
  expect(getRememberedAccount()).toBeNull();
  expect(await new WcgDb(`wcg-u-${user}`).characters.get(id)).toBeDefined();
});
