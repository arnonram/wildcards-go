import { expect, spyOn, test } from 'bun:test';
import nodemailer from 'nodemailer';
import { createEmailSender, deleteAccountEmail, signInEmail } from './email';

test('email sender without SMTP in production refuses to send, never logs', async () => {
  const info = spyOn(console, 'info').mockImplementation(() => {});
  try {
    const send = createEmailSender({ NODE_ENV: 'production' });
    await expect(send(signInEmail('a@b.c', 'http://x/link'))).rejects.toThrow(
      'Email is not configured',
    );
    expect(info).not.toHaveBeenCalled();
  } finally {
    info.mockRestore();
  }
});

test('placeholder addresses are never mailed', async () => {
  let calls = 0;
  const send = createEmailSender(
    { SMTP_URL: 'smtp://user:key@smtp.example.com:587', EMAIL_FROM: 'from@x.y' },
    () => ({
      sendMail: async () => {
        calls++;
      },
    }),
  );
  await expect(send(signInEmail('bob@users.INVALID', 'http://x/l'))).rejects.toThrow(
    'Refusing to email a placeholder address',
  );
  expect(calls).toBe(0);
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
    await createEmailSender({ NODE_ENV: 'development' })(signInEmail('a@b.c', 'http://x/link'));
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
  await send(signInEmail('a@b.c', 'http://x/l'));
  expect(urls).toEqual(['smtp://user:key@smtp.example.com:587']);
  expect(sent[0]).toMatchObject({ subject: 'Sign in to Wild Cards Go' });
  expect(JSON.stringify(sent[0].from)).toContain('from@x.y');
  expect(JSON.stringify(sent[0].to)).toContain('a@b.c');
  expect(String(sent[0].text)).toContain('http://x/l');
  expect(String(sent[0].text)).toContain('expires in 5 minutes');
});

test('delete-account email says to open it where you are signed in', () => {
  const message = deleteAccountEmail('a@b.c', 'http://x/delete');
  expect(message.to).toBe('a@b.c');
  expect(message.subject).toBe('Confirm deleting your Wild Cards Go account');
  expect(message.text).toContain('http://x/delete');
  expect(message.text).toContain('browser where you are signed in');
  expect(message.text).toContain('expires in 1 hour');
});

test('emails carry an HTML version with the escaped link and the embedded logo', () => {
  for (const message of [
    signInEmail('a@b.c', 'http://x/l?a=1&b="2"'),
    deleteAccountEmail('a@b.c', 'http://x/l?a=1&b="2"'),
  ]) {
    expect(message.html).toContain('href="http://x/l?a=1&amp;b=&quot;2&quot;"');
    expect(message.html).toContain('src="cid:logo"');
  }
});

test('email sender attaches the logo the HTML refers to', async () => {
  const sent: Record<string, unknown>[] = [];
  const send = createEmailSender(
    { SMTP_URL: 'smtp://u:k@smtp.example.com:587', EMAIL_FROM: 'from@x.y' },
    () => ({ sendMail: async (message) => sent.push(message) }),
  );
  await send(signInEmail('a@b.c', 'http://x/l'));
  const [logo] = sent[0].attachments as { cid: string; path: string }[];
  expect(logo.cid).toBe('logo');
  expect(await Bun.file(logo.path).exists()).toBe(true);
});
