import { isEqual } from 'lodash';
import type { ServerCharacter } from '../../dtos/sync';
import {
  ApiError,
  getPortraitRemote,
  pullRemote,
  putCharacterRemote,
  putPortraitRemote,
} from './api';
import { nextStamp, setOnLocalChange } from './characters';
import { db as defaultDb, type LocalCharacter, type WcgDb } from './db';

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  conflicts: number;
  lastError: string | null;
}

export interface SyncEngine {
  /** Push dirty rows, then pull. `force` also retries rows the server rejected. */
  syncNow(options?: { force?: boolean }): Promise<void>;
  /** Listen for connectivity, focus and local edits. Idempotent. */
  start(): void;
  subscribe(listener: () => void): () => void;
  getStatus(): SyncStatus;
  retryScheduled(): boolean;
  dispose(): void;
}

const PUSH_DEBOUNCE = 600;
const RETRY_DELAYS = [5_000, 15_000, 30_000, 60_000];
const SYNC_INTERVAL = 30_000;
const LOCK_NAME = 'wcg-sync';

/** Rejections that would fail the same way on every retry. */
function isPermanent(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'The server took too long to respond.';
    return error.message;
  }
  return 'Could not reach the server.';
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** JSON drops undefined fields, so compare both sides in their wire shape. */
function sameContent(server: ServerCharacter, row: LocalCharacter) {
  if (server.deleted && row.deleted) return true;
  return (
    server.deleted === Boolean(row.deleted) &&
    isEqual(JSON.parse(JSON.stringify(server.data)), JSON.parse(JSON.stringify(row.data)))
  );
}

/** Stops the current run: the server is unreachable, so later requests would fail too. */
class Unreachable extends Error {
  constructor(readonly cause: unknown) {
    super(errorMessage(cause));
  }
}

