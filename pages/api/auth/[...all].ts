import { toNodeHandler } from 'better-auth/node';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '../../../server/auth';
import { clientIp } from '../../../server/client-ip';

// Better Auth parses the body itself.
export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Self-hosted, the rate limiter needs the real client, which Better Auth
  // can't see from headers alone (client-ip.ts). Vercel's edge sets the
  // header to the client itself.
  if (!process.env.VERCEL) {
    req.headers['x-forwarded-for'] = clientIp(
      req.headers['x-forwarded-for'],
      req.socket.remoteAddress,
    );
  }
  const auth = await getAuth();
  await toNodeHandler(auth.handler)(req, res);
}
