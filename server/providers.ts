/**
 * Kept apart from `server/auth` so the sign-in page and `/api/providers` can
 * read it without loading Better Auth and the MongoDB driver.
 */

/** A provider is on only when both its id and secret are configured. */
export function enabledProviders() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    discord: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  };
}

export type Providers = ReturnType<typeof enabledProviders>;
