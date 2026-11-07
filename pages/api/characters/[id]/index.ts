import type { NextApiRequest, NextApiResponse } from 'next';
import { CHARACTER_ID } from '../../../../dtos/sync';
import { respondWithApiError } from '../../../../helpers/api-error';
import { getBackend } from '../../../../server/backend';
import { parsePutBody } from '../../../../server/parse-put-body';
import { authorize } from '../../../../server/session';

/** A character is a few KB; anything near this is not a character. */
export const config = { api: { bodyParser: { sizeLimit: '256kb' } } };

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

  const body = parsePutBody(req.body);
  if (!body) {
    res.status(400).json({ message: 'Expected { baseVersion, deleted, data }' });
    return;
  }

  try {
    const ownerId = await authorize(req, res);
    if (!ownerId) return;
    const { store } = await getBackend();
    const result = await store.putCharacter(ownerId, id, body, Date.now());
    if ('ok' in result) {
      res.status(200).json(result.ok);
    } else if ('notFound' in result) {
      res.status(404).json({ message: 'No such character' });
    } else if ('overQuota' in result) {
      // Clients treat any other 4xx as a rejection of this one character.
      res.status(413).json({ message: 'Character limit reached for this account' });
    } else {
      res.status(409).json({ server: result.conflict });
    }
  } catch (error) {
    respondWithApiError(res, error, `PUT /api/characters/${id}`);
  }
}
