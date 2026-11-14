import Link from 'next/link';
import { useTranslation } from '../../helpers/context/locale-context';

export function BackLink() {
  const { t } = useTranslation();
  return (
    <Link
      href="/"
      className="whitespace-nowrap text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
    >
      {t('page.character.back')}
    </Link>
  );
}
