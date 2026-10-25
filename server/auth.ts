import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import type { Db } from 'mongodb';
import { connectToDb } from '../helpers/db-util';
import { sendSignInEmail } from './email';

const DAY = 60 * 60 * 24;

/** A provider is on only when both its id and secret are configured. */
export function enabledProviders() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    discord: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  };
}

function buildAuth(db: Db) {
  const enabled = enabledProviders();
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // Standalone MongoDB has no transactions, so no `client` option.
    database: mongodbAdapter(db),
    // Long and rolling, so offline play at the table never logs anyone out.
    // No cookie cache: revoking a session takes effect at once.
    session: { expiresIn: 30 * DAY, updateAge: DAY },
    socialProviders: {
      ...(enabled.google && {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }),
      ...(enabled.discord && {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID as string,
          clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
        },
      }),
    },
    // Linking needs a verified email. `trustedProviders` would skip that check
    // and let an unverified Discord email take over an account.
    account: { accountLinking: { enabled: true } },
    plugins: [magicLink({ sendMagicLink: ({ email, url }) => sendSignInEmail(email, url) })],
  });
}

export type Auth = ReturnType<typeof buildAuth>;

const cache = globalThis as typeof globalThis & { __wcgAuth?: Promise<Auth> };

/** One instance on the shared connection; a failed build is retried next call. */
export function getAuth(): Promise<Auth> {
  cache.__wcgAuth ??= connectToDb()
    .then(({ db }) => buildAuth(db))
    .catch((error) => {
      cache.__wcgAuth = undefined;
      throw error;
    });
  return cache.__wcgAuth;
}
