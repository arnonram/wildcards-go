import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkServerConfig, prepareStorage } from './startup-check';

const saved = { ...process.env };

/** Production with no sign-in method configured at all. */
function bareProduction() {
  process.env = { ...saved, NODE_ENV: 'production', BETTER_AUTH_URL: 'https://wcg.example' };
  for (const key of [
    'SMTP_URL',
    'EMAIL_FROM',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'AUTH_PASSWORD',
  ]) {
    delete process.env[key];
  }
}

afterEach(() => {
  process.env = { ...saved };
});

test('server start refuses production with no sign-in method', () => {
  bareProduction();
  expect(() => checkServerConfig()).toThrow('No sign-in method is enabled');
});

test('production with only password sign-in starts', () => {
  bareProduction();
  process.env.AUTH_PASSWORD = '1';
  checkServerConfig();
});

test('production refuses to start without BETTER_AUTH_URL', () => {
  bareProduction();
  process.env.AUTH_PASSWORD = '1';
  delete process.env.BETTER_AUTH_URL;
  expect(() => checkServerConfig()).toThrow('BETTER_AUTH_URL');
});

test('an invalid SMTP_URL still refuses to start', () => {
  bareProduction();
  process.env.AUTH_PASSWORD = '1';
  process.env.SMTP_URL = 'xsmtpsib-just-the-key';
  process.env.EMAIL_FROM = 'a@example.com';
  expect(() => checkServerConfig()).toThrow('SMTP_URL must look like');
});

test('server start is fine in development without email settings', () => {
  process.env = { ...saved, NODE_ENV: 'development' };
  delete process.env.SMTP_URL;
  checkServerConfig();
});
test('self-hosted start opens the database, naming a bad path', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wcg-start-'));
  const cache = globalThis as { __wcgBackend?: unknown };
  const cached = cache.__wcgBackend;
  delete cache.__wcgBackend;
  process.env = { ...saved, BETTER_AUTH_SECRET: 'x'.repeat(32), DATABASE_PATH: dir };
  delete process.env.MONGODB_URI;
  try {
    await expect(prepareStorage()).rejects.toThrow(`Cannot open SQLite database at ${dir}`);
  } finally {
    cache.__wcgBackend = cached;
    rmSync(dir, { recursive: true, force: true });
  }
});
