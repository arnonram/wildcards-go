import type { WildCardCharacter } from './WildCardCharacter.dto';

/** Wire types shared by the sync API and the client sync engine. */

/** Names the account whose local store a sync request comes from. */
export const STORE_OWNER_HEADER = 'X-WCG-Store-Owner';

/** Character ids are random version 4 UUIDs, from `newId()`. */
export const CHARACTER_ID = /^[0-9a-f-]{36}$/;

interface ServerCharacterBase {
  id: string;
  version: number;
  modifiedAt: number;
}

/** A deleted character is a tombstone: it carries no data. */
export type ServerCharacter = ServerCharacterBase &
  ({ deleted: false; data: WildCardCharacter } | { deleted: true; data?: undefined });

/** `baseVersion` is the version the client last saw; 0 creates the character. */
export interface PutCharacterBody {
  baseVersion: number;
  deleted: boolean;
  data: WildCardCharacter;
}

export interface PutCharacterOk {
  version: number;
  modifiedAt: number;
}

/** 409 body. `server` is null when the character does not exist on the server. */
export interface ConflictBody {
  server: ServerCharacter | null;
}

/**
 * The fields every sheet reads on load. Anything that becomes a stored
 * character passes this first, so a malformed one cannot break the owner's
 * other devices when they pull it.
 */
export function isCharacterData(data: unknown): data is WildCardCharacter {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const { name, wounds, fatigue, attributes, skills } = data as Record<string, unknown>;
  return (
    typeof name === 'string' &&
    typeof wounds === 'number' &&
    typeof fatigue === 'number' &&
    Array.isArray(attributes) &&
    Array.isArray(skills)
  );
}

export interface PullResponse {
  characters: ServerCharacter[];
  cursor: number;
}
