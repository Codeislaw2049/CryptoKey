import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Buffer } from 'buffer';
import { registerSW } from 'virtual:pwa-register'
import { LicenseProvider } from './contexts/LicenseContext';

// Polyfill Buffer for bip39
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
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
    <LicenseProvider>
      <App />
    </LicenseProvider>
  </React.StrictMode>,
)
