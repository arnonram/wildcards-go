import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from '../../helpers/context/locale-context';
import { downloadExport } from '../../helpers/offline/transfer';
import { Button } from '../ui/Button';

type Props = {
  characterId: string;
  name: string;
  /** The character's data: a new copy (say, a fix synced in) tries the sheet again. */
  data: unknown;
  onDelete: () => void;
  children: ReactNode;
};

/**
 * A character whose data the sheet can't render (an imported file that's
 * damaged, or a bug) would otherwise blank the whole page, on every device
 * it syncs to. This keeps the page up and offers what still works: exporting
 * the raw data and deleting the character.
 */
export class SheetErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Character ${this.props.characterId} failed to render:`, error, info);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.data !== this.props.data) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <DamagedCharacter
        onExport={() => void downloadExport({ id: this.props.characterId, name: this.props.name })}
        onDelete={this.props.onDelete}
      />
    );
  }
}

function DamagedCharacter({ onExport, onDelete }: { onExport: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="py-12 text-center">
      <p className="font-display text-lg font-semibold text-ink">
        {t('page.character.damagedTitle')}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {t('page.character.damagedDescription')}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={onExport}>{t('sheet.header.export')}</Button>
        <Button variant="danger" onClick={onDelete}>
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
