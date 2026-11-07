import Dexie, { type EntityTable } from 'dexie';
import type { ServerCharacter } from '../../dtos/sync';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';

/**
 * The browser's copy of a character, and the source of truth for the UI.
 * Flags are 0 | 1 because IndexedDB cannot index booleans.
 */
export interface LocalCharacter {
  id: string;
  data: WildCardCharacter;
  /** Last version the server confirmed; 0 = never pushed. */
  version: number;
  dirty: 0 | 1;
  deleted: 0 | 1;
  /** Client clock, stamped on every local write and every applied pull. */
  localUpdatedAt: number;
  /** Why the server rejected this version; cleared by the next edit. */
  syncError?: string;
  /** Server copy that won a race; undefined = no conflict, null = missing on server. */
  conflict?: ServerCharacter | null;
}

export interface LocalPortrait {
  id: string;
  rev: string;
  blob: Blob;
  dirty: 0 | 1;
  /** Why the server rejected this rev; a new portrait replaces the row and clears it. */
  syncError?: string;
}

export interface MetaRow {
  key: 'pullCursor';
  value: number;
}

export class WcgDb extends Dexie {
  characters!: EntityTable<LocalCharacter, 'id'>;
  portraits!: EntityTable<LocalPortrait, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      characters: 'id, dirty, deleted',
      portraits: 'id, dirty',
      meta: 'key',
    });
  }
}

/** A separate database per test, so tests never share state. */
export function openTestDb(name: string): WcgDb {
  return new WcgDb(name);
}

if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
  // Ask the browser not to evict offline characters under storage pressure.
  void navigator.storage?.persist?.();
}
