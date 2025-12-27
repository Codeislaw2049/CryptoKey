import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { Terms } from './pages/Terms';
import { SecurityBadge } from './components/ui/SecurityBadge';
import { LicenseManager } from './components/ui/LicenseManager';
import { UserManual } from './components/ui/UserManual';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/ui/Footer';
import { wasmManager } from './wasm/wasmLoader';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize Wasm Architecture
    wasmManager.loadProModule().then(success => {
        if (success) console.log("Pro Wasm Module Loaded");
    });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-slate-100 py-6 md:py-12 px-2 md:px-4 selection:bg-primary/30 relative pb-24 md:pb-12 overflow-x-hidden">
        <ErrorBoundary>
          <SecurityBadge />
          <LicenseManager />
          <UserManual />
          
          <div className="max-w-4xl mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/terms" element={<Terms />} />
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
