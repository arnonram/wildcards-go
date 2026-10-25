import { afterEach, expect, test } from 'bun:test';
import { checkServerConfig } from './instrumentation';

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

test('server start refuses production without email settings', async () => {
  process.env = { ...saved, NODE_ENV: 'production' };
  delete process.env.RESEND_API_KEY;
  await expect(checkServerConfig()).rejects.toThrow('RESEND_API_KEY');
});

test('server start is fine in development without email settings', async () => {
  process.env = { ...saved, NODE_ENV: 'development' };
  delete process.env.RESEND_API_KEY;
  await checkServerConfig();
});
