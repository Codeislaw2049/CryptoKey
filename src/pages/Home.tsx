import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wizard } from '../components/Wizard';
import { DecryptionTool } from '../components/DecryptionTool';
import { SteganographyTool } from '../components/SteganographyTool';
import { WalletGenerator } from '../components/WalletGenerator';
import { PasswordManager } from '../components/PasswordManager';
import { InviteSystem } from '../components/InviteSystem';
import WasmBenchmark from '../pages/WasmBenchmark';
import { ShieldCheck, UnlockKeyhole, Image, Wallet, FileText, RotateCcw, ArrowRight, Terminal, LayoutGrid } from 'lucide-react';
import { cn } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../contexts/LicenseContext';

export const Home = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { userNickname, triggerUpgrade } = useLicense();
  const [activeTab, setActiveTab] = useState<'landing' | 'encrypt' | 'decrypt' | 'stego' | 'wallet' | 'benchmark' | 'passwords' | 'invite'>('landing');
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [stegoSecret, setStegoSecret] = useState<string>('');
  const [encryptSecret, setEncryptSecret] = useState<string>('');
  const [decryptCiphertext, setDecryptCiphertext] = useState<string>('');
  const [encryptMode, setEncryptMode] = useState<'general' | 'mnemonic' | 'file' | 'url' | undefined>(undefined);
  const [encryptIntent, setEncryptIntent] = useState<'crypto' | 'password' | undefined>(undefined);

  // Handle URL tab parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && (tabParam === 'passwords' || tabParam === 'invite')) {
      if (!userNickname) {
        triggerUpgrade();
        // Clear the URL parameter after showing upgrade prompt
        navigate('/', { replace: true });
      } else {
        setActiveTab(tabParam as 'passwords' | 'invite');
        // Clear the URL parameter after setting tab
        navigate('/', { replace: true });
      }
    }
  }, [location.search, userNickname, triggerUpgrade, navigate]);

  // Auto-redirect if logged out while on protected tabs
  useEffect(() => {
    if (!userNickname && (activeTab === 'passwords' || activeTab === 'invite')) {
      setActiveTab('landing');
    }
  }, [userNickname, activeTab]);

  const handleNavigateToStego = (secret: string) => {
    setStegoSecret(secret);
    setActiveTab('stego');
  };

  const handleDecryptFromManager = (ciphertext: string) => {
    setDecryptCiphertext(ciphertext);
    setActiveTab('decrypt');
  };

  const handleNavigateToEncrypt = (secret: string) => {
    setEncryptSecret(secret);
    setActiveTab('encrypt');
    setEncryptMode(undefined); // Reset mode when coming from other tools
    setEncryptIntent(undefined);
  };

  const toggleViewMode = () => {
    if (viewMode === 'simple') {
      setViewMode('advanced');
      if (activeTab === 'landing') {
        setActiveTab('encrypt'); // Auto-switch to first tab in advanced mode
      }
    } else {
      setViewMode('simple');
      setActiveTab('landing'); // Switch back to landing in simple mode
    }
  };

  const LandingCard = ({ icon: Icon, title, desc, onClick, color }: any) => (
    <button 
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-surface/40 border border-slate-800 p-6 text-left transition-all hover:bg-surface/60 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 w-full max-w-md md:max-w-none mx-auto md:mx-0 h-full flex flex-col focus:outline-none focus:ring-0"
    >
      <div className={`mb-4 p-3 rounded-xl bg-slate-900/50 w-fit ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-6 flex-grow">{desc}</p>
      <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform">
        {t('common.next', 'Start Now')} <ArrowRight size={16} className="ml-1" />
      </div>
    </button>
  );

  return (
    <div className="space-y-8 relative min-h-[60vh] flex flex-col pt-4">
      {/* Header */}
      <div className="text-center space-y-3 cursor-pointer focus:outline-none" onClick={() => setActiveTab('landing')}>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3 flex-wrap hover:opacity-80 transition-opacity">
          <ShieldCheck className="text-primary" size={42} />
          CryptoKey.im
        </h1>
        <p className="text-slate-400 font-medium text-base md:text-lg">{t('home.subtitle')}</p>
      </div>

      {/* Tabs - Hidden on Landing to focus on Scenarios */}
      {activeTab !== 'landing' && (
      <div className="grid grid-cols-2 md:flex md:justify-center p-1 bg-surface/50 rounded-2xl md:rounded-full w-fit mx-auto border border-slate-800 gap-2 md:gap-0 animate-in fade-in slide-in-from-top-4 focus:outline-none">
        <button
          onClick={() => {
            setEncryptSecret('');
            setEncryptMode(undefined);
            setEncryptIntent(undefined);
            setActiveTab('encrypt');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-0",
            activeTab === 'encrypt' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <ShieldCheck size={18} />
          {t('home.tabs.encrypt')}
        </button>
        <button
          onClick={() => {
            setEncryptSecret('');
            setActiveTab('decrypt');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-0",
            activeTab === 'decrypt' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <UnlockKeyhole size={18} />
          {t('home.tabs.decrypt')}
        </button>
        <button
          onClick={() => {
            setEncryptSecret('');
            setActiveTab('stego');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-0",
            activeTab === 'stego' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Image size={18} />
          {t('home.tabs.stego')}
        </button>
        <button
          onClick={() => {
            setEncryptSecret('');
            setDecryptCiphertext('');
            setActiveTab('wallet');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-0",
            activeTab === 'wallet' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Wallet size={18} />
          {t('home.tabs.wallet')}
        </button>
      </div>
      )}

      {/* Content Area */}
      {activeTab === 'landing' ? (
        <div className="w-full max-w-5xl mx-auto px-4 md:px-6 animate-in fade-in zoom-in-95 duration-500 flex-grow flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
          <LandingCard
            icon={Image}
            title={t('steganography.card.image.title', 'Image Steganography')}
            desc={t('steganography.card.image.desc', 'Hide text messages inside images using LSB steganography.')}
            onClick={() => {
              setStegoSecret(' '); // Set a non-empty value to trigger direct mode
              setActiveTab('stego');
            }}
            color="text-indigo-400"
          />
          <LandingCard 
            icon={FileText} 
            title={t('landing.card2.title', 'Password Book')}
            desc={t('landing.card2.desc', 'Encrypt passwords, notes, and diaries into a secure portable format.')}
            onClick={() => {
              setEncryptSecret('');
              setEncryptMode('mnemonic'); // Use mnemonic mode (free) for passwords too
              setEncryptIntent('password');
              setActiveTab('encrypt');
            }}
            color="text-blue-400"
          />
          <LandingCard 
            icon={RotateCcw} 
            title={t('landing.card3.title', 'Restore Data')}
            desc={t('landing.card3.desc', 'Decrypt your data using your book key and password.')}
            onClick={() => {
              setEncryptSecret('');
              setActiveTab('decrypt');
            }}
            color="text-emerald-400"
          />
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 pb-8">
             <button
              onClick={toggleViewMode}
              className="group relative overflow-hidden rounded-xl bg-slate-900/50 border border-slate-700 px-8 py-4 text-left transition-all hover:bg-slate-800 hover:border-slate-500 hover:shadow-lg flex items-center gap-4 focus:outline-none focus:ring-0"
              title={viewMode === 'simple' ? t('home.toggle.advanced', 'Switch to Geek Mode') : t('home.toggle.simple', 'Switch to Simple Mode')}
            >
               <div className="p-2 rounded-lg bg-slate-800 text-slate-300 group-hover:text-white transition-colors">
                  {viewMode === 'simple' ? <Terminal size={24} /> : <LayoutGrid size={24} />}
               </div>
               <div>
                 <div className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">
                   {viewMode === 'simple' ? t('home.mode.geek', 'Geek Mode') : t('home.mode.simple', 'Simple Mode')}
                 </div>
                 <div className="text-xs text-slate-500 group-hover:text-slate-400">
                   {viewMode === 'simple' ? t('home.toggle.advanced', 'Switch to Geek Mode') : t('home.toggle.simple', 'Switch to Simple Mode')}
                 </div>
               </div>
               <ArrowRight size={16} className="ml-2 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col justify-center max-w-5xl mx-auto w-full">
            <div className="bg-surface/30 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 focus:outline-none ring-0 outline-none flex flex-col justify-center min-h-[500px] overflow-hidden">
              {activeTab === 'encrypt' && <Wizard initialSecret={encryptSecret} initialMode={encryptMode} initialIntent={encryptIntent} onNavigateToStego={handleNavigateToStego} />}
              {activeTab === 'decrypt' && <DecryptionTool initialCiphertext={decryptCiphertext} />}
              {activeTab === 'stego' && <SteganographyTool initialSecret={stegoSecret} onExtract={handleNavigateToEncrypt} />}
              {activeTab === 'wallet' && <WalletGenerator onBackup={handleNavigateToEncrypt} onBackupToBook={handleNavigateToStego} />}
              {activeTab === 'passwords' && <PasswordManager onDecrypt={handleDecryptFromManager} />}
              {activeTab === 'invite' && <InviteSystem />}
              {activeTab === 'benchmark' && <WasmBenchmark />}
            </div>
            
            {/* Mode Toggle in Geek Mode (Bottom) */}
            <div className="flex justify-center mt-8 pb-8">
               <button
                  onClick={toggleViewMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-all focus:outline-none focus:ring-0"
                >
                  <LayoutGrid size={16} />
                  <span>{t('home.mode.simple', 'Switch to Simple Mode')}</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
