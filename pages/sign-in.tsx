import { CloudOff, MailCheck } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { type FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { authClient } from '../helpers/auth-client';
import { safeNext } from '../helpers/safe-next';

type Providers = { google: boolean; discord: boolean };

function subscribeOnline(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export default function SignIn() {
  const router = useRouter();
  const next = safeNext(router.query.next);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [providers, setProviders] = useState<Providers>({ google: false, discord: false });
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!online) return;
    fetch('/api/providers')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Providers | null) => body && setProviders(body))
      .catch(() => {});
  }, [online]);

  const social = async (provider: 'google' | 'discord') => {
    setError(null);
    const { error: failed } = await authClient.signIn.social({ provider, callbackURL: next });
    if (failed) setError(failed.message ?? 'Sign-in failed. Try again.');
  };

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: failed } = await authClient.signIn.magicLink({ email, callbackURL: next });
    setBusy(false);
    if (failed) setError(failed.message ?? 'Could not send the link. Try again.');
    else setSent(true);
  };

  return (
    <>
      <Head>
        <title>Sign in — Wild Cards Go</title>
      </Head>

      <div className="mx-auto max-w-sm rounded-[var(--radius)] border border-line-strong bg-surface px-6 py-8">
        <h1 className="text-center font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          Sign in
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
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            {providers.google && (
              <Button variant="outline" onClick={() => void social('google')}>
                Continue with Google
              </Button>
            )}
            {providers.discord && (
              <Button variant="outline" onClick={() => void social('discord')}>
                Continue with Discord
              </Button>
            )}
            {(providers.google || providers.discord) && (
              <p className="my-2 text-center text-[10px] uppercase tracking-[0.2em] text-faint">
                or
              </p>
            )}
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
