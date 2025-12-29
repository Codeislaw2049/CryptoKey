import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'zh', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
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
    const current = languages.find(l => i18n.language.startsWith(l.code));
    return current ? current.label : 'English';
  };

  const handleLanguageChange = (langCode: string) => {
    localStorage.setItem('i18nextLng', langCode);
    
    if (langCode === 'zh') {
       // Switch to Chinese entry point if not already there
       if (!window.location.pathname.includes('index_zh.html')) {
           window.location.href = '/index_zh.html';
           return;
       }
    } else {
       // For others, if we are currently in index_zh.html, go to root
       if (window.location.pathname.includes('index_zh.html')) {
           window.location.href = '/';
           return;
       }
    }
    
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 left-4 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 md:px-3 md:py-1.5 rounded-full bg-slate-900/80 border border-slate-700 hover:border-primary/50 backdrop-blur-sm transition-all hover:bg-slate-800 text-slate-300 hover:text-white group"
        title="Change Language"
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
              {i18n.language.startsWith(lang.code) && <Check size={12} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
