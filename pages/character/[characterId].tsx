import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import CharacterSheet from '../../components/character-sheet/CharacterSheet';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Character({ character }: { character: WildCardCharacter }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    await fetch(`/api/character/${character._id}`, {
      method: 'DELETE',
      headers: { 'Content-type': 'application/json' },
    });
    setDeleteDialogOpen(false);
    router.push('/');
  };

  if (!character) {
    return <p className="py-12 text-center text-sm text-muted">Loading character…</p>;
  }

  return (
    <>
      <Head>
        <title>{`${character.name || 'Unnamed Character'} — Wild Cards Go`}</title>
      </Head>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          ← All characters
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          Character sheet
        </span>
      </div>

      <CharacterSheet wildCard={character} onDelete={() => setDeleteDialogOpen(true)} />

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Character"
        description="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Are you sure you want to delete{' '}
          <strong className="font-semibold text-ink">{character.name || 'this character'}</strong>?
        </p>
      </Dialog>
    </>
  );
}

export async function getStaticPaths() {
  const response = await fetch(`${API_BASE}/api/character`, {
    method: 'GET',
    headers: { 'Content-type': 'application/json' },
  });
  const characters = await response.json();

  const paths = characters.map((char: Record<string, unknown>) => ({
    params: { characterId: char._id as string },
  }));
  return { paths, fallback: true };
}

export async function getStaticProps({ params }: { params: { characterId: string } }) {
  const res = await fetch(`${API_BASE}/api/character/${params.characterId}`);
  const character = await res.json();
  return { props: { character } };
}
