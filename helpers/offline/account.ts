import { activateStore, getActiveDb } from './active';

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

/** Another tab signed in or out: follow it. A null key means storage was cleared. */
export function onAccountStorage(event: { key: string | null }): void {
  if (event.key !== null && event.key !== KEY) return;
  activateStore(getRememberedAccount()?.userId ?? null);
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

/**
 * Open the remembered account's store, follow other tabs, then reconcile with
 * the session when online. With no session the remembered account stays, so a
 * lapsed session shows "Sign in to sync" instead of hiding its characters.
 */
export async function startAccounts(
  lookup: () => Promise<Account | null> = sessionAccount,
): Promise<() => void> {
  activateStore(getRememberedAccount()?.userId ?? null);

  const handleStorage = (event: StorageEvent) => onAccountStorage(event);
  if (typeof window !== 'undefined') window.addEventListener('storage', handleStorage);
  const stop = () => {
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
  };

  if (navigator.onLine) {
    try {
      const account = await lookup();
      if (account) rememberAccount(account);
    } catch (error) {
      console.warn('Could not check the session; using the remembered account:', error);
    }
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
  await signOut();
  rememberAccount(null);
  return 'done';
}
