import type { NextApiRequest, NextApiResponse } from 'next';
import { CHARACTER_ID } from '../../../../dtos/sync';
import { respondWithApiError } from '../../../../helpers/api-error';
import { connectToDb } from '../../../../helpers/db-util';
import { getPortrait, putPortrait } from '../../../../server/character-store';

const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024;

export const config = { api: { bodyParser: false } };

/** Read the raw body, or null once it passes the size limit. */
async function readBody(req: NextApiRequest): Promise<Uint8Array | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PORTRAIT_BYTES) return null;
    chunks.push(chunk);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !CHARACTER_ID.test(id)) {
    res.status(400).json({ message: `Invalid character id: ${id}` });
    return;
  }

  try {
    switch (req.method) {
      case 'GET': {
        const { db } = await connectToDb();
        const portrait = await getPortrait(db, id);
        if (!portrait) {
          res.status(404).json({ message: 'No portrait' });
          return;
        }
        res.setHeader('Content-Type', portrait.contentType);
        res.setHeader('X-Portrait-Rev', portrait.rev);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(Buffer.from(portrait.bytes));
        return;
      }
      case 'PUT': {
        const rev = Array.isArray(req.query.rev) ? req.query.rev[0] : req.query.rev;
        const contentType = req.headers['content-type'] ?? '';
        if (!rev || !contentType.startsWith('image/')) {
          res.status(400).json({ message: 'Expected an image body and a rev query parameter' });
          return;
        }
        const bytes = await readBody(req);
        if (!bytes) {
          res.status(413).json({ message: 'Portrait is larger than 2 MiB' });
          return;
        }
        const { db } = await connectToDb();
        if (!(await putPortrait(db, id, rev, contentType, bytes))) {
          res.status(404).json({ message: 'No such character' });
          return;
        }
        res.status(204).end();
        return;
      }
      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    respondWithApiError(res, error, `${req.method} /api/characters/${id}/portrait`);
  }
}
