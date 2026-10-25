import type { WildCardCharacter } from './WildCardCharacter.dto';

/** Wire types shared by the sync API and the client sync engine. */

export interface ServerCharacter {
  id: string;
  version: number;
  modifiedAt: number;
  deleted: boolean;
  data: WildCardCharacter;
}

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
