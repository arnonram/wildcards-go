import type { WildCardCharacter } from './WildCardCharacter.dto';

/** Wire types shared by the sync API and the client sync engine. */

/** Character ids are `crypto.randomUUID()` strings. */
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

export interface PullResponse {
  characters: ServerCharacter[];
  cursor: number;
}
