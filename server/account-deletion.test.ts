import { expect, test } from 'bun:test';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { deletionMethod, RECENT_SIGN_IN_MS } from './account-deletion';
import { buildAuthOptions } from './auth';
import { openBackend } from './backend';
import type { Env } from './env';

test('a password account always confirms by password', () => {
  expect(deletionMethod({ hasPassword: true, emailEnabled: true })).toBe('password');
  expect(deletionMethod({ hasPassword: true, emailEnabled: false })).toBe('password');
});

test('other accounts use the email link when email is on, a recent sign-in otherwise', () => {
  expect(deletionMethod({ hasPassword: false, emailEnabled: true })).toBe('email');
  expect(deletionMethod({ hasPassword: false, emailEnabled: false })).toBe('recent-sign-in');
});

const BASE: Env = {
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
  AUTH_PASSWORD: '1',
  SIGNUP_OPEN: '1',
};
/** Production without SMTP: email sign-in and email deletion links are off. */
const NO_EMAIL: Env = { ...BASE, NODE_ENV: 'production' };
/** Development: email "sends" to the console, so email links are on. */
const WITH_EMAIL: Env = { ...BASE, NODE_ENV: 'development' };
const PASSWORD = 'correct horse 1';

/** A server with one signed-in password account, and that session's cookie. */
async function signedIn(env: Env) {
  const backend = await openBackend({ kind: 'sqlite', path: ':memory:' });
  if (backend.kind !== 'sqlite') throw new Error('expected sqlite');
  const options = buildAuthOptions(backend, env);
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  const { headers: setCookie, response } = await auth.api.signUpEmail({
    body: { username: 'ann', password: PASSWORD, email: '', name: 'ann' } as never,
    returnHeaders: true,
  });
  const cookie = (setCookie.get('set-cookie') ?? '').split(';')[0];
  const headers = new Headers({ cookie, origin: 'http://localhost:3000' });
  return { backend, db: backend.db, auth, headers, userId: response.user.id as string };
}

/** Turn the password account into one that signed in with Google. */
function makeOAuthAccount(db: Awaited<ReturnType<typeof signedIn>>['db']) {
  db.prepare("UPDATE account SET providerId = 'google', password = NULL").run();
}

function ageSession(db: Awaited<ReturnType<typeof signedIn>>['db'], ms: number) {
  db.prepare('UPDATE session SET createdAt = ?').run(new Date(Date.now() - ms).toISOString());
}

async function errorCode(call: Promise<unknown>): Promise<string | null> {
  try {
    await call;
    return null;
  } catch (error) {
    return (error as { body?: { code?: string } }).body?.code ?? (error as Error).message;
  }
}

async function seedCharacter(server: Awaited<ReturnType<typeof signedIn>>) {
  const id = crypto.randomUUID();
  const data = JSON.parse(JSON.stringify({ ...new WildCardCharacter('Ana'), _id: id }));
  await server.backend.store.putCharacter(
    server.userId,
    id,
    { baseVersion: 0, deleted: false, data },
    1,
  );
}

test('the deletion method reports what this account must do', async () => {
  const server = await signedIn(NO_EMAIL);
  expect(await server.auth.api.accountDeletionMethod({ headers: server.headers })).toEqual({
    method: 'password',
  });
});

test('password delete with a wrong password keeps the account', async () => {
  const server = await signedIn(NO_EMAIL);
  expect(
    await errorCode(
      server.auth.api.deleteAccount({ headers: server.headers, body: { password: 'nope' } }),
    ),
  ).toBe('INVALID_PASSWORD');
  expect(
    await errorCode(server.auth.api.deleteAccount({ headers: server.headers, body: {} })),
  ).toBe('INVALID_PASSWORD');
  expect(server.db.prepare('SELECT COUNT(*) AS n FROM user').get()).toEqual({ n: 1 });
});

