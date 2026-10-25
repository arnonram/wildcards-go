import { toNodeHandler } from 'better-auth/node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '../../../server/auth';

// Better Auth parses the body itself.
export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await getAuth();
  await toNodeHandler(auth.handler)(req, res);
}
