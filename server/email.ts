import path from 'node:path';
import nodemailer from 'nodemailer';

type EmailEnv = { NODE_ENV?: string; SMTP_URL?: string; EMAIL_FROM?: string };

export type Email = { to: string; subject: string; text: string; html: string };
type Attachment = { filename: string; path: string; cid: string };
type Transport = {
  sendMail(message: Email & { from: string; attachments: Attachment[] }): Promise<unknown>;
};
type CreateTransport = (smtpUrl: string) => Transport;

export type SendEmail = (message: Email) => Promise<void>;

export function signInEmail(to: string, url: string): Email {
  return {
    to,
    subject: 'Sign in to Wild Cards Go',
    text: `Sign in to Wild Cards Go:\n\n${url}\n\nThis link expires in 5 minutes.`,
    html: emailHtml({
      heading: 'Sign in',
      body: ['Tap the button to sign in to Wild Cards Go on this device.'],
      action: 'Sign in',
      url,
      note: 'This link expires in 5 minutes. If you did not ask to sign in, ignore this email.',
    }),
  };
}

/** The confirmation only works in a browser with that account's session. */
export function deleteAccountEmail(to: string, url: string): Email {
  return {
    to,
    subject: 'Confirm deleting your Wild Cards Go account',
    text:
      'Open this link in the browser where you are signed in to Wild Cards Go to delete your ' +
      `account and all its characters:\n\n${url}\n\nIf it asks you to sign in, do that ` +
      'first. This link expires in 1 hour. If you did not ask to delete your account, ' +
      'ignore this email.',
    html: emailHtml({
      heading: 'Delete your account?',
      body: [
        'This deletes your Wild Cards Go account and all its characters. It cannot be undone.',
        'Open the link in the browser where you are signed in. If it asks you to sign in, do that first.',
      ],
      action: 'Delete my account',
      danger: true,
      url,
      note: 'This link expires in 1 hour. If you did not ask to delete your account, ignore this email.',
    }),
  };
}

/** Served next to the app's own icons; the HTML refers to it as `cid:logo`. */
const logo: Attachment = {
  filename: 'logo.png',
  path: path.join(process.cwd(), 'public/icons/icon-192.png'),
  cid: 'logo',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Tables and inline styles, because mail clients ignore most CSS. Colours are
 * the classic daylight skin from styles/globals.css.
 */
function emailHtml(content: {
  heading: string;
  body: string[];
  action: string;
  url: string;
  note: string;
  danger?: boolean;
}): string {
  const url = escapeHtml(content.url);
  const button = content.danger ? '#9e2b23' : '#8c2f2a';
  const serif = "Cinzel, Georgia, 'Times New Roman', serif";
  const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
  const paragraphs = content.body
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#e8dcc0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8dcc0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbf6ea;border:1px solid #cdbb98;border-radius:4px;">
<tr><td align="center" style="padding:32px 32px 8px;">
<img src="cid:logo" width="72" height="72" alt="" style="display:block;border:0;border-radius:12px;">
<div style="margin-top:12px;font-family:${serif};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#8a6e1a;">Wild Cards Go</div>
</td></tr>
<tr><td style="padding:8px 32px 0;">
<h1 style="margin:0 0 16px;text-align:center;font-family:${serif};font-size:24px;font-weight:700;color:#8c2f2a;">${escapeHtml(content.heading)}</h1>
<div style="font-family:${sans};font-size:16px;line-height:1.5;color:#2b2318;">${paragraphs}</div>
</td></tr>
<tr><td align="center" style="padding:8px 32px 24px;">
<a href="${url}" style="display:inline-block;padding:12px 28px;background:${button};color:#fffaf0;font-family:${sans};font-size:16px;font-weight:600;text-decoration:none;border-radius:3px;">${escapeHtml(content.action)}</a>
</td></tr>
<tr><td style="padding:0 32px 32px;font-family:${sans};font-size:13px;line-height:1.5;color:#6d5c43;">
<p style="margin:0 0 12px;">${escapeHtml(content.note)}</p>
<p style="margin:0;">Button not working? Paste this link into your browser:<br><a href="${url}" style="color:#8a6e1a;word-break:break-all;">${url}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Password accounts carry `<username>@users.invalid`, a reserved domain no mail reaches. */
function isPlaceholderAddress(to: string): boolean {
  return to.toLowerCase().endsWith('.invalid');
}

/**
 * Sends sign-in links over SMTP, so the provider is a configuration choice:
 * `SMTP_URL` is e.g. `smtp://login:key@smtp-relay.brevo.com:587`. Without it,
 * development prints the link to the console instead; production sends
 * nothing, so links never end up in server logs (email sign-in is then off).
 * Placeholder addresses are refused before anything is sent or logged.
 */
export function createEmailSender(
  env: EmailEnv,
  createTransport: CreateTransport = (smtpUrl) => nodemailer.createTransport(smtpUrl),
): SendEmail {
  const deliver = createDelivery(env, createTransport);
  return async (message) => {
    if (isPlaceholderAddress(message.to)) {
      throw new Error('Refusing to email a placeholder address');
    }
    await deliver(message);
  };
}

function createDelivery(env: EmailEnv, createTransport: CreateTransport): SendEmail {
  const { SMTP_URL, EMAIL_FROM } = env;
  if (!SMTP_URL) {
    if (env.NODE_ENV === 'production') {
      return async () => {
        throw new Error('Email is not configured on this server');
      };
    }
    return async ({ to, subject, text }) => {
      console.info(`[email] To ${to}: ${subject}\n${text}`);
    };
  }

  // nodemailer treats any other string as a transport plugin and fails with a
  // confusing error, so say what is expected instead.
  if (!/^smtps?:\/\//i.test(SMTP_URL)) {
    throw new Error(
      'SMTP_URL must look like smtp://login:key@host:587 (URL-encode @ in the login)',
    );
  }
  if (!EMAIL_FROM) throw new Error('EMAIL_FROM is required when SMTP_URL is set');
  const transport = createTransport(SMTP_URL);

  return async (message) => {
    await transport.sendMail({ from: EMAIL_FROM, ...message, attachments: [logo] });
  };
}

let sender: SendEmail | undefined;

/** Created on first use, so importing this module never throws. */
export const sendEmail: SendEmail = (message) => {
  sender ??= createEmailSender(process.env);
  return sender(message);
};
