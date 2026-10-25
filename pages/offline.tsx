import { CloudOff, RefreshCw } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '../components/ui/Button';

export default function Offline() {
  return (
    <>
      <Head>
        <title>Offline — Wild Cards Go</title>
      </Head>

      <div className="mx-auto max-w-md rounded-[var(--radius)] border border-dashed border-line-strong px-6 py-12 text-center">
        <CloudOff size={28} className="mx-auto text-accent" />
        <h1 className="mt-4 font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          You&apos;re offline
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Wild Cards Go keeps your latest character changes in this browser. Return home to keep
          working; every change syncs automatically when the connection comes back.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-[var(--radius)] border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            Back home
          </Link>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
            Try again
          </Button>
        </div>
      </div>
    </>
  );
}
