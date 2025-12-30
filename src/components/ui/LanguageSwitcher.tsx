import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: t('languages.en') },
    { code: 'zh', label: t('languages.zh') },
    { code: 'zh-TW', label: t('languages.zhTW') },
    { code: 'ja', label: t('languages.ja') },
    { code: 'ko', label: t('languages.ko') },
    { code: 'hi', label: t('languages.hi') },
    { code: 'vi', label: t('languages.vi') },
    { code: 'tr', label: t('languages.tr') },
    { code: 'pt', label: t('languages.pt') },
    { code: 'id', label: t('languages.id') },
    { code: 'fr', label: t('languages.fr') },
    { code: 'de', label: t('languages.de') },
    { code: 'es', label: t('languages.es') },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentLangLabel = () => {
    const current = languages.find(l => i18n.language === l.code);
    return current ? current.label : t('languages.en');
  };

  const handleLanguageChange = (langCode: string) => {
    localStorage.setItem('i18nextLng', langCode);
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 left-4 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 md:px-3 md:py-1.5 rounded-full bg-slate-900/80 border border-slate-700 hover:border-primary/50 backdrop-blur-sm transition-all hover:bg-slate-800 text-slate-300 hover:text-white group"
        title={t('languageSwitcher.changeLanguage')}
      >
        <Globe size={16} className="text-primary group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-medium hidden md:block">{getCurrentLangLabel()}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 hidden md:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-24 md:w-32 py-1 rounded-xl bg-slate-900 border border-slate-700 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <span>{lang.label}</span>
              {i18n.language === lang.code && <Check size={12} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
