import { expect, test } from 'bun:test';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { buildAuthOptions } from './auth';
import { openBackend } from './backend';
import type { Env } from './env';

const ENV = {
  NODE_ENV: 'test',
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
};

const PASSWORD_ENV: Env = { ...ENV, AUTH_PASSWORD: '1', SIGNUP_OPEN: '1' };

async function sqliteAuth(env: Env = ENV) {
  const backend = await openBackend({ kind: 'sqlite', path: ':memory:' });
  if (backend.kind !== 'sqlite') throw new Error('expected sqlite');
  const options = buildAuthOptions(backend, env);
  await (await getMigrations(options)).runMigrations();
  return { backend, db: backend.db, auth: betterAuth(options) };
}

/** A user row written straight through the adapter, as an existing account. */
async function insertUser(auth: Awaited<ReturnType<typeof sqliteAuth>>['auth'], email: string) {
  const ctx = await auth.$context;
  const now = new Date();
  return ctx.adapter.create<{ id: string }>({
    model: 'user',
    data: { email, name: email, emailVerified: true, createdAt: now, updatedAt: now },
  });
}

function tables(db: { prepare(sql: string): { all(): unknown[] } }) {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]
  ).map((row) => row.name);
}

test('migrations create Better Auth tables', async () => {
  const { db } = await sqliteAuth();
  expect(tables(db)).toEqual(
    expect.arrayContaining(['user', 'session', 'account', 'verification', 'rateLimit']),
  );
});

test('migrations are idempotent', async () => {
  const { backend, db, auth } = await sqliteAuth();
  await insertUser(auth, 'a@example.com');
  await (await getMigrations(buildAuthOptions(backend, ENV))).runMigrations();
  expect(db.prepare('SELECT email FROM user').all()).toEqual([{ email: 'a@example.com' }]);
});

test('session rows keep no IP or user agent', async () => {
  const { db, auth } = await sqliteAuth(PASSWORD_ENV);
  await auth.api.signUpEmail({
    body: {
      username: 'ann',
      password: 'correct horse 1',
      email: 'x@example.com',
      name: 'x',
    } as never,
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Test/1.0' }),
  });
  expect(db.prepare('SELECT ipAddress, userAgent FROM session').all()).toEqual([
    { ipAddress: '', userAgent: '' },
  ]);
});

/** Better Auth's API error code, or null when the call succeeded. */
async function errorCode(call: Promise<unknown>): Promise<string | null> {
  try {
    await call;
    return null;
  } catch (error) {
    const body = (error as { body?: { code?: string } }).body;
    return body?.code ?? (error as Error).message;
  }
}

function signUp(
  auth: Awaited<ReturnType<typeof sqliteAuth>>['auth'],
  username: string,
  cookie?: string,
) {
  return auth.api.signUpEmail({
    // The username plugin's field is added at runtime; the inferred body type omits it.
    body: { username, password: 'correct horse 1', email: 'real@example.com', name: 'x' } as never,
    headers: cookie ? new Headers({ cookie }) : new Headers(),
  });
}

test('password sign-up stores a placeholder email and the username as name', async () => {
  const { db, auth } = await sqliteAuth(PASSWORD_ENV);
  await signUp(auth, 'Bob');
  expect(db.prepare('SELECT email, name, username FROM user').all()).toEqual([
    { email: 'bob@users.invalid', name: 'Bob', username: 'bob' },
  ]);
});

test('username sign-up is case-insensitive', async () => {
  const { db, auth } = await sqliteAuth(PASSWORD_ENV);
  await signUp(auth, 'Bob');
  expect(await errorCode(signUp(auth, 'bob'))).not.toBeNull();
  expect(db.prepare('SELECT COUNT(*) AS n FROM user').get()).toEqual({ n: 1 });
});

test('password sign-in by username works', async () => {
  const { auth } = await sqliteAuth(PASSWORD_ENV);
  await signUp(auth, 'Bob');
  const result = await auth.api.signInUsername({
    body: { username: 'BOB', password: 'correct horse 1' },
  });
  expect(result?.user.email).toBe('bob@users.invalid');
});

test('closed sign-up rejects new accounts', async () => {
  const { auth } = await sqliteAuth({ ...ENV, AUTH_PASSWORD: '1' });
  expect(await errorCode(signUp(auth, 'Bob'))).toBe('SIGN_UP_CLOSED');
});

test('invite sign-up needs the cookie', async () => {
  const { auth } = await sqliteAuth({ ...ENV, AUTH_PASSWORD: '1', SIGNUP_INVITE_CODE: 'table' });
  expect(await errorCode(signUp(auth, 'Ann'))).toBe('INVITE_REQUIRED');
  expect(await errorCode(signUp(auth, 'Ann', 'wcg-invite=wrong'))).toBe('INVITE_REQUIRED');
  expect(await errorCode(signUp(auth, 'Ann', 'wcg-invite=table'))).toBeNull();
});

