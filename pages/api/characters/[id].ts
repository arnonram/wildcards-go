import type { NextApiRequest, NextApiResponse } from 'next';
import type { PutCharacterBody } from '../../../dtos/sync';
import { respondWithApiError } from '../../../helpers/api-error';
import { connectToDb } from '../../../helpers/db-util';
import { putCharacter } from '../../../server/character-store';

export const CHARACTER_ID = /^[0-9a-f-]{36}$/;

function parseBody(body: unknown): PutCharacterBody | null {
  if (!body || typeof body !== 'object') return null;
  const { baseVersion, deleted, data } = body as Record<string, unknown>;
  if (!Number.isInteger(baseVersion) || (baseVersion as number) < 0) return null;
  if (typeof deleted !== 'boolean') return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return { baseVersion, deleted, data } as PutCharacterBody;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !CHARACTER_ID.test(id)) {
    res.status(400).json({ message: `Invalid character id: ${id}` });
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const body = parseBody(req.body);
  if (!body) {
    res.status(400).json({ message: 'Expected { baseVersion, deleted, data }' });
    return;
  }

  try {
    const { db } = await connectToDb();
    const result = await putCharacter(db, id, body, Date.now());
    if ('ok' in result) {
      res.status(200).json(result.ok);
    } else {
      res.status(409).json({ server: result.conflict });
    }
  } catch (error) {
    respondWithApiError(res, error, `PUT /api/characters/${id}`);
  }
}
