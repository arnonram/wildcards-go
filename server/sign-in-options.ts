/**
 * Kept apart from `server/auth` so `/api/providers` can read it without
 * loading Better Auth and the database drivers.
 */
import type { Env } from './env';

/** Who may create a new account: anyone, holders of the invite code, or no one. */
export type SignUp = 'open' | 'invite' | 'closed';

export type SignInOptions = {
  google: boolean;
  discord: boolean;
  email: boolean;
  password: boolean;
  /** Shortest password a new account may use (Better Auth's default is 8). */
  passwordMinLength: number;
  signUp: SignUp;
};

export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

/** A positive whole number, or the default: a typo must not drop the minimum to nothing. */
function minLength(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_PASSWORD_MIN_LENGTH;
}

/**
 * Each sign-in method is on when its settings are. Email links also work in
 * development without SMTP, printing to the console. Sign-up stays open on
 * the hosted MongoDB site as it always was; a self-hosted server accepts new
 * accounts only with the invite code, or when explicitly opened.
 */
export function signInOptions(env: Env): SignInOptions {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    discord: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
    email: Boolean(env.SMTP_URL && env.EMAIL_FROM) || env.NODE_ENV !== 'production',
    password: env.AUTH_PASSWORD === '1',
    passwordMinLength: minLength(env.AUTH_PASSWORD_MIN_LENGTH),
    signUp: env.SIGNUP_INVITE_CODE
      ? 'invite'
      : env.MONGODB_URI || env.SIGNUP_OPEN === '1'
        ? 'open'
        : 'closed',
  };
}

export function anySignInMethod(options: SignInOptions): boolean {
  return options.google || options.discord || options.email || options.password;
}
