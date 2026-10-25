/**
 * Where to go after sign-in: a same-site path, or home. Anything else (an
 * absolute or protocol-relative URL) would make sign-in an open redirect.
 */
export function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
