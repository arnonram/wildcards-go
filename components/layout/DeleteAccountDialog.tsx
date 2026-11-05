import { Download } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  type DeletionMethod,
  getDeletionMethod,
  requestAccountDeletion,
} from '../../helpers/offline/account';
import { useCharacterList } from '../../helpers/offline/hooks';
import { downloadExport } from '../../helpers/offline/transfer';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field } from '../ui/Field';

type Step =
  | 'confirm'
  | 'sending'
  | 'sent'
  | 'offline'
  | 'failed'
  | 'wrong-password'
  | 'sign-in-again';

const ACTION: Record<DeletionMethod, string> = {
  email: 'Email me a confirmation link',
  password: 'Delete account',
  'recent-sign-in': 'Delete account',
};

/**
 * Explains what deleting removes, then confirms the way this account can:
 * an emailed link, its password, or a sign-in from the last few minutes.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('confirm');
  const [method, setMethod] = useState<DeletionMethod | null>(null);
  const [password, setPassword] = useState('');
  const characters = useCharacterList();

  useEffect(() => {
    if (!open) return;
    getDeletionMethod()
      .then(setMethod)
      .catch((error) => {
        console.error('Could not check how to delete the account:', error);
        setStep(navigator.onLine ? 'failed' : 'offline');
      });
  }, [open]);

  const change = (next: boolean) => {
    if (!next) {
      setStep('confirm');
      setPassword('');
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!method) return;
    setStep('sending');
    try {
      const result = await requestAccountDeletion({
        method,
        password: method === 'password' ? password : undefined,
      });
      if (result === 'deleted') {
        change(false);
        await router.replace('/');
        return;
      }
      setStep(result);
    } catch (error) {
      console.error('Could not delete the account:', error);
      setStep('failed');
    }
  };

  if (step === 'sent') {
    return (
      <Dialog
        open={open}
        onOpenChange={change}
        title="Check your email"
        description="Open the link in this browser, while you're signed in, to delete your account. It expires in 1 hour."
        size="sm"
        footer={<Button onClick={() => change(false)}>OK</Button>}
      />
    );
  }

  const signInAgain = () => {
    change(false);
    void router.push(`/sign-in?next=${encodeURIComponent(router.asPath)}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={change}
      title="Delete your account?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => change(false)}>
            Cancel
          </Button>
          {step === 'sign-in-again' ? (
            <Button onClick={signInAgain}>Sign in again</Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => void confirm()}
              disabled={
                !method || step === 'sending' || (method === 'password' && password.length === 0)
              }
            >
              {method ? ACTION[method] : 'Delete account'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-2 text-sm leading-relaxed text-muted">
        <p>
          This permanently deletes your account and all its characters and portraits from the
          server, and removes them from this device.
        </p>
        <p>
          Other devices remove their copy the next time they go online. Characters you made while
          signed out are not affected.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-2">
          <span>Want to keep your characters? Export them first.</span>
          <Button size="sm" onClick={() => void downloadExport()} disabled={!characters?.length}>
            <Download size={13} />
            Export characters
          </Button>
        </div>
        {method === 'email' && (
          <p>We&apos;ll email you a link to confirm. Open it in this browser.</p>
        )}
        {method === 'password' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            <Field
              label="Your password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </form>
        )}
        {step === 'offline' && (
          <p className="text-danger" role="alert">
            Deleting your account needs a connection.
          </p>
        )}
        {step === 'wrong-password' && (
          <p className="text-danger" role="alert">
            That password is not right.
          </p>
        )}
        {step === 'sign-in-again' && (
          <p className="text-danger" role="alert">
            For safety, sign in again, then delete within 5 minutes.
          </p>
        )}
        {step === 'failed' && (
          <p className="text-danger" role="alert">
            {method === 'email'
              ? 'Could not send the email. Try again in a moment.'
              : 'Could not delete the account. Try again in a moment.'}
          </p>
        )}
      </div>
    </Dialog>
  );
}
