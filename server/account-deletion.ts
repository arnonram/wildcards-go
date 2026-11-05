import type { BetterAuthPlugin, StandardSchemaV1 } from 'better-auth';
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
  deleteUserCallback,
  getSessionFromCtx,
  sessionMiddleware,
} from 'better-auth/api';
import { generateRandomString } from 'better-auth/crypto';

/** How recent a sign-in must be to delete an account with no password or email. */
export const RECENT_SIGN_IN_MS = 5 * 60_000;

export type DeletionMethod = 'email' | 'password' | 'recent-sign-in';

/**
 * How an account confirms its own deletion. A password account always uses
 * its password: it has no real email to send a link to. Others get the
 * emailed link when email is on, as on the hosted site, and otherwise must
 * have signed in within the last few minutes.
 */
export function deletionMethod(account: {
  hasPassword: boolean;
  emailEnabled: boolean;
}): DeletionMethod {
  if (account.hasPassword) return 'password';
  return account.emailEnabled ? 'email' : 'recent-sign-in';
}

type DeleteBody = { password?: string };

/** `{ password?: string }`, as a Standard Schema so Better Auth validates and types it. */
const deleteBody: StandardSchemaV1<DeleteBody> = {
  '~standard': {
    version: 1,
    vendor: 'wcg',
    validate(value) {
      const password = (value as DeleteBody | null | undefined)?.password;
      if (password !== undefined && typeof password !== 'string') {
        return { issues: [{ message: 'password must be a string', path: ['password'] }] };
      }
      return { value: password === undefined ? {} : { password } };
    },
  },
};

type Context = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

async function credentialPassword(ctx: Context, userId: string): Promise<string | null> {
  const account = await ctx.context.internalAdapter.findCredentialAccount(userId);
  return account?.password ?? null;
}

/**
 * `POST /account/delete` confirms by password or a recent sign-in, then runs
 * Better Auth's own token deletion, so app data, the user and the
 * deleted-account marker go in the one order `user.deleteUser` defines.
 * Better Auth's `/delete-user` is limited to the emailed-link flow it serves.
 */
export function accountDeletion({ emailEnabled }: { emailEnabled: boolean }) {
  const methodFor = async (ctx: Context, userId: string) =>
    deletionMethod({ hasPassword: (await credentialPassword(ctx, userId)) !== null, emailEnabled });

  return {
    id: 'wcg-account-deletion',
    endpoints: {
      accountDeletionMethod: createAuthEndpoint(
        '/account/deletion-method',
        { method: 'GET', use: [sessionMiddleware] },
        async (ctx) => ctx.json({ method: await methodFor(ctx, ctx.context.session.user.id) }),
      ),
      deleteAccount: createAuthEndpoint(
        '/account/delete',
        { method: 'POST', use: [sessionMiddleware], body: deleteBody },
        async (ctx) => {
          const { user, session } = ctx.context.session;
          const hash = await credentialPassword(ctx, user.id);
          const method = deletionMethod({ hasPassword: hash !== null, emailEnabled });

          if (method === 'email') {
            throw new APIError('FORBIDDEN', {
              code: 'USE_EMAIL_LINK',
              message: 'This account confirms deletion by email.',
            });
          }
          if (method === 'password') {
            const { password } = ctx.body;
            const valid =
              password !== undefined &&
              hash !== null &&
              (await ctx.context.password.verify({ hash, password }));
            if (!valid) {
              throw new APIError('BAD_REQUEST', {
                code: 'INVALID_PASSWORD',
                message: 'That password is not right.',
              });
            }
          }
          if (
            method === 'recent-sign-in' &&
            Date.now() - new Date(session.createdAt).getTime() > RECENT_SIGN_IN_MS
          ) {
            throw new APIError('FORBIDDEN', {
              code: 'SIGN_IN_AGAIN',
              message: 'Sign in again, then delete within 5 minutes.',
            });
          }

          const token = generateRandomString(32, 'a-z', '0-9');
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `delete-account-${token}`,
            value: user.id,
            expiresAt: new Date(Date.now() + 60_000),
          });
          await deleteUserCallback({ ...ctx, method: 'GET', body: undefined, query: { token } });
          return ctx.json({ result: 'deleted' as const });
        },
      ),
    },
    // As strict as sign-in: the password is the only thing standing between a
    // stolen session and deleting the account.
    rateLimit: [{ pathMatcher: (path) => path === '/account/delete', window: 60, max: 5 }],
    hooks: {
      before: [
        {
          // Without a token, `/delete-user` would email a link (useless to a
          // placeholder address) or, with email off, delete any session under
          // a day old with no password. Only the emailed-link flow may use it.
          matcher: (ctx) => ctx.path === '/delete-user',
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.body?.token) return;
            const session = await getSessionFromCtx(ctx);
            if (session && (await methodFor(ctx, session.user.id)) === 'email') return;
            throw new APIError('FORBIDDEN', {
              code: 'USE_ACCOUNT_DELETE',
              message: 'Delete this account from the account menu.',
            });
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
