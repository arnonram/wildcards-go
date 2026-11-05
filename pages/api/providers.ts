import type { NextApiRequest, NextApiResponse } from 'next';
import { signInOptions } from '../../server/sign-in-options';

/** Which sign-in methods the sign-in page offers, and whether sign-up is open. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }
  res.status(200).json(signInOptions(process.env));
}
