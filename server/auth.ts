import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import type { Db } from 'mongodb';
import { connectToDb } from '../helpers/db-util';
import { deleteOwnerData, markUserDeleted } from './character-store';
import { deleteAccountEmail, sendEmail, signInEmail } from './email';

const DAY = 60 * 60 * 24;

/** A provider is on only when both its id and secret are configured. */
export function enabledProviders() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    discord: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  };
}

/**
 * The emailed link opens an app page rather than Better Auth's bare callback,
 * which answers JSON errors and needs the session in whatever browser the
 * mail client picks. The page explains, offers sign-in, then confirms.
 */
export function deleteAccountPageUrl(callbackUrl: string, token: string): string {
  return new URL(`/delete-account?token=${encodeURIComponent(token)}`, callbackUrl).toString();
}

function buildAuth(db: Db) {
  const enabled = enabledProviders();
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // Standalone MongoDB has no transactions, so no `client` option.
    database: mongodbAdapter(db),
    // Counters in MongoDB, shared by every serverless instance; in memory each
    // instance would count alone. The limiter itself only runs in production.
    rateLimit: { storage: 'database' },
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
    // Don't keep sign-in IPs or browsers: nothing uses them, and they are
    // personal data. (`disableIpTracking` would also switch off rate limiting,
    // which reads the IP from each request without storing it.)
    databaseHooks: {
      session: {
        create: {
          before: async (session) => ({ data: { ...session, ipAddress: '', userAgent: '' } }),
        },
      },
    },
    // Deleting needs a link sent by email, opened where the account is signed
    // in. App data goes first, so a failure never leaves orphaned characters;
    // the deleted id is recorded last, so devices only wipe once it's done.
    user: {
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        sendDeleteAccountVerification: ({ user, url, token }) =>
          sendEmail(deleteAccountEmail(user.email, deleteAccountPageUrl(url, token))),
        beforeDelete: (user) => deleteOwnerData(db, user.id),
        afterDelete: (user) => markUserDeleted(db, user.id, Date.now()),
      },
    },
    // Linking needs a verified email. `trustedProviders` would skip that check
    // and let an unverified Discord email take over an account.
    account: { accountLinking: { enabled: true } },
    plugins: [
      magicLink({
        // Store only a hash, so a database leak exposes no usable sign-in link.
        storeToken: 'hashed',
        sendMagicLink: ({ email, url }) => sendEmail(signInEmail(email, url)),
      }),
    ],
  });
}

export type Auth = ReturnType<typeof buildAuth>;

// Module scope, not globalThis: a hot reload rebuilds the instance so config
// edits apply, while the MongoDB connection underneath stays shared.
let auth: Promise<Auth> | undefined;

/** One instance on the shared connection; a failed build is retried next call. */
export function getAuth(): Promise<Auth> {
  auth ??= connectToDb()
    .then(({ db }) => buildAuth(db))
    .catch((error) => {
      auth = undefined;
      throw error;
    });
  return auth;
}
