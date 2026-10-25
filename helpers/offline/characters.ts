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

  const stamp = Date.now();
  const updated = await database.characters.update(id, {
    data,
    dirty: 1,
    syncError: undefined,
    localUpdatedAt: stamp,
  });
  if (!updated) throw new Error(`Character ${id} is not stored locally`);
  return stamp;
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
  await database.characters.update(id, {
    deleted: 1,
    dirty: 1,
    syncError: undefined,
    localUpdatedAt: Date.now(),
  });
  changed();
}

export async function setPortrait(
  id: string,
  blob: Blob,
  database: WcgDb = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.characters, database.portraits, async () => {
    const row = await database.characters.get(id);
    if (!row) throw new Error(`Character ${id} is not stored locally`);
    const rev = crypto.randomUUID();
    await database.portraits.put({ id, rev, blob, dirty: 1 });
    await writeData(database, { ...row.data, portraitRev: rev });
  });
  changed();
}

/**
 * `mine` re-bases the local edit on the server's version so the next push
 * overwrites it. `theirs` takes the server copy, or drops the character if
 * the server no longer has it.
 */
export async function resolveConflict(
  id: string,
  choice: 'mine' | 'theirs',
  database: WcgDb = defaultDb,
): Promise<void> {
  const row = await database.characters.get(id);
  if (!row || row.conflict === undefined) return;
  const server = row.conflict;

  if (choice === 'mine') {
    await database.characters.update(id, {
      version: server?.version ?? 0,
      dirty: 1,
      conflict: undefined,
      localUpdatedAt: Date.now(),
    });
  } else if (!server || server.deleted) {
    await database.characters.delete(id);
  } else {
    await database.characters.update(id, {
      data: server.data,
      version: server.version,
      deleted: 0,
      dirty: 0,
      conflict: undefined,
      syncError: undefined,
      localUpdatedAt: Date.now(),
    });
  }
  changed();
}