test('invite does not block existing users signing in', async () => {
  const { auth } = await sqliteAuth({ ...ENV, AUTH_PASSWORD: '1', SIGNUP_INVITE_CODE: 'table' });
  await signUp(auth, 'Ann', 'wcg-invite=table');
  const result = await auth.api.signInUsername({
    body: { username: 'ann', password: 'correct horse 1' },
  });
  expect(result?.user.name).toBe('Ann');
});

test('a magic link to an unknown email is gated by the invite', async () => {
  const { auth } = await sqliteAuth({ ...ENV, SIGNUP_INVITE_CODE: 'table' });
  const send = (email: string, cookie?: string) =>
    auth.api.signInMagicLink({
      body: { email },
      headers: cookie ? new Headers({ cookie }) : new Headers(),
    });
  expect(await errorCode(send('new@example.com'))).toBe('INVITE_REQUIRED');
  expect(await errorCode(send('new@example.com', 'wcg-invite=table'))).toBeNull();
  await insertUser(auth, 'old@example.com');
  expect(await errorCode(send('old@example.com'))).toBeNull();
});

test('hosted options are unchanged', async () => {
  const backend = await openBackend({ kind: 'sqlite', path: ':memory:' });
  const options = buildAuthOptions(backend, {
    ...ENV,
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://x',
    SMTP_URL: 'smtp://u:k@smtp.example.com:587',
    EMAIL_FROM: 'a@example.com',
  });
  expect(options.emailAndPassword).toBeUndefined();
  expect(options.plugins.map((plugin) => plugin.id)).toEqual([
    'magic-link',
    'wcg-account-deletion',
  ]);
  expect(options.onAPIError).toBeUndefined();
  expect(options.user.validateUserInfo).toBeUndefined();
});

test('a refused OAuth sign-up returns to the sign-in page when sign-up is gated', async () => {
  const backend = await openBackend({ kind: 'sqlite', path: ':memory:' });
  const options = buildAuthOptions(backend, { ...ENV, SIGNUP_INVITE_CODE: 'table' });
  expect(options.onAPIError?.errorURL).toBe('/sign-in');
});

test('a refused sign-up never rolls back a character saved meanwhile', async () => {
  const { backend, db, auth } = await sqliteAuth({
    ...ENV,
    AUTH_PASSWORD: '1',
    SIGNUP_INVITE_CODE: 'table',
  });
  // Password hashing yields mid-transaction; a save landing then must not join it.
  const signUp = auth.handler(
    new Request('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        cookie: 'wcg-invite=wrong',
      },
      body: JSON.stringify({ username: 'mallory', password: 'password1234', email: '', name: 'x' }),
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  const data = { _id: 'char-1', name: 'Hero' } as never;
  const put = await backend.store.putCharacter(
    'owner-a',
    'char-1',
    { baseVersion: 0, deleted: false, data },
    1,
  );
  expect(put).toEqual({ ok: { version: 1, modifiedAt: 1 } });
  expect((await signUp).status).toBe(403);
  expect(db.prepare('SELECT id, version FROM characters').all()).toEqual([
    { id: 'char-1', version: 1 },
  ]);
});

test('short passwords are refused unless the minimum is lowered', async () => {
  const short = (auth: Awaited<ReturnType<typeof sqliteAuth>>['auth']) =>
    auth.api.signUpEmail({
      body: { username: 'kid', password: 'abcd', email: '', name: 'kid' } as never,
    });
  expect(await errorCode(short((await sqliteAuth(PASSWORD_ENV)).auth))).toBe('PASSWORD_TOO_SHORT');
  const lowered = await sqliteAuth({ ...PASSWORD_ENV, AUTH_PASSWORD_MIN_LENGTH: '4' });
  expect(await errorCode(short(lowered.auth))).toBeNull();
});

test('Better Auth gets the Vercel preview addresses on a preview', async () => {
  const backend = await openBackend({ kind: 'sqlite', path: ':memory:' });
  const options = buildAuthOptions(backend, {
    ...ENV,
    BETTER_AUTH_URL: 'https://wcg.example',
    VERCEL_ENV: 'preview',
    VERCEL_URL: 'wcg-abc123-team.vercel.app',
    VERCEL_BRANCH_URL: 'wcg-git-feature-team.vercel.app',
  });
  expect(options.baseURL).toEqual({
    allowedHosts: ['wcg-abc123-team.vercel.app', 'wcg-git-feature-team.vercel.app'],
    protocol: 'https',
    fallback: 'https://wcg.example',
  });
});