export function createSyncEngine(database: WcgDb): SyncEngine {
  let status: SyncStatus = {
    online: isOnline(),
    syncing: false,
    pending: 0,
    conflicts: 0,
    lastError: null,
  };
  const listeners = new Set<() => void>();
  let running: Promise<void> | null = null;
  let rerun: { force: boolean } | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryAttempt = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanup: (() => void) | null = null;

  function setStatus(patch: Partial<SyncStatus>) {
    const next = { ...status, ...patch };
    if (isEqual(next, status)) return;
    status = next;
    for (const listener of listeners) listener();
  }

  async function refreshCounts() {
    const dirty = await database.characters.where('dirty').equals(1).toArray();
    setStatus({
      pending: dirty.length,
      conflicts: dirty.filter((row) => row.conflict !== undefined).length,
    });
  }

  /** Mark the row clean if nothing was written since `stamp`. */
  async function confirmPush(id: string, stamp: number, version: number) {
    await database.transaction('rw', database.characters, database.portraits, async () => {
      const row = await database.characters.get(id);
      if (!row) return;
      const clean = row.localUpdatedAt === stamp;
      if (clean && row.deleted) {
        await database.characters.delete(id);
        await database.portraits.delete(id);
        return;
      }
      await database.characters.update(id, { version, dirty: clean ? 0 : 1 });
    });
  }

  async function resolveDeleteConflict(row: LocalCharacter, server: ServerCharacter | null) {
    await database.transaction('rw', database.characters, database.portraits, async () => {
      if (!server || server.deleted) {
        await database.characters.delete(row.id);
        await database.portraits.delete(row.id);
        return;
      }
      await database.characters.update(row.id, {
        data: server.data,
        version: server.version,
        deleted: 0,
        dirty: 0,
        localUpdatedAt: nextStamp(row.localUpdatedAt),
      });
    });
  }

  /** Throws Unreachable for errors that make the rest of the run pointless. */
  async function guarded<T>(
    action: () => Promise<T>,
    onPermanent: (error: ApiError) => Promise<void>,
  ) {
    try {
      return await action();
    } catch (error) {
      if (isPermanent(error)) {
        await onPermanent(error as ApiError);
        return undefined;
      }
      throw new Unreachable(error);
    }
  }

  async function pushCharacters(force: boolean): Promise<string | null> {
    let rejected: string | null = null;
    const dirty = (await database.characters.where('dirty').equals(1).sortBy('localUpdatedAt'))
      .filter((row) => row.conflict === undefined)
      .filter((row) => force || !row.syncError);

    for (const row of dirty) {
      if (row.deleted && row.version === 0) {
        // Never reached the server, so there is nothing to delete there.
        await database.characters.delete(row.id);
        await database.portraits.delete(row.id);
        continue;
      }

      const stamp = row.localUpdatedAt;
      const result = await guarded(
        () =>
          putCharacterRemote(row.id, {
            baseVersion: row.version,
            deleted: Boolean(row.deleted),
            data: row.data,
          }),
        async (error) => {
          rejected = error.message;
          console.error(`The server rejected character ${row.id}:`, error);
          await database.characters.update(row.id, { syncError: error.message });
        },
      );
      if (!result) continue;

      if ('ok' in result) {
        await confirmPush(row.id, stamp, result.ok.version);
      } else if (result.conflict && sameContent(result.conflict, row)) {
        // Another tab or a lost response already saved this exact content.
        await confirmPush(row.id, stamp, result.conflict.version);
      } else if (row.deleted) {
        // A deleted row is hidden from the UI, so it cannot show a conflict
        // banner. An edit elsewhere wins over the delete; a copy already gone
        // from the server just drops the row.
        await resolveDeleteConflict(row, result.conflict);
      } else {
        await database.characters.update(row.id, { conflict: result.conflict });
      }
    }
    return rejected;
  }

  async function pushPortraits() {
    const dirty = await database.portraits.where('dirty').equals(1).toArray();
    for (const portrait of dirty) {
      const character = await database.characters.get(portrait.id);
      if (!character || character.version === 0) continue;

      const done = await guarded(
        async () => {
          await putPortraitRemote(portrait.id, portrait.rev, portrait.blob);
          return true;
        },
        async (error) => {
          console.error(`The server rejected the portrait of ${portrait.id}:`, error);
        },
      );
      if (!done) continue;
      await database.transaction('rw', database.portraits, async () => {
        const current = await database.portraits.get(portrait.id);
        if (current?.rev === portrait.rev)
          await database.portraits.update(portrait.id, { dirty: 0 });
      });
    }
  }

  async function applyPulled(server: ServerCharacter) {
    await database.transaction('rw', database.characters, database.portraits, async () => {
      const local = await database.characters.get(server.id);
      if (!local) {
        if (server.deleted) return;
        await database.characters.add({
          id: server.id,
          data: server.data,
          version: server.version,
          dirty: 0,
          deleted: 0,
          localUpdatedAt: Date.now(),
        });
        return;
      }
      // A dirty row keeps its edits; its next push answers with a conflict.
      if (local.dirty || server.version <= local.version) return;
      if (server.deleted) {
        await database.characters.delete(server.id);
        await database.portraits.delete(server.id);
        return;
      }
      await database.characters.update(server.id, {
        data: server.data,
        version: server.version,
        deleted: 0,
        localUpdatedAt: nextStamp(local.localUpdatedAt),
      });
    });
  }

  async function pull() {
    const since = (await database.meta.get('pullCursor'))?.value ?? 0;
    const response = await guarded(
      () => pullRemote(since),
      async (error) => {
        throw new Unreachable(error);
      },
    );
    if (!response) return;
    for (const server of response.characters) await applyPulled(server);
    await database.meta.put({ key: 'pullCursor', value: response.cursor });
  }

  /**
   * Download portraits whose rev the local copy lacks. Checks every local
   * character, not just pulled ones, so a download that failed or raced an
   * upload is retried on the next run.
   */
  async function pullPortraits() {
    const characters = await database.characters.where('deleted').equals(0).toArray();
    for (const character of characters) {
      const wanted = character.data.portraitRev;
      if (!wanted || character.version === 0) continue;
      const local = await database.portraits.get(character.id);
      if (local?.dirty || local?.rev === wanted) continue;

      const remote = await guarded(
        () => getPortraitRemote(character.id),
        async () => undefined,
      );
      if (!remote || remote.rev !== wanted) continue;
      await database.portraits.put({
        id: character.id,
        rev: remote.rev,
        blob: remote.blob,
        dirty: 0,
      });
    }
  }

  function scheduleRetry() {
    if (retryTimer) return;
    const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)];
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void syncNow();
    }, delay);
  }

  function resetRetry() {
    retryAttempt = 0;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }

  async function run(force: boolean) {
    if (!isOnline()) {
      setStatus({ online: false, syncing: false });
      await refreshCounts();
      return;
    }

    setStatus({ online: true, syncing: true });
    let lastError: string | null = null;
    try {
      lastError = await pushCharacters(force);
      await pushPortraits();
      await pull();
      await pullPortraits();
      resetRetry();
    } catch (error) {
      if (!(error instanceof Unreachable)) throw error;
      lastError = error.message;
      scheduleRetry();
    } finally {
      // Rows rejected earlier keep the badge in its error state until edited.
      const stillRejected = await database.characters
        .where('dirty')
        .equals(1)
        .filter((row) => Boolean(row.syncError))
        .first();
      setStatus({ syncing: false, lastError: lastError ?? stillRejected?.syncError ?? null });
      await refreshCounts();
    }
  }

  function withLock(task: () => Promise<void>) {
    // One tab syncs at a time, so two tabs never push the same row twice.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(LOCK_NAME, task);
    }
    return task();
  }

  function syncNow(options: { force?: boolean } = {}): Promise<void> {
    const force = Boolean(options.force);
    if (running) {
      rerun = { force: force || Boolean(rerun?.force) };
      return running;
    }
    running = withLock(() => run(force)).finally(() => {
      running = null;
      const next = rerun;
      rerun = null;
      if (next) void syncNow(next);
    });
    return running;
  }

  function start() {
    if (cleanup || typeof window === 'undefined') return;

    setOnLocalChange(() => {
      void refreshCounts();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void syncNow();
      }, PUSH_DEBOUNCE);
    });

    const handleOnline = () => {
      resetRetry();
      void syncNow();
    };
    const handleOffline = () => setStatus({ online: false, syncing: false });
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);
    const interval = setInterval(() => void syncNow(), SYNC_INTERVAL);

    cleanup = () => {
      setOnLocalChange(null);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
      clearInterval(interval);
    };
    void syncNow();
  }

  return {
    syncNow,
    start,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getStatus: () => status,
    retryScheduled: () => retryTimer !== null,
    dispose() {
      cleanup?.();
      cleanup = null;
      resetRetry();
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}

const engine = createSyncEngine(defaultDb);

export const syncNow = engine.syncNow;
export const startSync = engine.start;
export const subscribeSync = engine.subscribe;
export const getSyncStatus = engine.getStatus;
