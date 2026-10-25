import { omit } from 'lodash';
import { Binary, type Db, MongoServerError } from 'mongodb';
import type { PullResponse, PutCharacterBody, PutCharacterOk, ServerCharacter } from '../dtos/sync';
import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';

interface CharacterDoc {
  _id: string;
  version: number;
  modifiedAt: number;
  deleted: boolean;
  /** Absent on tombstones. */
  data?: WildCardCharacter;
}

interface PortraitDoc {
  _id: string;
  rev: string;
  contentType: string;
  data: Binary;
}

const DUPLICATE_KEY = 11000;

function characters(db: Db) {
  return db.collection<CharacterDoc>('characters');
}

/** Every pull filters on `modifiedAt`. Idempotent, so safe on each connect. */
export async function ensureIndexes(db: Db): Promise<void> {
  await characters(db).createIndex({ modifiedAt: 1 });
}

function toServerCharacter(doc: CharacterDoc): ServerCharacter {
  const base = { id: doc._id, version: doc.version, modifiedAt: doc.modifiedAt };
  if (doc.deleted || !doc.data) return { ...base, deleted: true };
  return { ...base, deleted: false, data: { ...doc.data, _id: doc._id } };
}

async function currentCopy(db: Db, id: string) {
  const doc = await characters(db).findOne({ _id: id });
  return doc ? toServerCharacter(doc) : null;
}

/**
 * Write a character only if the client saw the latest version. Anything else
 * is a conflict, answered with the server's copy so the client can resolve it.
 */
export async function putCharacter(
  db: Db,
  id: string,
  body: PutCharacterBody,
  now: number,
): Promise<{ ok: PutCharacterOk } | { conflict: ServerCharacter | null }> {
  // Tombstones drop the data: no device needs it once the character is gone.
  const data = body.deleted ? undefined : (omit(body.data, '_id') as WildCardCharacter);

  const result = await writeCharacter(db, id, body, data, now);
  if ('ok' in result && body.deleted) {
    await db.collection<PortraitDoc>('portraits').deleteOne({ _id: id });
  }
  return result;
}

/** The versioned write itself; putCharacter adds the portrait cleanup. */
async function writeCharacter(
  db: Db,
  id: string,
  body: PutCharacterBody,
  data: WildCardCharacter | undefined,
  now: number,
): Promise<{ ok: PutCharacterOk } | { conflict: ServerCharacter | null }> {
  if (body.baseVersion === 0) {
    try {
      await characters(db).insertOne({
        _id: id,
        version: 1,
        modifiedAt: now,
        deleted: body.deleted,
        ...(data && { data }),
      });
      return { ok: { version: 1, modifiedAt: now } };
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
        return { conflict: await currentCopy(db, id) };
      }
      throw error;
    }
  }

  const result = await characters(db).updateOne(
    { _id: id, version: body.baseVersion },
    data
      ? { $set: { data, deleted: false, modifiedAt: now }, $inc: { version: 1 } }
      : { $set: { deleted: true, modifiedAt: now }, $unset: { data: '' }, $inc: { version: 1 } },
  );
  if (result.matchedCount === 0) {
    return { conflict: await currentCopy(db, id) };
  }
  return { ok: { version: body.baseVersion + 1, modifiedAt: now } };
}

/**
 * How far the pull cursor trails server time. `modifiedAt` is stamped before
 * the write commits, so a slow write can land below a cursor already handed
 * out; trailing re-sends recent rows instead of skipping them.
 */
export const CURSOR_LAG_MS = 30_000;

/**
 * Characters written at or after `since`. Equal timestamps are included so
 * two writes in the same millisecond are never skipped; applying a row twice
 * on the client is harmless. The cursor trails `now` by CURSOR_LAG_MS and
 * never moves backwards.
 */
export async function listChangedSince(db: Db, since: number, now: number): Promise<PullResponse> {
  const docs = await characters(db)
    .find({ modifiedAt: { $gte: since } })
    .toArray();
  const maxSeen = docs.reduce((max, doc) => Math.max(max, doc.modifiedAt), since);
  const cursor = Math.max(since, Math.min(maxSeen, now - CURSOR_LAG_MS));
  return { characters: docs.map(toServerCharacter), cursor };
}

/**
 * Portraits live apart from the character so edits never re-send image bytes.
 * Returns false, writing nothing, when the character is missing or deleted, so
 * a late upload cannot leave an orphan. A delete landing between the check and
 * the write can still leave one; that race is rare and harmless.
 */
export async function putPortrait(
  db: Db,
  id: string,
  rev: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<boolean> {
  const live = await characters(db).findOne(
    { _id: id, deleted: false },
    { projection: { _id: 1 } },
  );
  if (!live) return false;
  await db
    .collection<PortraitDoc>('portraits')
    .replaceOne({ _id: id }, { rev, contentType, data: new Binary(bytes) }, { upsert: true });
  return true;
}

export async function getPortrait(
  db: Db,
  id: string,
): Promise<{ rev: string; contentType: string; bytes: Uint8Array } | null> {
  const doc = await db.collection<PortraitDoc>('portraits').findOne({ _id: id });
  if (!doc) return null;
  return {
    rev: doc.rev,
    contentType: doc.contentType,
    bytes: doc.data.buffer.subarray(0, doc.data.position),
  };
}
