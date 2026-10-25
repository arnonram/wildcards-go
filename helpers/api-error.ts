import type { NextApiResponse } from 'next';

const DATABASE_ERROR_NAMES = new Set([
  'MongoNetworkError',
  'MongoServerSelectionError',
  'MongoTimeoutError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
]);

function isDatabaseUnavailable(error: unknown) {
  return error instanceof Error && DATABASE_ERROR_NAMES.has(error.name);
}

/**
 * Connectivity failures are an expected part of offline mode: answer with 503
 * so the client keeps the change queued, without dumping a stack trace on every
 * retry. Anything else is a real bug and stays loud.
 */
export function respondWithApiError(res: NextApiResponse, error: unknown, context: string) {
  if (isDatabaseUnavailable(error)) {
    console.warn(`[${context}] MongoDB is unavailable; the client will use its offline state.`);
    res.status(503).json({ message: 'Database unavailable' });
    return;
  }

  console.error(`[${context}]`, error);
  res.status(500).json({ message: 'Internal server error' });
}
