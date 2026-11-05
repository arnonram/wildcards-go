import { createHash, timingSafeEqual } from 'node:crypto';
import { INVITE_COOKIE, type SignUpRefusal } from '../helpers/invite-cookie';
import type { SignUp } from './sign-in-options';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Digests have one length, so the comparison is constant-time whatever was typed. */
export function inviteMatches(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

/** The invite code from a Cookie header, if the sign-in page set one. */
export function inviteFromCookies(header: string | null | undefined): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [name, ...value] = part.trim().split('=');
    if (name === INVITE_COOKIE) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Password accounts have no real email, but Better Auth needs a unique one.
 * `.invalid` is reserved: nothing is ever delivered there, and the email
 * sender refuses it.
 */
export function placeholderEmail(username: string): string {
  return `${username.toLowerCase()}@users.invalid`;
}

/** Why a new account may not be created here, or undefined when it may. */
export function signUpRefusal(
  signUp: SignUp,
  inviteCode: string | undefined,
  cookieHeader: string | null | undefined,
): SignUpRefusal | undefined {
  if (signUp === 'open') return undefined;
  if (signUp === 'closed' || !inviteCode) return 'SIGN_UP_CLOSED';
  return inviteMatches(inviteFromCookies(cookieHeader), inviteCode) ? undefined : 'INVITE_REQUIRED';
}
