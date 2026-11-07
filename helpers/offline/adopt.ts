import { nextStamp } from './characters';
import type { WcgDb } from './db';

/** Signed-out characters that could be added to an account. */
export function countSignedOutCharacters(source: WcgDb): Promise<number> {
  return source.characters.where('deleted').equals(0).count();
}

/**
 * Move every signed-out character, with its portrait, into an account store.
 * Moved rows are reset to "not on the server yet", so the next sync creates
 * them under this account. IndexedDB transactions cannot span databases, so
 * each character is written to the target, then deleted from the source; a
 * rerun after an interruption keeps the target copy and still clears the
 * source, so nothing is duplicated. Returns how many characters moved.
 */
export async function adoptSignedOutCharacters(source: WcgDb, target: WcgDb): Promise<number> {
  let moved = 0;
  for (const row of await source.characters.toArray()) {
    if (!row.deleted) {
      const portrait = await source.portraits.get(row.id);
      const added = await target.transaction(
        'rw',
        target.characters,
        target.portraits,
        async () => {
          if (await target.characters.get(row.id)) return false;
          await target.characters.add({
            id: row.id,
            data: row.data,
            version: 0,
            dirty: 1,
            deleted: 0,
            localUpdatedAt: nextStamp(row.localUpdatedAt),
          });
          if (portrait) await target.portraits.put({ ...portrait, dirty: 1, syncError: undefined });
          return true;
        },
      );
      if (added) moved += 1;
    }
    await source.transaction('rw', source.characters, source.portraits, async () => {
      await source.characters.delete(row.id);
      await source.portraits.delete(row.id);
    });
  }
  return moved;
}
