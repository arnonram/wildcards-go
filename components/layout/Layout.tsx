import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { GitHubIcon } from '../ui/GitHubIcon';
import { AccountDeletedNotice } from './AccountDeletedNotice';
import { AccountMenu } from './AccountMenu';
import { AdoptDialog } from './AdoptDialog';
import { LanguageMenu } from './LanguageMenu';
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
            <LanguageMenu />
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
          <nav
            aria-label="Site"
            className="flex shrink-0 gap-4 text-xs sm:flex-col sm:gap-1.5 sm:self-stretch sm:border-r sm:border-line sm:pr-6"
          >
            <Link
              href="/privacy"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            <a
              href="mailto:feedback@orderofthenuts.club?subject=Wild%20Cards%20Go%20feedback"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Feedback
            </a>
            <a
              href="https://github.com/arnonram/wildcards-go"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-accent underline-offset-2 hover:underline"
            >
              <GitHubIcon className="size-3.5 shrink-0" />
              Source code
            </a>
          </nav>
          <p className="max-w-md text-xs leading-normal text-muted sm:ml-auto sm:text-right">
            This game references the Savage Worlds game system, available from Pinnacle
            Entertainment Group at{' '}
            <a
              href="https://www.peginc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              www.peginc.com
            </a>
            . Savage Worlds and all associated logos and trademarks are copyrights of Pinnacle
            Entertainment Group. Used with permission. Pinnacle makes no representation or warranty
            as to the quality, viability, or suitability for purpose of this product.
          </p>
          <Image
            src="/images/SW_LOGO_FP_2018-300x200-1.png"
            alt="Savage Worlds Fan License Logo"
            // The Fan License requires the logo "unaltered in size or dimension".
            width={300}
            height={200}
            // Short pages (e.g. home) show the footer on first paint, making
            // this the largest contentful paint; don't lazy-load it.
            loading="eager"
            className="shrink-0"
          />
        </div>
      </footer>
    </div>
  );
}
