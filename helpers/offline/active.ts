import type { CharToLoad } from '../../dtos/CharToLoad';
import { adoptSignedOutCharacters, countSignedOutCharacters } from './adopt';
import { WcgDb } from './db';
import { createSyncEngine, type SyncEngine, type SyncStatus } from './sync';

/**
 * The one place that knows which local store is active: `wcg` when signed out,
 * `wcg-u-<userId>` for an account. Everything else reads `getActiveDb()`, so
 * switching accounts swaps the store and its sync engine in one step.
 */

export function storeName(userId: string | null): string {
  return userId ? `wcg-u-${userId}` : 'wcg';
}

const stores = new Map<string, WcgDb>();

function storeFor(userId: string | null): WcgDb {
  const name = storeName(userId);
  let store = stores.get(name);
  if (!store) {
    store = new WcgDb(name);
    stores.set(name, store);
  }
  return store;
}

let owner: string | null = null;
let database = storeFor(null);
let engine: SyncEngine | null = null;
let stopListening: (() => void) | null = null;
const activeListeners = new Set<() => void>();
const syncListeners = new Set<() => void>();

function notify(listeners: Set<() => void>) {
  for (const listener of listeners) listener();
}

export function getActiveDb(): WcgDb {
  return database;
}

export function getActiveOwner(): string | null {
  return owner;
}

export function subscribeActive(listener: () => void): () => void {
  activeListeners.add(listener);
  return () => activeListeners.delete(listener);
}

/** Open a store and, for an account, start syncing it. Signed out never syncs. */
export function activateStore(userId: string | null): void {
  if (userId === owner) return;
  stopListening?.();
  engine?.dispose();
  stopListening = null;
  engine = null;

  owner = userId;
  database = storeFor(userId);
  if (userId) {
    engine = createSyncEngine(database, userId);
    stopListening = engine.subscribe(() => notify(syncListeners));
    engine.start();
  }
  setAdoption(null);
  notify(activeListeners);
  notify(syncListeners);
  if (userId) void offerAdoption(userId);
}

/* Adding signed-out characters to an account. */

let adoption: { count: number } | null = null;
/** Accounts already asked during this app start; "Not now" lasts until a reload. */
const asked = new Set<string>();
const adoptionListeners = new Set<() => void>();

function setAdoption(next: { count: number } | null) {
  if (adoption === next) return;
  adoption = next;
  notify(adoptionListeners);
}

async function offerAdoption(userId: string) {
  if (asked.has(userId)) return;
  const count = await countSignedOutCharacters(storeFor(null));
  // The account may have changed while counting.
  if (count === 0 || owner !== userId || asked.has(userId)) return;
  asked.add(userId);
  setAdoption({ count });
}

export function getAdoption(): { count: number } | null {
  return adoption;
}

export function subscribeAdoption(listener: () => void): () => void {
  adoptionListeners.add(listener);
  return () => adoptionListeners.delete(listener);
}

/** "Add": move the signed-out characters into the active account and sync them. */
export async function acceptAdoption(): Promise<void> {
  if (!owner) return;
  await adoptSignedOutCharacters(storeFor(null), database);
  setAdoption(null);
  void syncNow();
}

/** "Not now": leave them signed out; asked again on the next app start. */
export function dismissAdoption(): void {
  setAdoption(null);
}

let signedOutStatus: SyncStatus | null = null;

/** Without an engine there is nothing to sync; the status asks for a sign-in. */
export function getSyncStatus(): SyncStatus {
  if (engine) return engine.getStatus();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (signedOutStatus?.online !== online) {
    signedOutStatus = {
      online,
      syncing: false,
      pending: 0,
      conflicts: 0,
      lastError: null,
      signedOut: true,
    };
  }
  return signedOutStatus;
}

export function subscribeSync(listener: () => void): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export function syncNow(options?: { force?: boolean }): Promise<void> {
  return engine?.syncNow(options) ?? Promise.resolve();
}

/** Characters that are not deleted, by name. */
export async function listCharacters(store: WcgDb): Promise<CharToLoad[]> {
  const rows = await store.characters.where('deleted').equals(0).toArray();
  return rows
    .map((row) => ({ _id: row.id, name: row.data.name, portraitRev: row.data.portraitRev }))
    .sort((left, right) => (left.name || '').localeCompare(right.name || ''));
}
