import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { Terms } from './pages/Terms';
import { InstallAuth } from './pages/InstallAuth';
import { SecurityBadge } from './components/ui/SecurityBadge';
import { LicenseManager } from './components/ui/LicenseManager';
import { UserManual } from './components/ui/UserManual';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/ui/Footer';
import { wasmManager } from './wasm/wasmLoader';
import { useEffect } from 'react';
import { LanguageSwitcher } from './components/ui/LanguageSwitcher';

function App() {
  useEffect(() => {
    // Initialize Wasm Architecture
    wasmManager.loadProModule().then(success => {
        if (success) console.log("Pro Wasm Module Loaded");
    });

    // Capture Referral Code
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
        sessionStorage.setItem('cryptokey_referral_code', refCode);
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-slate-100 py-3 md:py-6 px-2 md:px-4 selection:bg-primary/30 relative pb-12 md:pb-6 overflow-x-hidden">
        <ErrorBoundary>
          <SecurityBadge />
          <LicenseManager />
          <UserManual />
          <LanguageSwitcher />
          
          <div className="max-w-4xl mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/install-auth" element={<InstallAuth />} />
              {/* Redirect any unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          <Footer />
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;
