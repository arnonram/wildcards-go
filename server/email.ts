import nodemailer from 'nodemailer';

type EmailEnv = { NODE_ENV?: string; SMTP_URL?: string; EMAIL_FROM?: string };

type Message = { from: string; to: string; subject: string; text: string };
type Transport = { sendMail(message: Message): Promise<unknown> };
type CreateTransport = (smtpUrl: string) => Transport;

export type SendSignInEmail = (email: string, url: string) => Promise<void>;

/**
 * Sends sign-in links over SMTP, so the provider is a configuration choice:
 * `SMTP_URL` is e.g. `smtp://login:key@smtp-relay.brevo.com:587`. Without it,
 * development prints the link to the console instead; production refuses to
 * start, so links never end up in server logs.
 */
export function createEmailSender(
  env: EmailEnv,
  createTransport: CreateTransport = (smtpUrl) => nodemailer.createTransport(smtpUrl),
): SendSignInEmail {
  const { SMTP_URL, EMAIL_FROM } = env;
  if (!SMTP_URL) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP_URL is required in production');
    }
    return async (email, url) => {
      console.info(`[auth] Sign-in link for ${email}: ${url}`);
    };
  }

  if (!EMAIL_FROM) throw new Error('EMAIL_FROM is required when SMTP_URL is set');
  const transport = createTransport(SMTP_URL);

  return async (email, url) => {
    await transport.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Sign in to Wild Cards Go',
      text: `Sign in to Wild Cards Go:\n\n${url}\n\nThis link expires in 5 minutes.`,
    });
  };
}

let sender: SendSignInEmail | undefined;

/** Created on first use, so importing this module never throws. */
export const sendSignInEmail: SendSignInEmail = (email, url) => {
  sender ??= createEmailSender(process.env);
  return sender(email, url);
};
