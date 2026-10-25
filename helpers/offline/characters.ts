import { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { db as defaultDb, type WcgDb } from './db';

/**
 * Local writes. Every function commits to IndexedDB before resolving and
 * marks the row dirty; pushing to the server is the sync engine's job.
 */

let onLocalChange: (() => void) | null = null;

/** The sync engine registers here to debounce a push after each write. */
export function setOnLocalChange(listener: (() => void) | null) {
  onLocalChange = listener;
}

/**
 * A row's next `localUpdatedAt`. Strictly increasing per row, so a push can
 * tell "unchanged since I read it" from "edited in the same millisecond".
 */
export function nextStamp(previous = 0): number {
  return Math.max(Date.now(), previous + 1);
}

function changed() {
  onLocalChange?.();
}

export async function createCharacter(database: WcgDb = defaultDb): Promise<string> {
  const id = crypto.randomUUID();
  const data: WildCardCharacter = { ...new WildCardCharacter(), _id: id };
  await database.characters.add({
    id,
    data,
    version: 0,
    dirty: 1,
    deleted: 0,
    localUpdatedAt: Date.now(),
  });
  changed();
  return id;
}

async function writeData(database: WcgDb, data: WildCardCharacter): Promise<number> {
  const id = data._id;
  if (!id) throw new Error('Cannot save a character without an id');

  return database.transaction('rw', database.characters, async () => {
    const row = await database.characters.get(id);
    if (!row) throw new Error(`Character ${id} is not stored locally`);
    const stamp = nextStamp(row.localUpdatedAt);
    await database.characters.update(id, {
      data,
      dirty: 1,
      syncError: undefined,
      localUpdatedAt: stamp,
    });
    return stamp;
  });
}

/** Save an edit. Returns the row's new `localUpdatedAt`. */
export async function saveCharacter(
  data: WildCardCharacter,
  database: WcgDb = defaultDb,
): Promise<number> {
  const stamp = await writeData(database, data);
  changed();
  return stamp;
}

/** Soft delete: the row stays, dirty, until the server confirms it. */
export async function deleteCharacter(id: string, database: WcgDb = defaultDb): Promise<void> {
  await database.characters
    .where('id')
    .equals(id)
    .modify((row) => {
      row.deleted = 1;
      row.dirty = 1;
      delete row.syncError;
      row.localUpdatedAt = nextStamp(row.localUpdatedAt);
    });
  changed();
}

/** Store a new portrait. Returns its rev, which the caller must keep in its copy of the data. */
export async function setPortrait(
  id: string,
  blob: Blob,
  database: WcgDb = defaultDb,
): Promise<string> {
  const rev = crypto.randomUUID();
  await database.transaction('rw', database.characters, database.portraits, async () => {
    const row = await database.characters.get(id);
    if (!row) throw new Error(`Character ${id} is not stored locally`);
    await database.portraits.put({ id, rev, blob, dirty: 1 });
    await writeData(database, { ...row.data, portraitRev: rev });
  });
  changed();
  return rev;
}

/**
 * `mine` re-bases the local edit on the server's version so the next push
 * overwrites it; if the server deleted the character it also dropped the
 * portrait, so the local one is queued for upload again. `theirs` takes the
 * server copy, or drops the character and its portrait if the server no
 * longer has it.
 */
export async function resolveConflict(
  id: string,
  choice: 'mine' | 'theirs',
  database: WcgDb = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.characters, database.portraits, async () => {
    const row = await database.characters.get(id);
    if (!row || row.conflict === undefined) return;
    const server = row.conflict;
    const goneOnServer = !server || server.deleted;

    if (choice === 'mine') {
      await database.characters.update(id, {
        version: server?.version ?? 0,
        dirty: 1,
        conflict: undefined,
        localUpdatedAt: nextStamp(row.localUpdatedAt),
      });
      if (goneOnServer) await database.portraits.update(id, { dirty: 1 });
    } else if (goneOnServer) {
      await database.characters.delete(id);
      await database.portraits.delete(id);
    } else {
      await database.characters.update(id, {
        data: server.data,
        version: server.version,
        deleted: 0,
        dirty: 0,
        conflict: undefined,
        syncError: undefined,
        localUpdatedAt: nextStamp(row.localUpdatedAt),
      });
    }
  });
  changed();
}
