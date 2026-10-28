import { FolderOpen, Plus, Sparkles } from 'lucide-react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { CharacterCard } from '../components/home/CharacterCard';
import { Button } from '../components/ui/Button';
import { createCharacter } from '../helpers/offline/characters';
import { useCharacterList } from '../helpers/offline/hooks';

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
      <Head>
        <title>Wild Cards Go</title>
        <meta name="description" content="Have your Savage Worlds characters with you anywhere" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section className="border-b border-line pb-8 pt-4 sm:pt-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
            Savage Worlds
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
          <Image
            src="/images/SW_LOGO_FP_2018-300x200-1.png"
            alt="Savage Worlds"
            width={180}
            height={120}
            className="mt-8 h-auto w-36 object-contain opacity-90 sm:w-44"
          />
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
    </>
  );
};

export default Home;
