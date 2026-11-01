import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CharacterSheet from '../../components/character-sheet/CharacterSheet';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useTranslation } from '../../helpers/context/locale-context';
import { subscribeActive } from '../../helpers/offline/active';
import { deleteCharacter } from '../../helpers/offline/characters';
import { useCharacter } from '../../helpers/offline/hooks';

export default function Character() {
  const router = useRouter();
  const { t } = useTranslation();
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
    return <p className="py-12 text-center text-sm text-muted">{t('page.character.loading')}</p>;
  }

  if (row === null || !characterId) {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">
          {t('page.character.notFound')}
        </p>
        <Link
          href="/"
          className="mt-2 inline-block text-xs text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          {t('page.character.back')}
        </Link>
      </div>
    );
  }

  const character = row.data;
  const [confirmBefore, confirmAfter] = t('page.character.deleteConfirm').split('{name}');

  return (
    <>
      <Head>
        <title>{`${character.name || t('page.character.unnamed')} — Wild Cards Go`}</title>
      </Head>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          {t('page.character.back')}
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          {t('page.character.label')}
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
        title={t('page.character.deleteTitle')}
        description={t('page.character.deleteDescription')}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {confirmBefore}
          <strong className="font-semibold text-ink">
            {character.name || t('page.character.thisCharacter')}
          </strong>
          {confirmAfter}
        </p>
      </Dialog>
    </>
  );
}
