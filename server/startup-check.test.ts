import { afterEach, expect, test } from 'bun:test';
import { checkServerConfig } from './startup-check';

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

test('server start refuses production without email settings', () => {
  process.env = { ...saved, NODE_ENV: 'production' };
  delete process.env.SMTP_URL;
  expect(() => checkServerConfig()).toThrow('SMTP_URL');
});

test('server start is fine in development without email settings', () => {
  process.env = { ...saved, NODE_ENV: 'development' };
  delete process.env.SMTP_URL;
  checkServerConfig();
});
