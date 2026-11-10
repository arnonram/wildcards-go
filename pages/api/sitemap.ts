import type { NextApiRequest, NextApiResponse } from 'next';
import { sitemapXml } from '../../server/search-indexing';

/** Served at /sitemap.xml (see the rewrite in next.config.js). */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const xml = sitemapXml(process.env);
  if (!xml) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(xml);
}
