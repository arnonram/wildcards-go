import type { NextApiRequest, NextApiResponse } from 'next';
import { CHARACTER_ID } from '../../../../dtos/sync';
import { respondWithApiError } from '../../../../helpers/api-error';
import { getBackend } from '../../../../server/backend';
import { authorize } from '../../../../server/session';
import { isPortraitType } from '../../../../server/store/types';

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

  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const ownerId = await authorize(req, res);
    if (!ownerId) return;

    switch (req.method) {
      case 'GET': {
        const { store } = await getBackend();
        const portrait = await store.getPortrait(ownerId, id);
        if (!portrait) {
          res.status(404).json({ message: 'No portrait' });
          return;
        }
        res.setHeader('Content-Type', portrait.contentType);
        res.setHeader('X-Portrait-Rev', portrait.rev);
        res.setHeader('Cache-Control', 'no-store');
        // Never let a browser treat the bytes as anything but an image.
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.status(200).send(Buffer.from(portrait.bytes));
        return;
      }
      case 'PUT': {
        const rev = Array.isArray(req.query.rev) ? req.query.rev[0] : req.query.rev;
        const contentType = req.headers['content-type'] ?? '';
        if (!rev) {
          res.status(400).json({ message: 'Expected a rev query parameter' });
          return;
        }
        if (!isPortraitType(contentType)) {
          res.status(415).json({ message: 'Portrait must be JPEG, PNG or WebP' });
          return;
        }
        const bytes = await readBody(req);
        if (!bytes) {
          res.status(413).json({ message: 'Portrait is larger than 2 MiB' });
          return;
        }
        const { store } = await getBackend();
        if (!(await store.putPortrait(ownerId, id, rev, contentType, bytes))) {
          res.status(404).json({ message: 'No such character' });
          return;
        }
        res.status(204).end();
        return;
      }
    }
  } catch (error) {
    respondWithApiError(res, error, `${req.method} /api/characters/${id}/portrait`);
  }
}
