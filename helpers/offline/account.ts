import Dexie from 'dexie';
import { STORE_OWNER_HEADER } from '../../dtos/sync';
import {
  activateStore,
  deleteStore,
  getActiveDb,
  getActiveOwner,
  getSyncStatus,
  storeOwner,
  subscribeSync,
} from './active';

/**
 * The last signed-in account, remembered so the app opens the right store at
 * startup, including offline. The session cookie itself is checked when the
 * network allows.
 */

const KEY = 'wcg-account';

export interface Account {
  userId: string;
  /** The user's name, or their email when they have none (email-link users). */
  name: string;
  image: string | null;
}

export function toAccount(user: {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}): Account {
  return { userId: user.id, name: user.name || user.email, image: user.image ?? null };
}

export function getRememberedAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

/** Remember (or forget) the account and switch to its store. */
export function rememberAccount(account: Account | null): void {
  try {
    if (account) localStorage.setItem(KEY, JSON.stringify(account));
    else localStorage.removeItem(KEY);
  } catch (error) {
    console.warn('Could not remember the account in this browser:', error);
  }
  activateStore(account?.userId ?? null);
}

/**
 * Open the remembered account's store. Runs when this module loads, before
 * any page mounts, so a page never sees a switch from the signed-out store
 * on startup.
 */
export function restoreRememberedAccount(): void {
  activateStore(getRememberedAccount()?.userId ?? null);
}

if (typeof window !== 'undefined') restoreRememberedAccount();

/** Another tab signed in or out: follow it. A null key means storage was cleared. */
export function onAccountStorage(event: { key: string | null }): void {
  if (event.key !== null && event.key !== KEY) return;
  activateStore(getRememberedAccount()?.userId ?? null);
}

/* "This account was deleted" notice. */

let deletedNotice = false;
const noticeListeners = new Set<() => void>();

function setDeletedNotice(value: boolean) {
  deletedNotice = value;
  for (const listener of noticeListeners) listener();
}

export function getDeletedNotice(): boolean {
  return deletedNotice;
}

