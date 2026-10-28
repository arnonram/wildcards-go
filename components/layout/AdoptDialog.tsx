import { useState, useSyncExternalStore } from 'react';
import {
  acceptAdoption,
  dismissAdoption,
  getAdoption,
  subscribeAdoption,
} from '../../helpers/offline/active';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

const none = () => null;

/** Offers to add characters made on this device while signed out. */
export function AdoptDialog() {
  const adoption = useSyncExternalStore(subscribeAdoption, getAdoption, none);
  const [busy, setBusy] = useState(false);
  if (!adoption) return null;

  const add = async () => {
    setBusy(true);
    try {
      await acceptAdoption();
    } catch (error) {
      console.error('Could not add the characters to this account:', error);
    } finally {
      setBusy(false);
    }
  };

  const count = adoption.count;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && dismissAdoption()}
      title={`Add ${count} ${count === 1 ? 'character' : 'characters'} made on this device while signed out to your account?`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={dismissAdoption} disabled={busy}>
            Not now
          </Button>
          <Button onClick={() => void add()} disabled={busy}>
            Add
          </Button>
        </>
      }
    />
  );
}
