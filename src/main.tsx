import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { Buffer } from 'buffer';
import { registerSW } from 'virtual:pwa-register'
import { LicenseProvider } from './contexts/LicenseContext';
import { Loader2 } from 'lucide-react';

// Polyfill Buffer for bip39
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  
  // Disable context menu (right-click)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable pinch-to-zoom / double-finger drag
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Disable dragstart
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });
}

// Register PWA Service Worker
registerSW({
  onNeedRefresh() {
    console.log('New content available, click on reload button to update.');
  },
  onOfflineReady() {
    console.log('Content is cached for offline use.');
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    }>
      <LicenseProvider>
        <App />
      </LicenseProvider>
    </Suspense>
  </React.StrictMode>,
)
