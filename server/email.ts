type EmailEnv = { NODE_ENV?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string };

export type SendSignInEmail = (email: string, url: string) => Promise<void>;

/**
 * Sends sign-in links through Resend. Without a key, development prints the
 * link to the console instead; production refuses to start, so links never
 * end up in server logs.
 */
export function createEmailSender(env: EmailEnv): SendSignInEmail {
  const { RESEND_API_KEY, EMAIL_FROM } = env;
  if (!RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is required in production');
    }
    return async (email, url) => {
      console.info(`[auth] Sign-in link for ${email}: ${url}`);
    };
  }

  return async (email, url) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: 'Sign in to Wild Cards Go',
        text: `Sign in to Wild Cards Go:\n\n${url}\n\nThis link expires in 5 minutes.`,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
    }
  };
}

let sender: SendSignInEmail | undefined;

/** Created on first use, so importing this module never throws. */
export const sendSignInEmail: SendSignInEmail = (email, url) => {
  sender ??= createEmailSender(process.env);
  return sender(email, url);
};
