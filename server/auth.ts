import path from 'node:path';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { getMigrations } from 'better-auth/db/migration';
import { magicLink, username } from 'better-auth/plugins';
import { SIGN_UP_REFUSALS } from '../helpers/invite-cookie';
import { accountDeletion } from './account-deletion';
import { resolveAuthSecret } from './auth-secret';
import { type Backend, getBackend } from './backend';
import { deleteAccountEmail, sendEmail, signInEmail } from './email';
import type { Env } from './env';
import { placeholderEmail, signUpRefusal } from './invite';
import { signInOptions } from './sign-in-options';
import { vercelPreviewBaseURL } from './vercel-preview';

const DAY = 60 * 60 * 24;

type ValidateUserInfo = NonNullable<NonNullable<BetterAuthOptions['user']>['validateUserInfo']>;

/**
 * The emailed link opens an app page rather than Better Auth's bare callback,
 * which answers JSON errors and needs the session in whatever browser the
 * mail client picks. The page explains, offers sign-in, then confirms.
 */
export function deleteAccountPageUrl(callbackUrl: string, token: string): string {
  return new URL(`/delete-account?token=${encodeURIComponent(token)}`, callbackUrl).toString();
}

/**
 * Better Auth's configuration on either backend. SQLite hands Better Auth the
 * same `DatabaseSync` the character store uses, so one file holds everything.
 */
export function buildAuthOptions(backend: Backend, env: Env) {
  const { store } = backend;
  const enabled = signInOptions(env);
  const refusal = (cookieHeader: string | null | undefined) =>
    signUpRefusal(enabled.signUp, env.SIGNUP_INVITE_CODE, cookieHeader);
  return {
    baseURL: vercelPreviewBaseURL(env) ?? env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    // Standalone MongoDB has no transactions, so no `client` option.
    database: backend.kind === 'mongo' ? mongodbAdapter(backend.db) : backend.db,
    // Counters in the database, shared by every serverless instance; in memory
    // each instance would count alone. The limiter only runs in production, as
    // Better Auth's default, but read from the env given here.
    rateLimit: { storage: 'database', enabled: env.NODE_ENV === 'production' },
    // Long and rolling, so offline play at the table never logs anyone out.
    // No cookie cache: revoking a session takes effect at once.
    session: { expiresIn: 30 * DAY, updateAge: DAY },
    socialProviders: {
      ...(enabled.google && {
        google: {
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        },
      }),
      ...(enabled.discord && {
        discord: {
          clientId: env.DISCORD_CLIENT_ID as string,
          clientSecret: env.DISCORD_CLIENT_SECRET as string,
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
    // Deleting is confirmed by an emailed link opened where the account is
    // signed in, or (see account-deletion.ts) by password or a recent sign-in.
    // App data goes first, so a failure never leaves orphaned characters;
    // the deleted id is recorded last, so devices only wipe once it's done.
    user: {
      // Every way of creating an account passes here: OAuth, password, and
      // email links (whose gate is at send time, below, since the link may be
      // opened in another browser). Existing users sign in as before. Open
      // sign-up (the hosted site) needs no gate, so none is set.
      ...(enabled.signUp !== 'open' && {
        validateUserInfo: (({ source }, ctx) => {
          if (source.action !== 'create-user') return;
          if (source.method === 'magic-link' || source.method === 'admin') return;
          const code = refusal(ctx.headers?.get('cookie'));
          return code && { error: code, errorDescription: SIGN_UP_REFUSALS[code] };
        }) satisfies ValidateUserInfo,
      }),
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        sendDeleteAccountVerification: enabled.email
          ? ({ user, url, token }) =>
              sendEmail(deleteAccountEmail(user.email, deleteAccountPageUrl(url, token)))
          : undefined,
        beforeDelete: (user) => store.deleteOwnerData(user.id),
        afterDelete: (user) => store.markUserDeleted(user.id, Date.now()),
      },
    },
    // Linking needs a verified email. `trustedProviders` would skip that check
    // and let an unverified Discord email take over an account.
    account: { accountLinking: { enabled: true } },
    // A refused OAuth sign-up lands back on the sign-in page, which explains
    // it. Open sign-up (the hosted site) keeps Better Auth's own error page.
    ...(enabled.signUp !== 'open' && { onAPIError: { errorURL: '/sign-in' } }),
    // Password accounts sign up with a username only; the email Better Auth
    // requires is a placeholder, so no real address is ever claimed or linked.
    ...(enabled.password && {
      emailAndPassword: { enabled: true, minPasswordLength: enabled.passwordMinLength },
    }),
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email' && enabled.password) {
          const name = ctx.body?.username;
          if (typeof name !== 'string' || !name) {
            throw new APIError('BAD_REQUEST', { message: 'Username is required' });
          }
          return {
            context: { body: { ...ctx.body, email: placeholderEmail(name), name } },
          };
        }
        // An email link to a new address would create an account on opening,
        // so the invite is checked here, in the browser asking for it.
        if (ctx.path === '/sign-in/magic-link') {
          const code = refusal(ctx.headers?.get('cookie'));
          if (!code) return;
          const email = String(ctx.body?.email ?? '').toLowerCase();
          if (await ctx.context.internalAdapter.findUserByEmail(email)) return;
          throw new APIError('FORBIDDEN', { code, message: SIGN_UP_REFUSALS[code] });
        }
      }),
    },
    plugins: [
      // Email links exist only when email can be sent.
      ...(enabled.email
        ? [
            magicLink({
              // Store only a hash, so a database leak exposes no usable sign-in link.
              storeToken: 'hashed',
              sendMagicLink: ({ email, url }) => sendEmail(signInEmail(email, url)),
            }),
          ]
        : []),
      ...(enabled.password ? [username()] : []),
      // On the hosted site (email on, no passwords) it answers `email` and lets
      // the emailed-link flow through unchanged.
      accountDeletion({ emailEnabled: enabled.email }),
    ],
  } satisfies BetterAuthOptions;
}

function createAuth(options: ReturnType<typeof buildAuthOptions>) {
  return betterAuth(options);
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * SQLite installs get Better Auth's tables created, and later upgraded, at
 * start, so a host never runs a migration by hand. A self-hoster who sets no
 * secret gets one generated beside the database. MongoDB needs neither, and
 * the hosted site keeps its configured secret.
 */
async function startAuth(backend: Backend): Promise<Auth> {
  if (backend.kind === 'mongo') return createAuth(buildAuthOptions(backend, process.env));
  const secret = resolveAuthSecret(process.env, path.dirname(backend.path));
  const options = buildAuthOptions(backend, { ...process.env, BETTER_AUTH_SECRET: secret });
  await (await getMigrations(options)).runMigrations();
  return createAuth(options);
}

// Module scope, not globalThis: a hot reload rebuilds the instance so config
// edits apply, while the database connection underneath stays shared.
let auth: Promise<Auth> | undefined;

/** One instance on the shared connection; a failed build is retried next call. */
export function getAuth(): Promise<Auth> {
  auth ??= getBackend()
    .then(startAuth)
    .catch((error) => {
      auth = undefined;
      throw error;
    });
  return auth;
}
