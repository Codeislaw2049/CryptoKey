import { Card } from '../ui/Card';
import { BookOpen, KeyRound, FileText, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModeSelectionProps {
  onSelect: (mode: 'general' | 'mnemonic' | 'file' | 'url') => void;
}

export const ModeSelection = ({ onSelect }: ModeSelectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{t('wizard.modeSelection.title')}</h2>
        <p className="text-slate-400">{t('wizard.modeSelection.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Mnemonic Mode (Virtual Book) */}
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('mnemonic')}
        >
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <KeyRound className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{t('wizard.modeSelection.mnemonic.title')}</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                {t('wizard.modeSelection.mnemonic.desc')}
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• {t('wizard.modeSelection.mnemonic.features.compliance')}</li>
              <li>• {t('wizard.modeSelection.mnemonic.features.encryption')}</li>
              <li>• {t('wizard.modeSelection.mnemonic.features.security')}</li>
            </ul>
          </div>
        </Card>

        {/* Physical Book Mode (Manual) */}
        <Card 
          className="cursor-pointer hover:border-warning/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('general')}
        >
          <div className="absolute inset-0 bg-warning/5 group-hover:bg-warning/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-warning/10 text-warning group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{t('wizard.modeSelection.physical.title')}</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                {t('wizard.modeSelection.physical.desc')}
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• {t('wizard.modeSelection.physical.features.manual')}</li>
              <li>• {t('wizard.modeSelection.physical.features.ownBook')}</li>
              <li>• {t('wizard.modeSelection.physical.features.flexible')}</li>
            </ul>
          </div>
        </Card>

        {/* Digital Book (File) Mode */}
        <Card 
          className="cursor-pointer hover:border-blue-500/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('file')}
        >
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{t('wizard.modeSelection.digital.title')}</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                {t('wizard.modeSelection.digital.desc')}
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• {t('wizard.modeSelection.digital.features.local')}</li>
              <li>• {t('wizard.modeSelection.digital.features.noUpload')}</li>
              <li>• {t('wizard.modeSelection.digital.features.offline')}</li>
            </ul>
          </div>
        </Card>

        {/* Online Book (URL) Mode */}
        <Card 
          className="cursor-pointer hover:border-green-500/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('url')}
        >
          <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{t('wizard.modeSelection.url.title')}</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                {t('wizard.modeSelection.url.desc')}
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• {t('wizard.modeSelection.url.features.remote')}</li>
              <li>• {t('wizard.modeSelection.url.features.convenient')}</li>
              <li>• {t('wizard.modeSelection.url.features.dynamic')}</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};
