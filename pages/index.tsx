import { FolderOpen, Plus, Sparkles } from 'lucide-react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { CharacterCard } from '../components/home/CharacterCard';
import { PageMeta } from '../components/PageMeta';
import { AppLogo } from '../components/ui/AppLogo';
import { Button } from '../components/ui/Button';
import { createCharacter } from '../helpers/offline/characters';
import { useCharacterList } from '../helpers/offline/hooks';

const DESCRIPTION =
  'Free Savage Worlds character sheet for phone and desktop. Track bennies, wounds, edges, hindrances and gear. Works offline and syncs across devices.';

const FEATURES: [string, string][] = [
  [
    'The whole sheet',
    'Attributes, skills, edges, hindrances, powers, weapons, armor and gear in one place.',
  ],
  ['Track play as it happens', 'Bennies, wounds, fatigue and conviction, a tap away.'],
  ['Works offline', 'Install it like an app. No connection needed at the table.'],
  ['Sync across devices', 'Sign in to keep your characters up to date on every device.'],
  ['Export and import', 'Save a character to a file as a backup, or load it on another device.'],
  ['Your language', 'English, Deutsch, Español, Français and Português (Brasil).'],
];

const FAQ: [string, string][] = [
  ['Is it free?', 'Yes. No ads, no tracking, and the code is open source.'],
  [
    'Do I need an account?',
    'No. Characters are saved on your device. Sign in only if you want them synced to your other devices.',
  ],
  [
    'Can I run my own copy?',
    'Yes. It runs from one Docker container, for your group or just for you.',
  ],
];

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Wild Cards Go',
  description: DESCRIPTION,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const Home: NextPage = () => {
  const router = useRouter();
  const list = useCharacterList();
  const characters = list ?? [];
  const isLoading = list === undefined;
  const [isCreating, setCreating] = useState(false);

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const characterId = await createCharacter();
      await router.push(`/character/${encodeURIComponent(characterId)}`);
    } catch (error) {
      console.error('Failed to create character:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Wild Cards Go — Free Savage Worlds Character Sheet"
        description={DESCRIPTION}
        path="/"
      />
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </Head>

      <section className="border-b border-line pb-8 pt-4 sm:pt-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
            Savage Worlds character sheet
          </span>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[0.04em] text-heading sm:text-5xl">
            Wild Cards on-the-go
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Carry your Wildcards from the table to the sofa. Track bennies, wounds, edges and gear
            without hauling the book.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={handleCreateNew} disabled={isCreating}>
              <Plus size={15} />
              {isCreating ? 'Creating…' : 'Create Wildcard'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/load-character')}>
              <FolderOpen size={15} />
              Load Wildcard
            </Button>
          </div>
          <AppLogo className="mt-8 h-auto w-40 text-ink sm:w-48" />
        </div>
      </section>

      <section className="pt-8" aria-labelledby="characters-title">
        <div className="mb-3 flex items-end justify-between gap-3 border-b border-line pb-1.5">
          <h2
            id="characters-title"
            className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-heading"
          >
            Your Characters
          </h2>
          {!isLoading && characters.length > 0 && (
            <span className="text-xs tabular-nums text-faint">{characters.length}</span>
          )}
        </div>

        {isLoading ? (
          <div className="ui-delayed grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[92px] animate-pulse rounded-[var(--radius)] border border-line bg-surface"
              />
            ))}
          </div>
        ) : characters.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-line-strong px-6 py-12 text-center">
            <Sparkles size={20} className="mx-auto text-accent" />
            <p className="mt-3 font-display text-lg font-semibold text-ink">No characters yet</p>
            <p className="mt-1 text-sm text-muted">Create your first Wildcard to get started.</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={handleCreateNew}
              disabled={isCreating}
            >
              <Plus size={15} />
              {isCreating ? 'Creating…' : 'Create Wildcard'}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <CharacterCard key={character._id} character={character} />
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            href="/load-character"
            className="text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            Manage characters
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl pt-12 pb-4" aria-labelledby="about-title">
        <h2
          id="about-title"
          className="border-b border-line pb-1.5 font-display text-lg font-semibold uppercase tracking-[0.08em] text-heading"
        >
          About Wild Cards Go
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          A free, open-source character sheet for Savage Worlds Adventure Edition (SWADE). Build
          your Wildcard once and keep it with you at the table, on your phone or on your laptop.
        </p>
        <ul className="mt-4 grid gap-x-6 gap-y-3 text-sm leading-relaxed text-muted sm:grid-cols-2">
          {FEATURES.map(([title, text]) => (
            <li key={title}>
              <span className="font-semibold text-ink">{title}.</span> {text}
            </li>
          ))}
        </ul>

        <h3 className="mt-8 font-display text-base font-semibold uppercase tracking-[0.08em] text-heading">
          Questions
        </h3>
        <div className="mt-2 divide-y divide-line border-y border-line">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-ink marker:text-faint">
                {question}
              </summary>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
