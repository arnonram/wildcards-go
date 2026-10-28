import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getRememberedAccount, signOutOfDevice } from '../../helpers/offline/account';
import { getActiveOwner, subscribeActive } from '../../helpers/offline/active';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Menu } from '../ui/Menu';

const serverOwner = () => null;

export function AccountMenu() {
  const router = useRouter();
  const owner = useSyncExternalStore(subscribeActive, getActiveOwner, serverOwner);
  // Read storage only once `owner` is set: during hydration it is the server
  // snapshot (null), so the first render matches the server's "Sign in".
  const account = useMemo(() => (owner ? getRememberedAccount() : null), [owner]);
  const [unsynced, setUnsynced] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const answer = useRef<((proceed: boolean) => void) | null>(null);

  if (!account) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(router.asPath)}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] px-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <LogIn size={16} />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const confirmUnsynced = (count: number) =>
    new Promise<boolean>((resolve) => {
      answer.current = resolve;
      setUnsynced(count);
    });

  const close = (proceed: boolean) => {
    answer.current?.(proceed);
    answer.current = null;
    setUnsynced(0);
  };

  const signOut = async () => {
    try {
      const result = await signOutOfDevice(confirmUnsynced);
      if (result === 'offline') setNotice('Signing out needs a connection');
    } catch (error) {
      console.error('Sign-out failed:', error);
      setNotice('Could not sign out. Try again in a moment.');
    }
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Account: ${account.name}`}
          title={account.name}
          className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          {account.image ? (
            // biome-ignore lint/performance/noImgElement: provider avatars come from arbitrary hosts
            <img src={account.image} alt="" className="size-7 rounded-full object-cover" />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft">
              {account.name.charAt(0).toUpperCase()}
            </span>
          )}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end" className="z-50">
            <Menu.Popup className="ui-popup min-w-56 rounded-[var(--radius)] border border-line-strong bg-surface p-1 shadow-xl">
              <div className="truncate px-2 py-1.5 text-sm text-muted">{account.name}</div>
              <Menu.Item
                onClick={() => void signOut()}
                className="flex cursor-default select-none items-center rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-2"
              >
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog
        open={unsynced > 0}
        onOpenChange={(open) => !open && close(false)}
        title="Sign out?"
        description={`${unsynced} ${unsynced === 1 ? 'change' : 'changes'} on this device haven't synced yet. They'll sync next time you sign in here.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button onClick={() => close(true)}>Sign out</Button>
          </>
        }
      />

      <Dialog
        open={notice !== null}
        onOpenChange={(open) => !open && setNotice(null)}
        title={notice ?? ''}
        size="sm"
        footer={<Button onClick={() => setNotice(null)}>OK</Button>}
      />
    </>
  );
}
