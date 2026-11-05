import { CloudOff, MailCheck } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { type FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { DiscordIcon, GoogleIcon } from '../components/ui/BrandIcons';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { authClient } from '../helpers/auth-client';
import { clearInviteCookie, SIGN_UP_REFUSALS, setInviteCookie } from '../helpers/invite-cookie';
import { safeNext } from '../helpers/safe-next';
import type { SignInOptions } from '../server/sign-in-options';

function subscribeOnline(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

type AuthError = { code?: string; message?: string } | null | undefined;

/** Our own refusals read the same whichever sign-in method hit them. */
function describe(error: AuthError, fallback: string): string {
  if (error?.code && error.code in SIGN_UP_REFUSALS) {
    return SIGN_UP_REFUSALS[error.code as keyof typeof SIGN_UP_REFUSALS];
  }
  return error?.message || fallback;
}

/**
 * The methods come from `/api/providers` at load, not from the build: a
 * Docker image is built once and configured when it runs.
 */
export default function SignIn() {
  const router = useRouter();
  const next = safeNext(router.query.next);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [options, setOptions] = useState<SignInOptions | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [creating, setCreating] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped by "Try again"; each change refetches the options.
  const [attempt, setAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` exists to trigger a refetch
  useEffect(() => {
    if (!online) return;
    setLoadFailed(false);
    fetch('/api/providers')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((body: SignInOptions) => setOptions(body))
      .catch(() => setLoadFailed(true));
  }, [online, attempt]);

  // A refused OAuth sign-up comes back here as `?error=<code>`.
  useEffect(() => {
    const code = router.query.error;
    if (typeof code === 'string') setError(describe({ code }, 'Sign-in failed. Try again.'));
  }, [router.query.error]);

  /** In create mode, every call that may create an account carries the invite. */
  const withInvite = () => {
    if (creating && invite) setInviteCookie(invite);
    else clearInviteCookie();
  };

  const social = async (provider: 'google' | 'discord') => {
    setError(null);
    withInvite();
    const { error: failed } = await authClient.signIn.social({ provider, callbackURL: next });
    if (failed) setError(describe(failed, 'Sign-in failed. Try again.'));
  };

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    withInvite();
    const { error: failed } = await authClient.signIn.magicLink({ email, callbackURL: next });
    setBusy(false);
    if (failed) setError(describe(failed, 'Could not send the link. Try again.'));
    else setSent(true);
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    withInvite();
    const { error: failed } = creating
      ? // The server replaces the email with a placeholder; none is asked for.
        await authClient.signUp.email({ username, password, name: username, email: '' })
      : await authClient.signIn.username({ username, password });
    setBusy(false);
    if (failed) {
      setError(describe(failed, creating ? 'Could not create the account.' : 'Sign-in failed.'));
      return;
    }
    clearInviteCookie();
    // A full load, like the email-link and OAuth redirects: the app opens the
    // account's own store at start, so a client-side route change would keep
    // writing to the signed-out one.
    window.location.assign(next);
  };

  const canCreate = options !== null && options.signUp !== 'closed';
  const needsInvite = options?.signUp === 'invite';
  const linkOrSocial = options !== null && (options.google || options.discord || options.email);

  return (
    <>
      <Head>
        <title>Sign in — Wild Cards Go</title>
      </Head>

      <div className="mx-auto max-w-sm rounded-[var(--radius)] border border-line-strong bg-surface px-6 py-8">
        <h1 className="text-center font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          {creating ? 'Create account' : 'Sign in'}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Signing in syncs your characters across your devices.
        </p>

        {!online ? (
          <div className="mt-6 text-center">
            <CloudOff size={24} className="mx-auto text-accent" />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Signing in needs a connection. You can keep playing; your characters will sync after
              you sign in.
            </p>
          </div>
        ) : sent ? (
          <div className="mt-6 text-center" role="status">
            <MailCheck size={24} className="mx-auto text-accent" />
            <p className="mt-3 font-medium text-ink">Check your email</p>
            <p className="mt-1 text-sm text-muted">
              We sent a sign-in link to {email}. It expires in 5 minutes.
            </p>
          </div>
        ) : options === null && loadFailed ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted" role="alert">
              Couldn&apos;t load the sign-in options.
            </p>
            <Button className="mt-3" variant="outline" onClick={() => setAttempt(attempt + 1)}>
              Try again
            </Button>
          </div>
        ) : options === null ? (
          <p className="mt-6 text-center text-sm text-muted" role="status">
            Loading sign-in options…
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            {creating && needsInvite && (
              <Field
                label="Invite code"
                hint="From whoever runs this server."
                autoComplete="off"
                value={invite}
                onChange={(event) => setInvite(event.target.value)}
                containerClassName="mb-2"
              />
            )}
            {options.google && (
              <Button variant="outline" onClick={() => void social('google')}>
                <GoogleIcon />
                Continue with Google
              </Button>
            )}
            {options.discord && (
              <Button variant="outline" onClick={() => void social('discord')}>
                <DiscordIcon />
                Continue with Discord
              </Button>
            )}
            {(options.google || options.discord) && options.email && <Or />}
            {options.email && (
              <form onSubmit={(event) => void sendLink(event)} className="flex flex-col gap-2">
                <Field
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button type="submit" disabled={busy || !email}>
                  Email me a sign-in link
                </Button>
              </form>
            )}
            {linkOrSocial && options.password && <Or />}
            {options.password && (
              <form
                onSubmit={(event) => void submitPassword(event)}
                className="flex flex-col gap-2"
              >
                <Field
                  label="Username"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <Field
                  label="Password"
                  type="password"
                  required
                  minLength={creating ? options.passwordMinLength : undefined}
                  hint={creating ? `At least ${options.passwordMinLength} characters.` : undefined}
                  autoComplete={creating ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  type="submit"
                  disabled={busy || !username || !password || (creating && needsInvite && !invite)}
                >
                  {creating ? 'Create account' : 'Sign in'}
                </Button>
              </form>
            )}
            {canCreate && (options.password || needsInvite) && (
              <div className="mt-4 border-t border-line pt-4 text-center">
                <p className="text-sm text-muted">
                  {creating ? 'Already have an account?' : 'New here?'}
                </p>
                <Button
                  type="button"
                  variant={creating ? 'ghost' : 'outline'}
                  className="mt-2 w-full"
                  onClick={() => {
                    setCreating(!creating);
                    setError(null);
                  }}
                >
                  {creating ? 'Sign in instead' : 'Create an account'}
                </Button>
              </div>
            )}
            {options.signUp === 'closed' && (
              <p className="mt-2 text-center text-xs text-muted">
                {SIGN_UP_REFUSALS.SIGN_UP_CLOSED}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

function Or() {
  return <p className="my-2 text-center text-[10px] uppercase tracking-[0.2em] text-faint">or</p>;
}