test('password delete with the right password removes the user and their characters', async () => {
  const server = await signedIn(NO_EMAIL);
  await seedCharacter(server);
  expect(
    await server.auth.api.deleteAccount({ headers: server.headers, body: { password: PASSWORD } }),
  ).toEqual({ result: 'deleted' });
  expect(server.db.prepare('SELECT COUNT(*) AS n FROM user').get()).toEqual({ n: 0 });
  expect(server.db.prepare('SELECT COUNT(*) AS n FROM session').get()).toEqual({ n: 0 });
  expect(await server.backend.store.isUserDeleted(server.userId)).toBe(true);
  expect((await server.backend.store.listChangedSince(server.userId, 0, 1e12)).characters).toEqual(
    [],
  );
});

test('a password account deletes by password even when email is on', async () => {
  const server = await signedIn(WITH_EMAIL);
  expect(
    await server.auth.api.deleteAccount({ headers: server.headers, body: { password: PASSWORD } }),
  ).toEqual({ result: 'deleted' });
});

test('an OAuth delete with a 6-minute-old session must sign in again', async () => {
  const server = await signedIn(NO_EMAIL);
  makeOAuthAccount(server.db);
  ageSession(server.db, RECENT_SIGN_IN_MS + 60_000);
  expect(
    await errorCode(server.auth.api.deleteAccount({ headers: server.headers, body: {} })),
  ).toBe('SIGN_IN_AGAIN');
  expect(server.db.prepare('SELECT COUNT(*) AS n FROM user').get()).toEqual({ n: 1 });
});

test('an OAuth delete with a fresh session deletes', async () => {
  const server = await signedIn(NO_EMAIL);
  makeOAuthAccount(server.db);
  expect(await server.auth.api.accountDeletionMethod({ headers: server.headers })).toEqual({
    method: 'recent-sign-in',
  });
  expect(await server.auth.api.deleteAccount({ headers: server.headers, body: {} })).toEqual({
    result: 'deleted',
  });
});

test('an email-link account is sent to the email flow', async () => {
  const server = await signedIn(WITH_EMAIL);
  makeOAuthAccount(server.db);
  expect(
    await errorCode(server.auth.api.deleteAccount({ headers: server.headers, body: {} })),
  ).toBe('USE_EMAIL_LINK');
});

test("Better Auth's own delete without a token is refused when email is off", async () => {
  const server = await signedIn(NO_EMAIL);
  makeOAuthAccount(server.db);
  expect(await errorCode(server.auth.api.deleteUser({ headers: server.headers, body: {} }))).toBe(
    'USE_ACCOUNT_DELETE',
  );
  expect(server.db.prepare('SELECT COUNT(*) AS n FROM user').get()).toEqual({ n: 1 });
});

test('a password account cannot trigger an email link', async () => {
  const server = await signedIn(WITH_EMAIL);
  expect(
    await errorCode(
      server.auth.api.deleteUser({ headers: server.headers, body: { callbackURL: '/' } }),
    ),
  ).toBe('USE_ACCOUNT_DELETE');
});

test('the hosted setup still deletes through the emailed link', async () => {
  const server = await signedIn(WITH_EMAIL);
  makeOAuthAccount(server.db);
  expect(await server.auth.api.accountDeletionMethod({ headers: server.headers })).toEqual({
    method: 'email',
  });
  const sent = await server.auth.api.deleteUser({
    headers: server.headers,
    body: { callbackURL: '/' },
  });
  expect(sent).toMatchObject({ message: 'Verification email sent' });
});

test('password guesses on account deletion are rate-limited', async () => {
  const server = await signedIn(NO_EMAIL);
  const attempt = () =>
    server.auth.handler(
      new Request('http://localhost:3000/api/auth/account/delete', {
        method: 'POST',
        headers: {
          cookie: server.headers.get('cookie') ?? '',
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.7',
        },
        body: JSON.stringify({ password: 'guess' }),
      }),
    );
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await attempt()).status);
  expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
  expect(statuses[5]).toBe(429);
});

test("a password account can't skip the rate limit through Better Auth's own delete", async () => {
  const server = await signedIn(NO_EMAIL);
  expect(
    await errorCode(
      server.auth.api.deleteUser({ headers: server.headers, body: { password: PASSWORD } }),
    ),
  ).toBe('USE_ACCOUNT_DELETE');
  expect(server.db.prepare('SELECT COUNT(*) AS n FROM user').get()).toEqual({ n: 1 });
});
