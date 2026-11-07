import { Binary, type Db, MongoServerError } from 'mongodb';
import type { PutCharacterBody, ServerCharacter } from '../../dtos/sync';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import {
  type CharacterStore,
  nextCursor,
  type PutResult,
  STORE_LIMITS,
  type StoreLimits,
} from './types';

interface CharacterDoc {
  _id: string;
  /** Better Auth user id; set on create and never changed. */
  ownerId: string;
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

interface DeletedUserDoc {
  _id: string;
  deletedAt: Date;
}

const DUPLICATE_KEY = 11000;

/** Every pull filters on owner and `modifiedAt`. Idempotent, so safe on each connect. */
export async function ensureMongoIndexes(db: Db): Promise<void> {
  await db.collection<CharacterDoc>('characters').createIndex({ ownerId: 1, modifiedAt: 1 });
}

function toServerCharacter(doc: CharacterDoc): ServerCharacter {
  const base = { id: doc._id, version: doc.version, modifiedAt: doc.modifiedAt };
  if (doc.deleted || !doc.data) return { ...base, deleted: true };
  return { ...base, deleted: false, data: { ...doc.data, _id: doc._id } };
}

/** The hosted store. Document shapes are what production already holds. */
export function createMongoStore(
  db: Db,
  { limits = STORE_LIMITS }: { limits?: StoreLimits } = {},
): CharacterStore {
  const characters = db.collection<CharacterDoc>('characters');
  const portraits = db.collection<PortraitDoc>('portraits');
  const deletedUsers = db.collection<DeletedUserDoc>('deletedUsers');

  /** Why a write matched nothing. */
  async function rejection(ownerId: string, id: string): Promise<PutResult> {
    const doc = await characters.findOne({ _id: id });
    if (!doc) return { conflict: null };
    if (doc.ownerId !== ownerId) return { notFound: true };
    return { conflict: toServerCharacter(doc) };
  }

  async function ownsLive(ownerId: string, id: string) {
    const doc = await characters.findOne(
      { _id: id, ownerId, deleted: false },
      { projection: { _id: 1 } },
    );
    return doc !== null;
  }

  /** Does the owner already have as many live characters as allowed? */
  async function atCharacterLimit(ownerId: string) {
    return (await characters.countDocuments({ ownerId, deleted: false })) >= limits.characters;
  }

  /** Bytes of the owner's portraits, leaving out the one about to be replaced. */
  async function portraitBytes(ownerId: string, exceptId: string) {
    const owned = await characters
      .find({ ownerId, deleted: false, _id: { $ne: exceptId } }, { projection: { _id: 1 } })
      .toArray();
    const [total] = await portraits
      .aggregate<{ bytes: number }>([
        { $match: { _id: { $in: owned.map((doc) => doc._id) } } },
        { $group: { _id: null, bytes: { $sum: { $binarySize: '$data' } } } },
      ])
      .toArray();
    return total?.bytes ?? 0;
  }

  async function writeCharacter(
    ownerId: string,
    id: string,
    body: PutCharacterBody,
    data: WildCardCharacter | undefined,
    now: number,
  ): Promise<PutResult> {
    if (body.baseVersion === 0) {
      // At the limit, only a create that would otherwise succeed is refused.
      if (data && (await atCharacterLimit(ownerId))) {
        if (await characters.findOne({ _id: id }, { projection: { _id: 1 } })) {
          return rejection(ownerId, id);
        }
        return { overQuota: true };
      }
      try {
        await characters.insertOne({
          _id: id,
          ownerId,
          version: 1,
          modifiedAt: now,
          deleted: body.deleted,
          ...(data && { data }),
        });
        return { ok: { version: 1, modifiedAt: now } };
      } catch (error) {
        if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
          return rejection(ownerId, id);
        }
        throw error;
      }
    }

    const filter = { _id: id, ownerId, version: body.baseVersion };
    const ok = { ok: { version: body.baseVersion + 1, modifiedAt: now } };
    if (!data) {
      const result = await characters.updateOne(filter, {
        $set: { deleted: true, modifiedAt: now },
        $unset: { data: '' },
        $inc: { version: 1 },
      });
      return result.matchedCount === 0 ? rejection(ownerId, id) : ok;
    }

    const write = { $set: { data, deleted: false, modifiedAt: now }, $inc: { version: 1 } };
    // An edit of a live character, the usual case: one round trip.
    if ((await characters.updateOne({ ...filter, deleted: false }, write)).matchedCount > 0) {
      return ok;
    }
    // Otherwise it restores a tombstone, which adds a live character.
    if (!(await characters.findOne(filter, { projection: { _id: 1 } }))) {
      return rejection(ownerId, id);
    }
    if (await atCharacterLimit(ownerId)) return { overQuota: true };
    const restored = await characters.updateOne(filter, write);
    return restored.matchedCount === 0 ? rejection(ownerId, id) : ok;
  }

  return {
    async putCharacter(ownerId, id, body, now) {
      // Tombstones drop the data: no device needs it once the character is gone.
      const { _id, ...rest } = body.data;
      const data = body.deleted ? undefined : rest;
      const result = await writeCharacter(ownerId, id, body, data, now);
      if ('ok' in result && body.deleted) await portraits.deleteOne({ _id: id });
      return result;
    },

    async listChangedSince(ownerId, since, now) {
      const docs = await characters.find({ ownerId, modifiedAt: { $gte: since } }).toArray();
      return {
        characters: docs.map(toServerCharacter),
        cursor: nextCursor(
          docs.map((doc) => doc.modifiedAt),
          since,
          now,
        ),
      };
    },

    // A delete landing between the ownership check and the write can still
    // leave an orphan; that race is rare and harmless.
    async putPortrait(ownerId, id, rev, contentType, bytes) {
      if (!(await ownsLive(ownerId, id))) return 'notFound';
      if ((await portraitBytes(ownerId, id)) + bytes.length > limits.portraitBytes) {
        return 'overQuota';
      }
      await portraits.replaceOne(
        { _id: id },
        { rev, contentType, data: new Binary(bytes) },
        { upsert: true },
      );
      return 'ok';
    },

    async getPortrait(ownerId, id) {
      if (!(await ownsLive(ownerId, id))) return null;
      const doc = await portraits.findOne({ _id: id });
      if (!doc) return null;
      return {
        rev: doc.rev,
        contentType: doc.contentType,
        bytes: doc.data.buffer.subarray(0, doc.data.position),
      };
    },

    async deleteOwnerData(ownerId) {
      const owned = await characters.find({ ownerId }, { projection: { _id: 1 } }).toArray();
      await portraits.deleteMany({ _id: { $in: owned.map((doc) => doc._id) } });
      await characters.deleteMany({ ownerId });
    },

    async markUserDeleted(userId, now) {
      await deletedUsers.updateOne(
        { _id: userId },
        { $setOnInsert: { deletedAt: new Date(now) } },
        { upsert: true },
      );
    },

    async isUserDeleted(userId) {
      return (await deletedUsers.countDocuments({ _id: userId })) > 0;
    },
  };
}
