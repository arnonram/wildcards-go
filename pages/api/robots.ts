import type { NextApiRequest, NextApiResponse } from 'next';
import { robotsTxt } from '../../server/search-indexing';

/** Served at /robots.txt (see the rewrite in next.config.js). */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(robotsTxt(process.env));
}
