import Head from 'next/head';
import { useRouter } from 'next/router';
import LoadCharactersGrid from '../components/load-characters/LoadCharacterGrid';
import { Button } from '../components/ui/Button';

export default function LoadCharacter() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Load a Character — Wild Cards Go</title>
      </Head>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-1.5">
        <h1 className="font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          Load a Character
        </h1>
        <Button size="sm" variant="ghost" onClick={() => router.push('/')}>
          Back home
        </Button>
      </div>
      <LoadCharactersGrid />
    </>
  );
}
