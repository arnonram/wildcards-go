import { beforeEach, expect, test } from 'bun:test';
import Dexie from 'dexie';
import {
  confirmAccountDeletion,
  dismissDeletedNotice,
  forgetDeletedAccount,
  getDeletedNotice,
  getRememberedAccount,
  onAccountStorage,
  rememberAccount,
  requestAccountDeletion,
  restoreRememberedAccount,
  signOutOfDevice,
  startAccounts,
  sweepDeletedStores,
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

test('restoreRememberedAccount opens the remembered store without a session check', () => {
  localStorage.setItem('wcg-account', JSON.stringify(account('u-r')));
  restoreRememberedAccount();
  expect(getActiveOwner()).toBe('u-r');
});

test('sign-out the server refuses keeps the account', async () => {
  rememberAccount(account('u-a'));
  await expect(
    signOutOfDevice(
      async () => true,
      async () => ({ data: null, error: { status: 500, message: 'Database unavailable' } }),
    ),
  ).rejects.toThrow('Database unavailable');
  expect(getActiveOwner()).toBe('u-a');
  expect(getRememberedAccount()?.userId).toBe('u-a');
});

test('a deleted account is wiped from this device and the app signs out', async () => {
  const user = `u-${crypto.randomUUID()}`;
  rememberAccount(account(user));
  await createCharacter();
  await forgetDeletedAccount(user);
  expect(getActiveOwner()).toBeNull();
  expect(getRememberedAccount()).toBeNull();
  expect(await Dexie.exists(`wcg-u-${user}`)).toBe(false);
  expect(getDeletedNotice()).toBe(true);
  dismissDeletedNotice();
  expect(getDeletedNotice()).toBe(false);
});

test('wiping a deleted account that is not the remembered one keeps the current account', async () => {
  const gone = `u-${crypto.randomUUID()}`;
  activateStore(gone);
  await createCharacter();
  rememberAccount(account('u-current'));
  await forgetDeletedAccount(gone);
  expect(getActiveOwner()).toBe('u-current');
  expect(await Dexie.exists(`wcg-u-${gone}`)).toBe(false);
});

/** Deletion requests that record what was called. */
function deletionRequests(confirmResult: { error?: { code?: string; message?: string } | null }) {
  const calls: string[] = [];
  return {
    calls,
    requests: {
      emailLink: async () => {
        calls.push('email-link');
        return { error: null };
      },
      confirm: async (password?: string) => {
        calls.push(`confirm:${password ?? ''}`);
        return confirmResult;
      },
    },
  };
}

test('requesting deletion offline sends nothing', async () => {
  setOnline(false);
  const { calls, requests } = deletionRequests({ error: null });
  expect(await requestAccountDeletion({ method: 'email' }, requests)).toBe('offline');
  expect(await requestAccountDeletion({ method: 'password', password: 'p' }, requests)).toBe(
    'offline',
  );
  expect(calls).toEqual([]);
});

test('an email-confirmed account is sent a link', async () => {
  const { calls, requests } = deletionRequests({ error: null });
  expect(await requestAccountDeletion({ method: 'email' }, requests)).toBe('sent');
  expect(calls).toEqual(['email-link']);
});

test('a refused deletion request throws', async () => {
  await expect(
    requestAccountDeletion(
      { method: 'email' },
      {
        emailLink: async () => ({ error: { message: 'Too many requests' } }),
        confirm: async () => ({ error: null }),
      },
    ),
  ).rejects.toThrow('Too many requests');
});

test('a password deletion that succeeds wipes this device at once', async () => {
  const user = `u-${crypto.randomUUID()}`;
  rememberAccount(account(user));
  await createCharacter();
  const { calls, requests } = deletionRequests({ error: null });
  expect(await requestAccountDeletion({ method: 'password', password: 'pw' }, requests)).toBe(
    'deleted',
  );
  expect(calls).toEqual(['confirm:pw']);
  expect(getActiveOwner()).toBeNull();
  expect(await Dexie.exists(`wcg-u-${user}`)).toBe(false);
  expect(getDeletedNotice()).toBe(true);
  dismissDeletedNotice();
});

test('a wrong password keeps everything', async () => {
  rememberAccount(account('u-a'));
  const { requests } = deletionRequests({ error: { code: 'INVALID_PASSWORD' } });
  expect(await requestAccountDeletion({ method: 'password', password: 'x' }, requests)).toBe(
    'wrong-password',
  );
  expect(getActiveOwner()).toBe('u-a');
});

test('a stale session is asked to sign in again', async () => {
  rememberAccount(account('u-a'));
  const { requests } = deletionRequests({ error: { code: 'SIGN_IN_AGAIN' } });
  expect(await requestAccountDeletion({ method: 'recent-sign-in' }, requests)).toBe(
    'sign-in-again',
  );
  expect(getActiveOwner()).toBe('u-a');
});

test('confirming deletion wipes this device at once', async () => {
  const user = `u-${crypto.randomUUID()}`;
  rememberAccount(account(user));
  await createCharacter();
  expect(await confirmAccountDeletion('tok', async () => ({ error: null }))).toBe('deleted');
  expect(getActiveOwner()).toBeNull();
  expect(getRememberedAccount()).toBeNull();
  expect(await Dexie.exists(`wcg-u-${user}`)).toBe(false);
  expect(getDeletedNotice()).toBe(true);
  dismissDeletedNotice();
});

test('confirming deletion without a session asks to sign in and keeps everything', async () => {
  rememberAccount(account('u-a'));
  const result = await confirmAccountDeletion('tok', async () => ({
    error: { status: 401, message: 'Unauthorized' },
  }));
  expect(result).toBe('signed-out');
  expect(getActiveOwner()).toBe('u-a');
});

test('confirming deletion with a used or expired link reports it', async () => {
  rememberAccount(account('u-a'));
  const result = await confirmAccountDeletion('tok', async () => ({
    error: { status: 404, code: 'INVALID_TOKEN', message: 'Invalid token' },
  }));
  expect(result).toBe('invalid');
  expect(getActiveOwner()).toBe('u-a');
});

test('hidden stores of deleted accounts are wiped; live and active ones stay', async () => {
  const gone = `u-${crypto.randomUUID()}`;
  const alive = `u-${crypto.randomUUID()}`;
  const active = `u-${crypto.randomUUID()}`;
  for (const user of [gone, alive]) {
    activateStore(user);
    await createCharacter();
  }
  rememberAccount(account(active));
  const probed: string[] = [];
  await sweepDeletedStores(async (userId) => {
    probed.push(userId);
    return userId === gone;
  });
  expect(probed).not.toContain(active);
  expect(probed).toEqual(expect.arrayContaining([gone, alive]));
  expect(await Dexie.exists(`wcg-u-${gone}`)).toBe(false);
  expect(await Dexie.exists(`wcg-u-${alive}`)).toBe(true);
  expect(getActiveOwner()).toBe(active);
});

test('the sweep does nothing offline', async () => {
  setOnline(false);
  let probed = false;
  await sweepDeletedStores(async () => {
    probed = true;
    return true;
  });
  expect(probed).toBe(false);
});
