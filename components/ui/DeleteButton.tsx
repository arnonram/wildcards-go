import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../helpers/cn';
import { useTranslation } from '../../helpers/context/locale-context';

export interface DeleteButtonProps {
  label: string;
  onDelete: () => void;
  className?: string;
}

/**
 * Two-step delete: the first click arms the button, the second confirms. This
 * keeps inline editing safe without interrupting the sheet with a modal.
 */
export function DeleteButton({ label, onDelete, className }: DeleteButtonProps) {
  const { t } = useTranslation();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          onDelete();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      aria-label={t(armed ? 'ui.delete.confirmLabel' : 'ui.delete.label', { label })}
      title={armed ? t('ui.delete.clickAgain') : t('ui.delete.label', { label })}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius)] text-faint transition-colors hover:bg-danger-soft hover:text-danger',
        armed ? 'gap-1 bg-danger-soft px-1.5 py-1 text-danger' : 'p-1',
        className,
      )}
    >
      {armed ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {t('ui.delete.sure')}
        </span>
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}
