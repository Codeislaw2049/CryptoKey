import { Card } from '../ui/Card';
import { BookOpen, KeyRound, FileText, Globe, NotebookPen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModeSelectionProps {
  onSelect: (mode: 'general' | 'mnemonic' | 'file' | 'url', intent?: 'crypto' | 'password') => void;
}

export const ModeSelection = ({ onSelect }: ModeSelectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{t('wizard.modeSelection.title')}</h2>
        <p className="text-slate-400">{t('wizard.modeSelection.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Mnemonic Mode (Virtual Book) - Spans 3 cols */}
        <Card 
          className="md:col-span-3 cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('mnemonic', 'crypto')}
        >
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10 flex flex-col text-center space-y-3 md:space-y-4 h-full justify-center">
            <div className="p-3 md:p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform mx-auto">
              <KeyRound className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{t('wizard.modeSelection.mnemonic.title')}</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                {t('wizard.modeSelection.mnemonic.desc')}
              </p>
              <div className="mt-2 text-[10px] text-primary/80 bg-primary/5 px-2 py-1 rounded-full inline-block">
                {t('wizard.modeSelection.mnemonic.recommended', 'Recommended for most users')}
              </div>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• {t('wizard.modeSelection.mnemonic.features.compliance')}</li>
              <li>• {t('wizard.modeSelection.mnemonic.features.encryption')}</li>
              <li>• {t('wizard.modeSelection.mnemonic.features.security')}</li>
            </ul>
          </div>
        </Card>

        {/* Password Book (New) - Spans 3 cols */}
        <Card 
          className="md:col-span-3 cursor-pointer hover:border-pink-500/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('mnemonic', 'password')} // Reuses mnemonic mode logic but framed as Password Book
        >
          <div className="absolute inset-0 bg-pink-500/5 group-hover:bg-pink-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col text-center space-y-3 md:space-y-4 h-full justify-center">
            <div className="p-3 md:p-4 rounded-full bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform mx-auto">
              <NotebookPen className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{t('wizard.modeSelection.passwordBook.title', 'Lightweight Password Book')}</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                {t('wizard.modeSelection.passwordBook.desc', 'Encrypt passwords & notes into a portable index.')}
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• {t('wizard.modeSelection.passwordBook.features.anyText', 'Supports Any Text')}</li>
              <li>• {t('wizard.modeSelection.passwordBook.features.portable', 'Highly Portable')}</li>
              <li>• {t('wizard.modeSelection.passwordBook.features.secure', 'Military Grade')}</li>
            </ul>
          </div>
        </Card>

        {/* Physical Book Mode (Manual) - Spans 2 cols */}
        <Card 
          className="md:col-span-2 cursor-pointer hover:border-warning/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('general')}
        >
          <div className="absolute inset-0 bg-warning/5 group-hover:bg-warning/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-warning/10 text-warning group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('wizard.modeSelection.physical.title')}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {t('wizard.modeSelection.physical.desc')}
              </p>
            </div>
          </div>
        </Card>

        {/* Digital Book (File) Mode - Spans 2 cols */}
        <Card 
          className="md:col-span-2 cursor-pointer transition-all group relative overflow-hidden border-slate-800 hover:border-blue-500/50"
          onClick={() => onSelect('file')}
        >
          <div className="absolute inset-0 transition-colors bg-slate-900/50 group-hover:bg-blue-500/10" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('wizard.modeSelection.digital.title')}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {t('wizard.modeSelection.digital.desc')}
              </p>
            </div>
          </div>
        </Card>

        {/* Online Book (URL) Mode - Spans 2 cols */}
        <Card 
          className="md:col-span-2 cursor-pointer transition-all group relative overflow-hidden border-slate-800 hover:border-green-500/50"
          onClick={() => onSelect('url')}
        >
          <div className="absolute inset-0 transition-colors bg-slate-900/50 group-hover:bg-green-500/10" />

          <div className="relative z-10 flex flex-col text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform mx-auto">
              <Globe className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('wizard.modeSelection.url.title')}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {t('wizard.modeSelection.url.desc')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
