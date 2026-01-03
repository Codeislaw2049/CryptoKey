import { useTranslation } from 'react-i18next';
import { cn } from './Button';

export const ProBadge = ({ className }: { className?: string }) => {
  const { t } = useTranslation();

  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm border border-amber-400/20 ml-2 uppercase tracking-wider select-none cursor-help", className)} title={t('proBadge.tooltip')}>
      {t('proBadge.text')}
    </span>
  );
};
