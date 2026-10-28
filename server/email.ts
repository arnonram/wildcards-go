import nodemailer from 'nodemailer';

type EmailEnv = { NODE_ENV?: string; SMTP_URL?: string; EMAIL_FROM?: string };

export type Email = { to: string; subject: string; text: string };
type Transport = { sendMail(message: Email & { from: string }): Promise<unknown> };
type CreateTransport = (smtpUrl: string) => Transport;

export type SendEmail = (message: Email) => Promise<void>;

export function signInEmail(to: string, url: string): Email {
  return {
    to,
    subject: 'Sign in to Wild Cards Go',
    text: `Sign in to Wild Cards Go:\n\n${url}\n\nThis link expires in 5 minutes.`,
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
  };
}

/**
 * Sends sign-in links over SMTP, so the provider is a configuration choice:
 * `SMTP_URL` is e.g. `smtp://login:key@smtp-relay.brevo.com:587`. Without it,
 * development prints the link to the console instead; production refuses to
 * start, so links never end up in server logs.
 */
export function createEmailSender(
  env: EmailEnv,
  createTransport: CreateTransport = (smtpUrl) => nodemailer.createTransport(smtpUrl),
): SendEmail {
  const { SMTP_URL, EMAIL_FROM } = env;
  if (!SMTP_URL) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP_URL is required in production');
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
    await transport.sendMail({ from: EMAIL_FROM, ...message });
  };
}

let sender: SendEmail | undefined;

/** Created on first use, so importing this module never throws. */
export const sendEmail: SendEmail = (message) => {
  sender ??= createEmailSender(process.env);
  return sender(message);
};
