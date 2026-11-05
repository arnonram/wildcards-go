import type { NextApiRequest, NextApiResponse } from 'next';
import { STORE_OWNER_HEADER } from '../dtos/sync';

export type SessionLookup = (req: NextApiRequest) => Promise<string | null>;
export type DeletedLookup = (userId: string) => Promise<boolean>;

const userDeleted: DeletedLookup = async (userId) => {
  const { getBackend } = await import('./backend');
  return (await getBackend()).store.isUserDeleted(userId);
};

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
 * A store whose account was deleted gets 410, so the device can wipe it.
 */
export async function authorize(
  req: NextApiRequest,
  res: NextApiResponse,
  lookup: SessionLookup = sessionUserId,
  deleted: DeletedLookup = userDeleted,
): Promise<string | null> {
  const userId = await lookup(req);
  const storeOwner = req.headers[STORE_OWNER_HEADER.toLowerCase()];
  if (!userId || storeOwner !== userId) {
    if (typeof storeOwner === 'string' && storeOwner && (await deleted(storeOwner))) {
      res.status(410).json({ message: 'Account deleted' });
      return null;
    }
    res.status(401).json({ message: 'Sign in to sync' });
    return null;
  }
  return userId;
}
