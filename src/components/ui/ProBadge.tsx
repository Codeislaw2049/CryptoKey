import { useTranslation } from 'react-i18next';

export const ProBadge = () => {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm border border-amber-400/20 ml-2 uppercase tracking-wider select-none cursor-help" title={t('proBadge.tooltip')}>
      {t('proBadge.text')}
    </span>
  );
};
