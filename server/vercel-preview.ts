import type { Env } from './env';

/**
 * Vercel only. A preview deployment runs on generated addresses, not
 * BETTER_AUTH_URL, so it accepts requests from exactly its own hostnames
 * (never `*.vercel.app`, which would trust every Vercel app). Undefined
 * anywhere else, including production and self-hosted servers. Leaving Vercel
 * means deleting this file and its one use in `server/auth.ts`.
 */
export function vercelPreviewBaseURL(env: Env) {
  if (env.VERCEL_ENV !== 'preview') return undefined;
  const hosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter((host): host is string =>
    Boolean(host),
  );
  if (hosts.length === 0) return undefined;
  return { allowedHosts: hosts, protocol: 'https' as const, fallback: env.BETTER_AUTH_URL };
}
