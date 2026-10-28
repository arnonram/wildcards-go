import { useSyncExternalStore } from 'react';
import {
  dismissDeletedNotice,
  getDeletedNotice,
  subscribeDeletedNotice,
} from '../../helpers/offline/account';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

const hidden = () => false;

export function AccountDeletedNotice() {
  const open = useSyncExternalStore(subscribeDeletedNotice, getDeletedNotice, hidden);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && dismissDeletedNotice()}
      title="Account deleted"
      description="This account was deleted. Its characters were removed from this device."
      size="sm"
      footer={<Button onClick={dismissDeletedNotice}>OK</Button>}
    />
  );
}
