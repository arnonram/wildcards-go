import { TriangleAlert } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import { Button } from '../components/ui/Button';
import { confirmAccountDeletion } from '../helpers/offline/account';
import { getActiveOwner, subscribeActive } from '../helpers/offline/active';

type Step = 'ready' | 'deleting' | 'signed-out' | 'invalid' | 'offline' | 'failed';

const unknownOwner = () => undefined;

const linkClass =
  'inline-flex h-9 items-center justify-center rounded-[var(--radius)] border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2';

/** Where the emailed delete-account link lands; deletion needs a click here. */
export default function DeleteAccount() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const owner = useSyncExternalStore<string | null | undefined>(
    subscribeActive,
    getActiveOwner,
    unknownOwner,
  );
  const [step, setStep] = useState<Step>('ready');

  const signInHref = `/sign-in?next=${encodeURIComponent(`/delete-account?token=${token}`)}`;
  const signedOut = owner === null || step === 'signed-out';

  const remove = async () => {
    if (!navigator.onLine) {
      setStep('offline');
      return;
    }
    setStep('deleting');
    try {
      const result = await confirmAccountDeletion(token);
      if (result === 'deleted') await router.replace('/');
      else setStep(result);
    } catch (error) {
      console.error('Could not delete the account:', error);
      setStep('failed');
    }
  };

  let body: ReactNode;
  if (!router.isReady || owner === undefined) {
    body = null;
  } else if (!token || step === 'invalid') {
    body = (
      <>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This link has expired or was already used. Ask for a new one from the account menu.
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/" className={linkClass}>
            Back home
          </Link>
        </div>
      </>
    );
  } else if (signedOut) {
    body = (
      <>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Sign in to the account you want to delete, in this browser, then you&apos;ll come back
          here to confirm.
        </p>
        <div className="mt-5 flex justify-center">
          <Link href={signInHref} className={linkClass}>
            Sign in to confirm
          </Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This permanently deletes your account and all its characters and portraits, here and on
          your other devices the next time they go online.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className={linkClass}>
            Keep my account
          </Link>
          <Button variant="danger" onClick={() => void remove()} disabled={step === 'deleting'}>
            Delete my account
          </Button>
        </div>
        {step === 'offline' && (
          <p className="mt-4 text-sm text-danger" role="alert">
            Deleting your account needs a connection.
          </p>
        )}
        {step === 'failed' && (
          <p className="mt-4 text-sm text-danger" role="alert">
            Could not delete the account. Try again in a moment.
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
        <title>Delete account — Wild Cards Go</title>
      </Head>
      <div className="mx-auto max-w-md rounded-[var(--radius)] border border-line-strong bg-surface px-6 py-8 text-center">
        <TriangleAlert size={24} className="mx-auto text-danger" />
        <h1 className="mt-3 font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          Delete account
        </h1>
        {body}
      </div>
    </>
  );
}
