import { CloudOff, CloudUpload, LogIn, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { cn } from '../../helpers/cn';
import { getActiveOwner, subscribeActive, syncNow } from '../../helpers/offline/active';
import { useSyncStatus } from '../../helpers/offline/hooks';

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function SyncStatus() {
  const status = useSyncStatus();
  const owner = useSyncExternalStore(subscribeActive, getActiveOwner, () => null);

  // Signed out there is nothing to sync; the header's "Sign in" covers it.
  if (!owner) return null;

  if (status.online && status.signedOut) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] px-2 text-[11px] font-medium text-warn transition-colors hover:bg-surface-2"
      >
        <LogIn size={14} />
        <span className="hidden sm:inline">Sign in to sync</span>
      </Link>
    );
  }

  if (status.online && status.pending === 0 && !status.lastError) return null;

  const label = !status.online
    ? 'Offline — saved locally'
    : status.syncing
      ? 'Syncing…'
      : status.lastError
        ? 'Sync failed — saved locally'
        : status.conflicts > 0
          ? plural(status.conflicts, 'conflict', 'conflicts')
          : plural(status.pending, 'change waiting', 'changes waiting');

  const tone = !status.online
    ? 'text-warn'
    : status.lastError || status.conflicts > 0
      ? 'text-danger'
      : status.syncing
        ? 'text-accent'
        : 'text-warn';

  return (
    <div
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] px-2 text-[11px] font-medium',
        tone,
      )}
      title={status.lastError ?? label}
      aria-label={label}
      role="status"
    >
      {status.online ? <CloudUpload size={14} /> : <CloudOff size={14} />}
      <span className="hidden sm:inline">{label}</span>
      {status.online && !status.syncing && (
        <button
          type="button"
          onClick={() => void syncNow({ force: true })}
          aria-label="Sync now"
          title="Sync now"
          className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  );
}
