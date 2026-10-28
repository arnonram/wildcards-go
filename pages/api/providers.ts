import type { NextApiRequest, NextApiResponse } from 'next';
import { enabledProviders } from '../../server/auth';

/** Which social sign-in buttons the sign-in page shows. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }
  res.status(200).json(enabledProviders());
}
