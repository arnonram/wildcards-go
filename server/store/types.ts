import type {
  PullResponse,
  PutCharacterBody,
  PutCharacterOk,
  ServerCharacter,
} from '../../dtos/sync';

export type PutResult =
  | { ok: PutCharacterOk }
  | { conflict: ServerCharacter | null }
  | { notFound: true };

export type Portrait = { rev: string; contentType: string; bytes: Uint8Array };

/**
 * Where characters, portraits and deleted-account ids live. MongoDB serves the
 * hosted site and SQLite self-hosted installs; both pass the same test suite,
 * so the sync rules below hold whichever one is running.
 */
export interface CharacterStore {
  /**
   * Write a character only if the client saw the latest version. Anything else
   * is a conflict, answered with the server's copy so the client can resolve
   * it. Another owner's character answers notFound and never their copy, so
   * ids reveal nothing about other users' data. Tombstones drop the data and
   * the portrait.
   */
  putCharacter(
    ownerId: string,
    id: string,
    body: PutCharacterBody,
    now: number,
  ): Promise<PutResult>;
  /**
   * Characters written at or after `since`. Equal timestamps are included so
   * two writes in the same millisecond are never skipped; applying a row twice
   * on the client is harmless.
   */
  listChangedSince(ownerId: string, since: number, now: number): Promise<PullResponse>;
  /**
   * Portraits live apart from the character so edits never re-send image
   * bytes. Returns false, writing nothing, when the character is missing,
   * deleted or owned by someone else, so a late upload cannot leave an orphan.
   */
  putPortrait(
    ownerId: string,
    id: string,
    rev: string,
    contentType: string,
    bytes: Uint8Array,
  ): Promise<boolean>;
  getPortrait(ownerId: string, id: string): Promise<Portrait | null>;
  /** Everything an account owns in this app; Better Auth removes its own records. */
  deleteOwnerData(ownerId: string): Promise<void>;
  /**
   * Remember that an account was deleted, by its random id only, so its
   * devices can tell "deleted" (410) from "signed out" (401) and wipe their
   * local copy.
   */
  markUserDeleted(userId: string, now: number): Promise<void>;
  isUserDeleted(userId: string): Promise<boolean>;
}

/**
 * How far the pull cursor trails server time. `modifiedAt` is stamped before
 * the write commits, so a slow write can land below a cursor already handed
 * out; trailing re-sends recent rows instead of skipping them.
 */
export const CURSOR_LAG_MS = 30_000;

/** The cursor trails `now` by CURSOR_LAG_MS and never moves backwards. */
export function nextCursor(modifiedAts: number[], since: number, now: number): number {
  const maxSeen = modifiedAts.reduce((max, at) => Math.max(max, at), since);
  return Math.max(since, Math.min(maxSeen, now - CURSOR_LAG_MS));
}

/** Portrait types the server stores. SVG is excluded: it can carry script. */
export const PORTRAIT_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export function isPortraitType(contentType: string): boolean {
  return PORTRAIT_TYPES.includes(contentType.split(';')[0].trim().toLowerCase());
}
