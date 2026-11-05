import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Env } from './env';

/**
 * The session-signing secret. A self-hoster who sets none gets one generated
 * on first start and kept beside the database, so restarts and upgrades keep
 * everyone signed in; `wx` makes a second process reuse, never overwrite, it.
 */
export function resolveAuthSecret(env: Env, dataDir: string): string {
  if (env.BETTER_AUTH_SECRET) return env.BETTER_AUTH_SECRET;
  const file = path.join(dataDir, 'auth-secret');
  try {
    return readSecret(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const secret = randomBytes(32).toString('base64');
  try {
    writeFileSync(file, secret, { mode: 0o600, flag: 'wx' });
    return secret;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return readSecret(file);
    throw error;
  }
}

/** Trimmed, so a hand-edit's trailing newline doesn't change it and sign everyone out. */
function readSecret(file: string): string {
  const secret = readFileSync(file, 'utf8').trim();
  if (!secret) throw new Error(`${file} is empty: delete it to have a new secret generated`);
  return secret;
}
