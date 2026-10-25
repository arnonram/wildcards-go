import { useState } from 'react';
import type { CharToLoad } from '../../dtos/CharToLoad';
import { deleteCharacter } from '../../helpers/offline/characters';
import { useCharacterList } from '../../helpers/offline/hooks';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog';
import { CharacterCard } from '../home/CharacterCard';

export default function LoadCharactersGrid() {
  const list = useCharacterList();
  const listOfChars = list ?? [];
  const [deleteTarget, setDeleteTarget] = useState<CharToLoad | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCharacter(deleteTarget._id);
    setDeleteTarget(null);
  };

  if (list === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-[var(--radius)] border border-line bg-surface"
          />
        ))}
      </div>
    );
  }

  if (listOfChars.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-line-strong px-6 py-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">No characters found</p>
        <p className="mt-1 text-sm text-muted">Create a new Wildcard to get started.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listOfChars.map((character) => (
          <CharacterCard
            key={character._id}
            character={character}
            onDelete={(target) => setDeleteTarget(target)}
          />
        ))}
      </div>
      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        characterName={deleteTarget?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
