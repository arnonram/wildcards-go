import type { NextApiRequest, NextApiResponse } from 'next';
import { respondWithApiError } from '../../../helpers/api-error';
import { connectToDb } from '../../../helpers/db-util';
import { listChangedSince } from '../../../server/character-store';
import { authorize } from '../../../server/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const rawSince = Array.isArray(req.query.since) ? req.query.since[0] : req.query.since;
  const since = rawSince === undefined ? 0 : Number(rawSince);
  if (!Number.isFinite(since) || since < 0) {
    res.status(400).json({ message: `Invalid since: ${rawSince}` });
    return;
  }

  try {
    const ownerId = await authorize(req, res);
    if (!ownerId) return;
    const { db } = await connectToDb();
    res.status(200).json(await listChangedSince(db, ownerId, since, Date.now()));
  } catch (error) {
    respondWithApiError(res, error, 'GET /api/characters');
  }
}
