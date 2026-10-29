import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountDeletedNotice } from './AccountDeletedNotice';
import { AccountMenu } from './AccountMenu';
import { AdoptDialog } from './AdoptDialog';
import { SyncStatus } from './SyncStatus';
import { ModeToggle, SkinMenu } from './ThemeControls';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-[var(--appbar-h)] w-full max-w-7xl items-center gap-3 px-4">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-[0.08em] text-heading transition-opacity hover:opacity-80"
          >
            Wild Cards Go
          </Link>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-faint sm:inline">
            Savage Worlds
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SyncStatus />
            <AccountMenu />
            <SkinMenu />
            <ModeToggle />
          </div>
        </div>
      </header>

      <AdoptDialog />
      <AccountDeletedNotice />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">{children}</div>
      </main>

      <footer className="border-t border-line bg-bg-deep/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-6 text-center sm:flex-row sm:text-left">
          <p className="max-w-2xl text-xs leading-relaxed text-muted">
            This product uses the{' '}
            <a
              href="https://peginc.com/licensing/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Savage Worlds Fan License
            </a>
            . Savage Worlds and all associated logos and trademarks are copyrights of Pinnacle
            Entertainment Group.{' '}
            <Link
              href="/privacy"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
          </p>
          <Image
            src="/images/SW_LOGO_FP_2018-300x200-1.png"
            alt="Savage Worlds Fan License Logo"
            width={120}
            height={80}
            className="h-auto w-24 object-contain sm:ml-auto"
          />
        </div>
      </footer>
    </div>
  );
}
