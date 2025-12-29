import { ShieldCheck, Github, Send, RefreshCw, Share2 } from 'lucide-react';
import { APP_VERSION } from '../../version';
import { IntegrityCheck } from './IntegrityCheck';
import { Link } from 'react-router-dom';

export const Footer = () => {
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
      title: 'CryptoKey.im - Secure Backup',
      text: 'Securely hide your data in images with CryptoKey.im. Protect your privacy with advanced steganography.',
      url: 'https://cryptokey.im',
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Share API not supported');
      }
    } catch (err: any) {
      // Ignore user cancellation
      if (err.name === 'AbortError') return;

      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText('https://cryptokey.im');
        alert('Link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Clipboard failed:', clipboardErr);
      }
    }
  };

  return (
    <footer className="mt-12 border-t border-slate-800/50 bg-slate-900/20 backdrop-blur-sm py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Brand & Version */}
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
                <Link to="/" className="flex items-center gap-2 text-slate-200 font-bold hover:text-white transition-colors">
                  <ShieldCheck size={20} className="text-primary" />
                  <span>CryptoKey.im</span>
                </Link>
                <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-400">
                  <span>v{APP_VERSION}</span>
                  <button 
                    onClick={handleRefresh}
                    className="ml-1 hover:text-white transition-colors"
                    title="Force Update / Clear Cache"
                  >
                    <RefreshCw size={10} />
                  </button>
                </div>
            </div>
            <p className="text-xs text-slate-500 max-w-xs">
              Military-grade Steganography & Encryption Tool (AES-256-GCM + ChaCha20-Poly1305).
              <br />
              Running entirely in your browser. No data sent to server.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex gap-6 text-sm font-medium text-slate-400">
             <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
             <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>

          {/* Social & Links */}
          <div className="flex gap-6 text-slate-400">
            <a 
              href="https://github.com/Codeislaw2049/CryptoKey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex flex-col items-center gap-1 group"
              title="Public Repository (Audit)"
            >
              <Github size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px]">Source</span>
            </a>
            <a 
              href="https://t.me/C_2046" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex flex-col items-center gap-1 group"
            >
              <Send size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px]">Telegram</span>
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
              <span className="text-[10px]">X.com</span>
            </a>
            <button 
              onClick={handleShare}
              className="hover:text-primary transition-colors flex flex-col items-center gap-1 group"
              title="Share"
            >
              <Share2 size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px]">Share</span>
            </button>
          </div>

        </div>

        {/* Copyright & License */}
        <div className="mt-8 pt-8 border-t border-slate-800/30 text-center space-y-4">
          <div className="flex justify-center gap-4 mb-4">
             <IntegrityCheck />
          </div>
          
          <div className="text-[10px] text-slate-600 space-y-1">
            <p>
              &copy; {new Date().getUTCFullYear()} - {new Date().getUTCFullYear() + 1} CryptoKey.im. All Rights Reserved.
            </p>
            <p className="text-slate-500">
              <span className="text-amber-500/80 font-medium">Commercial License Notice:</span> This software contains proprietary Wasm encryption modules protected by international copyright laws. 
              <br className="hidden md:block"/>
              The public source code is provided for security audit purposes only under the <span className="text-slate-400">CC-BY-NC-ND 4.0</span> license. 
              Unauthorized commercial use, modification, or redistribution of the core algorithms is strictly prohibited.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
