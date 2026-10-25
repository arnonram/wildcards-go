import { expect, spyOn, test } from 'bun:test';
import { createEmailSender } from './email';

test('email sender refuses console fallback in production', () => {
  expect(() => createEmailSender({ NODE_ENV: 'production' })).toThrow('RESEND_API_KEY');
});

test('email sender logs the link in development', async () => {
  const info = spyOn(console, 'info').mockImplementation(() => {});
  try {
    await createEmailSender({ NODE_ENV: 'development' })('a@b.c', 'http://x/link');
    expect(info).toHaveBeenCalled();
    expect(info.mock.calls.flat().join(' ')).toContain('http://x/link');
  } finally {
    info.mockRestore();
  }
});

test('email sender posts to Resend when a key is set', async () => {
  const realFetch = globalThis.fetch;
  let sent: { url: string; body: Record<string, unknown>; auth: string | null } | undefined;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent = {
      url,
      body: JSON.parse(init.body as string),
      auth: new Headers(init.headers).get('Authorization'),
    };
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  try {
    await createEmailSender({ RESEND_API_KEY: 'k', EMAIL_FROM: 'from@x' })('a@b.c', 'http://x/l');
    expect(sent?.url).toBe('https://api.resend.com/emails');
    expect(sent?.auth).toBe('Bearer k');
    expect(sent?.body).toMatchObject({ from: 'from@x', to: 'a@b.c' });
    expect(String(sent?.body.text)).toContain('http://x/l');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('email sender refuses a Resend key without a from address', () => {
  expect(() => createEmailSender({ NODE_ENV: 'production', RESEND_API_KEY: 'k' })).toThrow(
    'EMAIL_FROM',
  );
});
