import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './Button';

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Download size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">Install App</h3>
            <p className="text-xs text-slate-400">Add to Home Screen for offline access</p>
          </div>
        </div>
        <button 
          onClick={() => setShowPrompt(false)}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="flex gap-2 mt-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs"
          onClick={() => setShowPrompt(false)}
        >
          Later
        </Button>
        <Button 
          size="sm" 
          className="flex-1 text-xs"
          onClick={handleInstallClick}
        >
          Install
        </Button>
      </div>
    </div>
  );
};
