import { omit } from 'lodash';
import { type Db, MongoServerError } from 'mongodb';
import type { PullResponse, PutCharacterBody, PutCharacterOk, ServerCharacter } from '../dtos/sync';
import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';

interface CharacterDoc {
  _id: string;
  version: number;
  modifiedAt: number;
  deleted: boolean;
  data: WildCardCharacter;
}

const DUPLICATE_KEY = 11000;

function characters(db: Db) {
  return db.collection<CharacterDoc>('characters');
}

function toServerCharacter(doc: CharacterDoc): ServerCharacter {
  return {
    id: doc._id,
    version: doc.version,
    modifiedAt: doc.modifiedAt,
    deleted: doc.deleted,
    data: { ...doc.data, _id: doc._id },
  };
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
  const data = omit(body.data, '_id') as WildCardCharacter;

  if (body.baseVersion === 0) {
    try {
      await characters(db).insertOne({
        _id: id,
        version: 1,
        modifiedAt: now,
        deleted: body.deleted,
        data,
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
    { $set: { data, deleted: body.deleted, modifiedAt: now }, $inc: { version: 1 } },
  );
  if (result.matchedCount === 0) {
    return { conflict: await currentCopy(db, id) };
  }
  return { ok: { version: body.baseVersion + 1, modifiedAt: now } };
}

/**
 * Characters written at or after `since`. Equal timestamps are included so
 * two writes in the same millisecond are never skipped; applying a row twice
 * on the client is harmless.
 */
export async function listChangedSince(db: Db, since: number): Promise<PullResponse> {
  const docs = await characters(db)
    .find({ modifiedAt: { $gte: since } })
    .toArray();
  const cursor = docs.reduce((max, doc) => Math.max(max, doc.modifiedAt), since);
  return { characters: docs.map(toServerCharacter), cursor };
}
