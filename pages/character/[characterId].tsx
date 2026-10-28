import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CharacterSheet from '../../components/character-sheet/CharacterSheet';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { subscribeActive } from '../../helpers/offline/active';
import { deleteCharacter } from '../../helpers/offline/characters';
import { useCharacter } from '../../helpers/offline/hooks';

export default function Character() {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const rawId = router.query.characterId;
  const characterId = Array.isArray(rawId) ? rawId[0] : rawId;
  const row = useCharacter(characterId);

  // Another account's store has no business showing this sheet.
  useEffect(() => subscribeActive(() => void router.replace('/')), [router]);

  const handleDelete = async () => {
    if (!characterId) return;
    setDeleteDialogOpen(false);
    // Leave first so the sheet never renders its own "not found" state.
    await router.push('/');
    await deleteCharacter(characterId);
  };

  if (!router.isReady || row === undefined) {
    return <p className="py-12 text-center text-sm text-muted">Loading character…</p>;
  }

  if (row === null || !characterId) {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">Character not found</p>
        <Link
          href="/"
          className="mt-2 inline-block text-xs text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          ← All characters
        </Link>
      </div>
    );
  }

  const character = row.data;

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

      <CharacterSheet
        key={characterId}
        characterId={characterId}
        wildCard={character}
        onDelete={() => setDeleteDialogOpen(true)}
      />

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
