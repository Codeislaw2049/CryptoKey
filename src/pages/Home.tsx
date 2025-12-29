import { useState } from 'react';
import { Wizard } from '../components/Wizard';
import { DecryptionTool } from '../components/DecryptionTool';
import { SteganographyTool } from '../components/SteganographyTool';
import { WalletGenerator } from '../components/WalletGenerator';
import WasmBenchmark from '../pages/WasmBenchmark';
import { ShieldCheck, UnlockKeyhole, Image, Wallet } from 'lucide-react';
import { cn } from '../components/ui/Button';

export const Home = () => {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'stego' | 'wallet' | 'benchmark'>('encrypt');
  const [stegoSecret, setStegoSecret] = useState<string>('');
  const [encryptSecret, setEncryptSecret] = useState<string>('');

  const handleNavigateToStego = (secret: string) => {
    setStegoSecret(secret);
    setActiveTab('stego');
  };

  const handleNavigateToEncrypt = (secret: string) => {
    setEncryptSecret(secret);
    setActiveTab('encrypt');
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 flex-wrap">
          <ShieldCheck className="text-primary" size={40} />
          CryptoKey.im
        </h1>
        <p className="text-slate-400 font-medium">Military-grade Steganography & Encryption Tool</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:flex md:justify-center p-1 bg-surface/50 rounded-2xl md:rounded-full w-fit mx-auto border border-slate-800 gap-2 md:gap-0">
        <button
          onClick={() => {
            setEncryptSecret('');
            setActiveTab('encrypt');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'encrypt' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <ShieldCheck size={18} />
          Encrypt
        </button>
        <button
          onClick={() => {
            setEncryptSecret('');
            setActiveTab('decrypt');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'decrypt' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <UnlockKeyhole size={18} />
          Decrypt
        </button>
        <button
          onClick={() => {
            setEncryptSecret('');
            setActiveTab('stego');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'stego' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Image size={18} />
          Steganography
        </button>
        <button
          onClick={() => {
            setEncryptSecret('');
            setActiveTab('wallet');
          }}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'wallet' ? "bg-primary text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          <Wallet size={18} />
          Paper Wallet
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-surface/30 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 md:p-8 shadow-2xl">
        {activeTab === 'encrypt' && <Wizard initialSecret={encryptSecret} onNavigateToStego={handleNavigateToStego} />}
        {activeTab === 'decrypt' && <DecryptionTool />}
        {activeTab === 'stego' && <SteganographyTool initialSecret={stegoSecret} onExtract={handleNavigateToEncrypt} />}
        {activeTab === 'wallet' && <WalletGenerator onBackup={handleNavigateToEncrypt} onBackupToBook={handleNavigateToStego} />}
        {activeTab === 'benchmark' && <WasmBenchmark />}
      </div>
    </div>
  );
};