export function subscribeDeletedNotice(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

export function dismissDeletedNotice(): void {
  setDeletedNotice(false);
}

/**
 * The server says this account was deleted: wipe its local store. If it was
 * the open account, sign out on this device; other tabs follow through the
 * storage event and their own 410s.
 */
export async function forgetDeletedAccount(userId: string): Promise<void> {
  if (getRememberedAccount()?.userId === userId) rememberAccount(null);
  else if (getActiveOwner() === userId) restoreRememberedAccount();
  await deleteStore(userId);
  setDeletedNotice(true);
}

type AuthResult = { error?: { status?: number; code?: string; message?: string } | null };

async function serverConfirmDeletion(token: string): Promise<AuthResult> {
  const { authClient } = await import('../auth-client');
  return authClient.deleteUser({ token }) as Promise<AuthResult>;
}

/**
 * Finish a deletion from the emailed link. Better Auth only deletes with the
 * account's session in this browser; on success this device is wiped at once.
 */
export async function confirmAccountDeletion(
  token: string,
  request: (token: string) => Promise<AuthResult> = serverConfirmDeletion,
): Promise<'deleted' | 'signed-out' | 'invalid'> {
  const owner = getActiveOwner();
  const { error } = await request(token);
  if (error) {
    if (error.status === 401 || error.code === 'FAILED_TO_GET_USER_INFO') return 'signed-out';
    if (error.code === 'INVALID_TOKEN') return 'invalid';
    throw new Error(error.message || 'Could not delete the account');
  }
  if (owner) await forgetDeletedAccount(owner);
  return 'deleted';
}

/** True when the server says this account was deleted (410 before any session check). */
async function accountWasDeleted(userId: string): Promise<boolean> {
  const response = await fetch(`/api/characters?since=${Date.now()}`, {
    cache: 'no-store',
    headers: { [STORE_OWNER_HEADER]: userId },
  });
  return response.status === 410;
}

/**
 * Hidden account stores (signed out, or another account open) never sync, so
 * they would never see a 410. Ask about each one once per start and wipe the
 * stores of deleted accounts.
 */
export async function sweepDeletedStores(
  isDeleted: (userId: string) => Promise<boolean> = accountWasDeleted,
): Promise<void> {
  if (!navigator.onLine) return;
  for (const name of await Dexie.getDatabaseNames()) {
    const userId = storeOwner(name);
    if (!userId || userId === getActiveOwner()) continue;
    try {
      if (await isDeleted(userId)) await deleteStore(userId);
    } catch (error) {
      console.warn(`Could not check whether account ${userId} still exists:`, error);
    }
  }
}

/** Watch the sync status of whichever account is open for a 410. */
function watchForDeletion(): () => void {
  return subscribeSync(() => {
    const owner = getActiveOwner();
    if (owner && getSyncStatus().accountDeleted) {
      forgetDeletedAccount(owner).catch((error) => {
        console.error('Could not remove the deleted account from this device:', error);
      });
    }
  });
}

async function sessionAccount(): Promise<Account | null> {
  const { authClient } = await import('../auth-client');
  const { data } = await authClient.getSession();
  return data ? toAccount(data.user) : null;
}

async function serverSignOut(): Promise<unknown> {
  const { authClient } = await import('../auth-client');
  return authClient.signOut();
}

async function serverDeleteRequest(): Promise<unknown> {
  const { authClient } = await import('../auth-client');
  return authClient.deleteUser({ callbackURL: '/' });
}

/**
 * Ask the server to email a confirmation link. Deletion happens when the link
 * is opened in a browser signed in to this account.
 */
export async function requestAccountDeletion(
  request: () => Promise<unknown> = serverDeleteRequest,
): Promise<'offline' | 'sent'> {
  if (!navigator.onLine) return 'offline';
  const result = (await request()) as { error?: { message?: string } | null } | undefined;
  if (result?.error) throw new Error(result.error.message || 'Could not send the email');
  return 'sent';
}

/**
 * Open the remembered account's store, follow other tabs, then reconcile with
 * the session when online. With no session the remembered account stays, so a
 * lapsed session shows "Sign in to sync" instead of hiding its characters.
 */
export async function startAccounts(
  lookup: () => Promise<Account | null> = sessionAccount,
): Promise<() => void> {
  restoreRememberedAccount();

  const handleStorage = (event: StorageEvent) => onAccountStorage(event);
  if (typeof window !== 'undefined') window.addEventListener('storage', handleStorage);
  const stopWatching = watchForDeletion();
  const stop = () => {
    stopWatching();
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
  };

  if (navigator.onLine) {
    try {
      const account = await lookup();
      if (account) rememberAccount(account);
    } catch (error) {
      console.warn('Could not check the session; using the remembered account:', error);
    }
    if (typeof window !== 'undefined') void sweepDeletedStores();
  }
  return stop;
}

/**
 * Sign out needs the server: a local-only sign-out would leave a live session
 * cookie and the next online start would sign the person back in. The
 * account's store stays on the device, hidden until it signs in again.
 */
export async function signOutOfDevice(
  confirmUnsynced: (count: number) => Promise<boolean>,
  signOut: () => Promise<unknown> = serverSignOut,
): Promise<'offline' | 'cancelled' | 'done'> {
  if (!navigator.onLine) return 'offline';
  const unsynced = await getActiveDb().characters.where('dirty').equals(1).count();
  if (unsynced > 0 && !(await confirmUnsynced(unsynced))) return 'cancelled';
  // Better Auth's client resolves HTTP failures as `{ error }` instead of
  // throwing; signing out locally then would leave a live session cookie.
  const result = (await signOut()) as { error?: { message?: string } | null } | undefined;
  if (result?.error) throw new Error(result.error.message || 'Sign-out failed');
  rememberAccount(null);
  return 'done';
}
