import type { NextApiRequest, NextApiResponse } from 'next';
import { STORE_OWNER_HEADER } from '../dtos/sync';

export type SessionLookup = (req: NextApiRequest) => Promise<string | null>;

const sessionUserId: SessionLookup = async (req) => {
  const [{ fromNodeHeaders }, { getAuth }] = await Promise.all([
    import('better-auth/node'),
    import('./auth'),
  ]);
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user.id ?? null;
};

/**
 * The owner a character request acts for, or null after answering 401. The
 * client names the store it syncs from; it must be the signed-in user, so a
 * tab still showing another account's store can never upload into this one.
 */
export async function authorize(
  req: NextApiRequest,
  res: NextApiResponse,
  lookup: SessionLookup = sessionUserId,
): Promise<string | null> {
  const userId = await lookup(req);
  const storeOwner = req.headers[STORE_OWNER_HEADER.toLowerCase()];
  if (!userId || storeOwner !== userId) {
    res.status(401).json({ message: 'Sign in to sync' });
    return null;
  }
  return userId;
}
