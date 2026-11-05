/**
 * The invite code travels as a short-lived cookie, so the server sees it on
 * every request that can create an account: password sign-up, the email-link
 * request, and the OAuth callback after the provider redirects back.
 */
export const INVITE_COOKIE = 'wcg-invite';

function write(value: string, maxAge: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  // biome-ignore lint/suspicious/noDocumentCookie: a plain cookie the server reads; no store API needed
  document.cookie = `${INVITE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function setInviteCookie(code: string): void {
  write(encodeURIComponent(code), 600);
}

export function clearInviteCookie(): void {
  write('', 0);
}

/** Why the server refused to create an account; shared with the sign-in page. */
export const SIGN_UP_REFUSALS = {
  INVITE_REQUIRED: 'An invite code is needed to create an account.',
  SIGN_UP_CLOSED: "This server isn't accepting new accounts.",
} as const;

export type SignUpRefusal = keyof typeof SIGN_UP_REFUSALS;
