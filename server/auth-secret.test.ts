import { afterEach, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveAuthSecret } from './auth-secret';

const dirs: string[] = [];

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'wcg-secret-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test('env secret wins and no file is written', () => {
  const dir = tempDir();
  expect(resolveAuthSecret({ BETTER_AUTH_SECRET: 'from-env' }, dir)).toBe('from-env');
  expect(existsSync(path.join(dir, 'auth-secret'))).toBe(false);
});

test('secret is generated once with mode 600', () => {
  const dir = tempDir();
  const secret = resolveAuthSecret({}, dir);
  const file = path.join(dir, 'auth-secret');
  expect(secret.length).toBeGreaterThanOrEqual(32);
  expect(readFileSync(file, 'utf8')).toBe(secret);
  expect(statSync(file).mode & 0o777).toBe(0o600);
});

test('secret is reused on second start', () => {
  const dir = tempDir();
  expect(resolveAuthSecret({}, dir)).toBe(resolveAuthSecret({}, dir));
});

test('a hand-edited secret file keeps the same secret despite a trailing newline', () => {
  const dir = tempDir();
  const secret = resolveAuthSecret({}, dir);
  writeFileSync(path.join(dir, 'auth-secret'), `${secret}\n`);
  expect(resolveAuthSecret({}, dir)).toBe(secret);
});

test('an empty secret file is an error naming the file', () => {
  const dir = tempDir();
  writeFileSync(path.join(dir, 'auth-secret'), '  \n');
  expect(() => resolveAuthSecret({}, dir)).toThrow(path.join(dir, 'auth-secret'));
});
