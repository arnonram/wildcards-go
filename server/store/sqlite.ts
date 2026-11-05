import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ServerCharacter } from '../../dtos/sync';
import { type CharacterStore, nextCursor, type PutResult } from './types';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  modified_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL,
  data TEXT
);
CREATE INDEX IF NOT EXISTS characters_owner_modified ON characters (owner_id, modified_at);
CREATE TABLE IF NOT EXISTS portraits (
  id TEXT PRIMARY KEY,
  rev TEXT NOT NULL,
  content_type TEXT NOT NULL,
  data BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS deleted_users (
  id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
`;

type CharacterRow = {
  id: string;
  owner_id: string;
  version: number;
  modified_at: number;
  deleted: number;
  /** JSON; NULL on tombstones. */
  data: string | null;
};

/**
 * Open (creating if needed) the self-hosted database file. WAL lets readers
 * carry on during a write, and the busy timeout rides out the brief lock a
 * backup or a second connection takes.
 */
export function openSqlite(file: string): DatabaseSync {
  try {
    if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    db.exec(SCHEMA);
    return db;
  } catch (error) {
    // SQLite's own message ("unable to open database file") names no path.
    throw new Error(`Cannot open SQLite database at ${file}: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

function toServerCharacter(row: CharacterRow): ServerCharacter {
  const base = { id: row.id, version: row.version, modifiedAt: row.modified_at };
  if (row.deleted || row.data === null) return { ...base, deleted: true };
  return { ...base, deleted: false, data: { ...JSON.parse(row.data), _id: row.id } };
}

/** The self-hosted store: the same rules as the MongoDB one, in one file. */
/** How long a store call waits for another transaction before giving up. */
const TRANSACTION_WAIT_MS = 5_000;

export function createSqliteStore(
  db: DatabaseSync,
  { transactionWaitMs = TRANSACTION_WAIT_MS }: { transactionWaitMs?: number } = {},
): CharacterStore {
  const byId = db.prepare('SELECT * FROM characters WHERE id = ?');
  const ownsLiveRow = db.prepare(
    'SELECT 1 FROM characters WHERE id = ? AND owner_id = ? AND deleted = 0',
  );
  const insert = db.prepare(
    `INSERT INTO characters (id, owner_id, version, modified_at, deleted, data)
     VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
  );
  const update = db.prepare(
    `UPDATE characters SET data = ?, deleted = ?, modified_at = ?, version = version + 1
     WHERE id = ? AND owner_id = ? AND version = ?`,
  );
  const changedSince = db.prepare(
    'SELECT * FROM characters WHERE owner_id = ? AND modified_at >= ?',
  );
  const deletePortrait = db.prepare('DELETE FROM portraits WHERE id = ?');
  const upsertPortrait = db.prepare(
    `INSERT INTO portraits (id, rev, content_type, data) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET rev = excluded.rev, content_type = excluded.content_type,
       data = excluded.data`,
  );
  const portraitById = db.prepare('SELECT rev, content_type, data FROM portraits WHERE id = ?');
  const deleteOwnedPortraits = db.prepare(
    'DELETE FROM portraits WHERE id IN (SELECT id FROM characters WHERE owner_id = ?)',
  );
  const deleteOwnedCharacters = db.prepare('DELETE FROM characters WHERE owner_id = ?');
  const insertDeletedUser = db.prepare(
    'INSERT INTO deleted_users (id, deleted_at) VALUES (?, ?) ON CONFLICT (id) DO NOTHING',
  );
  const deletedUser = db.prepare('SELECT 1 FROM deleted_users WHERE id = ?');

  /** Why a write matched nothing. */
  function rejection(ownerId: string, id: string): PutResult {
    const row = byId.get(id) as CharacterRow | undefined;
    if (!row) return { conflict: null };
    if (row.owner_id !== ownerId) return { notFound: true };
    return { conflict: toServerCharacter(row) };
  }

  const ownsLive = (ownerId: string, id: string) => ownsLiveRow.get(id, ownerId) !== undefined;

  /**
   * Better Auth shares this connection and keeps transactions open across
   * awaits (sign-up hashes the password mid-transaction). A statement run then
   * would join that transaction and vanish if it rolls back, so each store
   * call waits for it to end, then runs its statements without yielding.
   * Store calls are never made from inside a Better Auth transaction.
   */
  async function outsideTransaction(): Promise<void> {
    const deadline = Date.now() + transactionWaitMs;
    while (db.isTransaction) {
      // A transaction that never ends (a store call made from inside one would
      // wait on itself) must fail loudly rather than hang the request.
      if (Date.now() > deadline) {
        throw new Error(`SQLite store gave up waiting for an open transaction to end`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  return {
    async putCharacter(ownerId, id, body, now) {
      await outsideTransaction();
      // Tombstones drop the data: no device needs it once the character is gone.
      const { _id, ...rest } = body.data;
      const data = body.deleted ? null : JSON.stringify(rest);
      const deleted = body.deleted ? 1 : 0;

      if (body.baseVersion === 0) {
        if (insert.run(id, ownerId, now, deleted, data).changes === 0) {
          return rejection(ownerId, id);
        }
        return { ok: { version: 1, modifiedAt: now } };
      }

      if (update.run(data, deleted, now, id, ownerId, body.baseVersion).changes === 0) {
        return rejection(ownerId, id);
      }
      if (body.deleted) deletePortrait.run(id);
      return { ok: { version: body.baseVersion + 1, modifiedAt: now } };
    },

    async listChangedSince(ownerId, since, now) {
      await outsideTransaction();
      const rows = changedSince.all(ownerId, since) as CharacterRow[];
      return {
        characters: rows.map(toServerCharacter),
        cursor: nextCursor(
          rows.map((row) => row.modified_at),
          since,
          now,
        ),
      };
    },

    async putPortrait(ownerId, id, rev, contentType, bytes) {
      await outsideTransaction();
      if (!ownsLive(ownerId, id)) return false;
      upsertPortrait.run(id, rev, contentType, bytes);
      return true;
    },

    async getPortrait(ownerId, id) {
      await outsideTransaction();
      if (!ownsLive(ownerId, id)) return null;
      const row = portraitById.get(id) as
        | { rev: string; content_type: string; data: Uint8Array }
        | undefined;
      if (!row) return null;
      return { rev: row.rev, contentType: row.content_type, bytes: new Uint8Array(row.data) };
    },

    async deleteOwnerData(ownerId) {
      await outsideTransaction();
      db.exec('SAVEPOINT delete_owner');
      try {
        deleteOwnedPortraits.run(ownerId);
        deleteOwnedCharacters.run(ownerId);
        db.exec('RELEASE delete_owner');
      } catch (error) {
        db.exec('ROLLBACK TO delete_owner; RELEASE delete_owner');
        throw error;
      }
    },

    async markUserDeleted(userId, now) {
      await outsideTransaction();
      insertDeletedUser.run(userId, now);
    },

    async isUserDeleted(userId) {
      await outsideTransaction();
      return deletedUser.get(userId) !== undefined;
    },
  };
}
