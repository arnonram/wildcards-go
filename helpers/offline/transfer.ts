import { isCharacterData } from '../../dtos/sync';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { newId } from '../new-id';
import { getActiveDb } from './active';
import { changed } from './characters';
import type { LocalCharacter, LocalPortrait, WcgDb } from './db';

/**
 * Characters as a file people keep or move between accounts. Portraits ride
 * along as data URLs, so one .json file holds everything.
 */
interface ExportFile {
  format: 'wild-cards-go';
  version: 1;
  exportedAt: string;
  characters: { data: WildCardCharacter; portrait?: string }[];
}

const NOT_AN_EXPORT = 'This file is not a Wild Cards Go export.';
const DAMAGED = 'This export is damaged, so nothing was imported.';
const PORTRAIT = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/;

async function toDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

function fromDataUrl(url: unknown): Blob | null {
  const match = typeof url === 'string' ? PORTRAIT.exec(url) : null;
  if (!match) return null;
  return new Blob([Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))], { type: match[1] });
}

/** Every live character, or only those in `ids`. */
export async function exportCharacters(
  ids?: string[],
  database: WcgDb = getActiveDb(),
): Promise<Blob> {
  const rows = (await database.characters.where('deleted').equals(0).toArray()).filter(
    (row) => !ids || ids.includes(row.id),
  );
  const characters = await Promise.all(
    rows.map(async ({ id, data }) => {
      const portrait = data.portraitRev ? await database.portraits.get(id) : undefined;
      return portrait ? { data, portrait: await toDataUrl(portrait.blob) } : { data };
    }),
  );
  const file: ExportFile = {
    format: 'wild-cards-go',
    version: 1,
    exportedAt: new Date().toISOString(),
    characters,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

/**
 * Adds every character in the file as a new one, so an import never
 * overwrites a character or races one already synced. All or nothing.
 * Returns how many were added.
 */
export async function importCharacters(
  text: string,
  database: WcgDb = getActiveDb(),
): Promise<number> {
  let file: Partial<ExportFile>;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error(NOT_AN_EXPORT);
  }
  if (file?.format !== 'wild-cards-go' || file.version !== 1 || !Array.isArray(file.characters)) {
    throw new Error(NOT_AN_EXPORT);
  }

  const characters: LocalCharacter[] = [];
  const portraits: LocalPortrait[] = [];
  for (const entry of file.characters as unknown[]) {
    const { data, portrait } = (entry ?? {}) as { data?: unknown; portrait?: unknown };
    if (!isCharacterData(data)) throw new Error(DAMAGED);
    const id = newId();
    const blob = portrait === undefined ? undefined : fromDataUrl(portrait);
    if (blob === null) throw new Error(DAMAGED);
    let portraitRev: string | undefined;
    if (blob) {
      portraitRev = newId();
      portraits.push({ id, rev: portraitRev, blob, dirty: 1 });
    }
    characters.push({
      id,
      data: { ...data, _id: id, portraitRev },
      version: 0,
      dirty: 1,
      deleted: 0,
      localUpdatedAt: Date.now(),
    });
  }

  await database.transaction('rw', database.characters, database.portraits, async () => {
    await database.characters.bulkAdd(characters);
    await database.portraits.bulkAdd(portraits);
  });
  changed();
  return characters.length;
}

/**
 * Downloads an export: one character is named after it, everything after the
 * day it was taken.
 */
export async function downloadExport(character?: { id: string; name?: string }): Promise<void> {
  const blob = await exportCharacters(character && [character.id]);
  const slug = character?.name
    ?.trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  const name = character
    ? `${slug || 'character'}.wildcards.json`
    : `wild-cards-go-${new Date().toISOString().slice(0, 10)}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
