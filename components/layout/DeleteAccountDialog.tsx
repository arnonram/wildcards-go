import { Download } from 'lucide-react';
import { useState } from 'react';
import { requestAccountDeletion } from '../../helpers/offline/account';
import { useCharacterList } from '../../helpers/offline/hooks';
import { downloadExport } from '../../helpers/offline/transfer';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

type Step = 'confirm' | 'sending' | 'sent' | 'offline' | 'failed';

/** Explains what deleting removes, then emails a confirmation link. */
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('confirm');
  const characters = useCharacterList();

  const change = (next: boolean) => {
    if (!next) setStep('confirm');
    onOpenChange(next);
  };

  const send = async () => {
    setStep('sending');
    try {
      setStep(await requestAccountDeletion());
    } catch (error) {
      console.error('Could not request account deletion:', error);
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
          <Button variant="danger" onClick={() => void send()} disabled={step === 'sending'}>
            Email me a confirmation link
          </Button>
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
        <p>We&apos;ll email you a link to confirm. Open it in this browser.</p>
        {step === 'offline' && (
          <p className="text-danger" role="alert">
            Deleting your account needs a connection.
          </p>
        )}
        {step === 'failed' && (
          <p className="text-danger" role="alert">
            Could not send the email. Try again in a moment.
          </p>
        )}
      </div>
    </Dialog>
  );
}
