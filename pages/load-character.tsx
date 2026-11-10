import { Download, Upload } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';
import LoadCharactersGrid from '../components/load-characters/LoadCharacterGrid';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useCharacterList } from '../helpers/offline/hooks';
import { downloadExport, importCharacters } from '../helpers/offline/transfer';

export default function LoadCharacter() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const characters = useCharacterList();

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const count = await importCharacters(await file.text());
      setNotice(`Imported ${count} ${count === 1 ? 'character' : 'characters'}.`);
    } catch (error) {
      console.error('Import failed:', error);
      setNotice(error instanceof Error ? error.message : 'Could not import that file.');
    } finally {
      input.value = '';
    }
  };

  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
        <title>Load a Character — Wild Cards Go</title>
      </Head>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-1.5">
        <h1 className="font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          Load a Character
        </h1>
        <div className="flex flex-wrap gap-1">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
            <Upload size={13} />
            Import
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void downloadExport()}
            disabled={!characters?.length}
          >
            <Download size={13} />
            Export all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push('/')}>
            Back home
          </Button>
        </div>
      </div>
      <LoadCharactersGrid />
      <Dialog
        open={notice !== null}
        onOpenChange={(open) => !open && setNotice(null)}
        title={notice ?? ''}
        size="sm"
        footer={<Button onClick={() => setNotice(null)}>OK</Button>}
      />
    </>
  );
}
