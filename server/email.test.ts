import { expect, spyOn, test } from 'bun:test';
import nodemailer from 'nodemailer';
import { createEmailSender } from './email';

test('email sender refuses console fallback in production', () => {
  expect(() => createEmailSender({ NODE_ENV: 'production' })).toThrow('SMTP_URL');
});

test('email sender refuses an SMTP server without a from address', () => {
  expect(() =>
    createEmailSender({ NODE_ENV: 'production', SMTP_URL: 'smtp://u:p@smtp.example.com:587' }),
  ).toThrow('EMAIL_FROM');
});

test('email sender explains an SMTP_URL that is not an smtp:// URL', () => {
  expect(() =>
    createEmailSender({ SMTP_URL: 'xsmtpsib-just-the-key', EMAIL_FROM: 'a@b.c' }),
  ).toThrow('SMTP_URL must look like smtp://login:key@host:587');
});

test('email sender logs the link in development', async () => {
  const info = spyOn(console, 'info').mockImplementation(() => {});
  try {
    await createEmailSender({ NODE_ENV: 'development' })('a@b.c', 'http://x/link');
    expect(info.mock.calls.flat().join(' ')).toContain('http://x/link');
  } finally {
    info.mockRestore();
  }
});

test('email sender sends through the SMTP server in SMTP_URL', async () => {
  const urls: string[] = [];
  const sent: Record<string, unknown>[] = [];
  const fake = nodemailer.createTransport({ jsonTransport: true });
  const send = createEmailSender(
    { SMTP_URL: 'smtp://user:key@smtp.example.com:587', EMAIL_FROM: 'Wild Cards Go <from@x.y>' },
    (url) => {
      urls.push(url);
      return {
        sendMail: async (message) => {
          const info = await fake.sendMail(message);
          sent.push(JSON.parse(String(info.message)));
          return info;
        },
      };
    },
  );
  await send('a@b.c', 'http://x/l');
  expect(urls).toEqual(['smtp://user:key@smtp.example.com:587']);
  expect(sent[0]).toMatchObject({ subject: 'Sign in to Wild Cards Go' });
  expect(JSON.stringify(sent[0].from)).toContain('from@x.y');
  expect(JSON.stringify(sent[0].to)).toContain('a@b.c');
  expect(String(sent[0].text)).toContain('http://x/l');
  expect(String(sent[0].text)).toContain('expires in 5 minutes');
});
