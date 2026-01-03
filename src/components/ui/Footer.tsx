import { ShieldCheck, Github, Send, RefreshCw, Share2, Download } from 'lucide-react';
import { APP_VERSION } from '../../version';
import { IntegrityCheck } from './IntegrityCheck';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ReferralModal } from './ReferralModal';

export const Footer = () => {
  const { t } = useTranslation();
  const [showReferral, setShowReferral] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const currentYear = new Date().getUTCFullYear();
  const nextYear = currentYear + 1;

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleRefresh = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    window.location.reload();
  };

  const handleShare = async () => {
    const shareData = {
      title: t('footerExtra.shareTitle'),
      text: t('footer.description').replace('\n', ' '), // Flatten description for share text
      url: 'https://cryptokey.im',
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error(t('errors.shareApiNotSupported'));
      }
    } catch (err: any) {
      // Ignore user cancellation
      if (err.name === 'AbortError') return;

      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText('https://cryptokey.im');
        alert(t('footer.linkCopied'));
      } catch (clipboardErr) {
        console.error('Clipboard failed:', clipboardErr);
      }
    }
  };

  return (
    <>
      <footer className="mt-4 border-t border-slate-800/50 bg-slate-900/20 backdrop-blur-sm py-8" data-build-version={APP_VERSION} data-force-refresh="20260104-1">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Brand & Version */}
            <div className="text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2">
                  <Link to="/" className="flex items-center gap-2 text-slate-200 font-bold hover:text-white transition-colors">
                    <ShieldCheck size={20} className="text-primary" />
                    <span>{t('footerExtra.brandName')}</span>
                  </Link>
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-400">
                    <span>v{APP_VERSION}</span>
                    <button
                      onClick={handleRefresh}
                      className="ml-1 hover:text-white transition-colors"
                      title={t('footer.forceUpdate')}
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
              </div>
              <p className="text-xs text-slate-500 max-w-xs whitespace-pre-line">
                {t('footer.description')}
              </p>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-wrap gap-4 md:gap-6 text-sm font-medium text-slate-400 justify-center md:justify-start">
              <Link to="/?tab=passwords" className="hover:text-primary transition-colors">{t('home.tabs.passwords', 'Passwords')}</Link>
              <Link to="/?tab=invite" className="hover:text-primary transition-colors">{t('home.tabs.invite', 'Invite')}</Link>
              <button
                onClick={() => setShowReferral(true)}
                className="hover:text-primary transition-colors"
              >
                {t('nav.invite')}
              </button>
              <Link to="/pricing" className="hover:text-primary transition-colors">{t('footer.links.pricing')}</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">{t('footer.links.terms')}</Link>
            </div>

            {/* Social & Links */}
            <div className="flex gap-6 text-slate-400">
              <a
                href="https://github.com/Codeislaw2049/CryptoKey"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex flex-col items-center gap-1 group"
                title={t('footer.publicRepo')}
              >
                <Github size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px]">{t('footer.links.source')}</span>
              </a>
              <a
                href="https://t.me/C_2046"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors flex flex-col items-center gap-1 group"
              >
                <Send size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px]">{t('footer.telegram')}</span>
              </a>
              <a 
                href="https://x.com/CryptoKeyim" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-slate-200 transition-colors flex flex-col items-center gap-1 group"
              >
                {/* X.com Logo */}
                <svg 
                  viewBox="0 0 24 24" 
                  width="20" 
                  height="20" 
                  className="fill-current group-hover:scale-110 transition-transform"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-[10px]">{t('footer.twitter')}</span>
              </a>
              <button
                onClick={handleShare}
                className="hover:text-primary transition-colors flex flex-col items-center gap-1 group"
                title={t('footer.share')}
              >
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px]">{t('footer.links.share')}</span>
              </button>
              
              {deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="hover:text-primary transition-colors flex flex-col items-center gap-1 group animate-bounce"
                  title="Install App"
                >
                  <Download size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px]">{t('footer.links.install', 'Install')}</span>
                </button>
              )}
            </div>

          </div>

          {/* Copyright & License */}
          <div className="mt-8 pt-8 border-t border-slate-800/30 text-center space-y-4">
            <div className="flex justify-center gap-4 mb-4">
              <IntegrityCheck />
            </div>
            
            <div className="text-[10px] text-slate-600 space-y-1">
              <p>
                {t('footer.copyright', { year: currentYear, nextYear: nextYear })}
              </p>
              <p className="text-slate-500">
                {t('footer.license')}
              </p>
            </div>
          </div>
        </div>
      </footer>
      <ReferralModal isOpen={showReferral} onClose={() => setShowReferral(false)} />
    </>
  );
};
