import { useState, useEffect } from 'react';
import { generateMnemonic, getWalletDetails, validateMnemonic } from '../utils/mnemonic';
import { Copy, RefreshCw, Eye, EyeOff, CheckCircle2, AlertTriangle, Wallet, Key, ShieldCheck, BookLock, QrCode, Import, X, Clipboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

interface WalletGeneratorProps {
  onBackup?: (secret: string) => void;
  onBackupToBook?: (secret: string) => void;
  onNavigateToEncrypt?: (secret: string) => void;
  onNavigateToStego?: (secret: string) => void;
}

export function WalletGenerator({ onBackup, onBackupToBook }: WalletGeneratorProps) {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [strength, setStrength] = useState<128 | 256>(128);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [walletDetails, setWalletDetails] = useState<{
    address: string;
    privateKey: string;
    publicKey: string;
    path: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Import functionality state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (walletDetails?.address) {
      QRCode.toDataURL(walletDetails.address, { 
        width: 200, 
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err, url) => {
        if (!err) setQrCodeUrl(url);
      });
    } else {
      setQrCodeUrl('');
    }
  }, [walletDetails]);

  const handleGenerate = () => {
    const newMnemonic = generateMnemonic(strength);
    setMnemonic(newMnemonic);
    setWalletDetails(getWalletDetails(newMnemonic));
    setShowMnemonic(false); // Hide by default for security
    setShowSensitive(false);
    setShowImport(false);
  };

  const handleImport = () => {
    const validation = validateMnemonic(importText);
    if (!validation.isValid) {
      setImportError(validation.error || 'Invalid mnemonic');
      return;
    }
    
    setMnemonic(importText);
    setWalletDetails(getWalletDetails(importText));
    setImportError('');
    setShowImport(false);
    setImportText(''); // Clear sensitive input
    setShowMnemonic(false);
    setShowSensitive(false);
  };

  const copyToClipboard = async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Wallet className="text-primary" />
          Secure Wallet Generator
        </h2>
        <p className="text-slate-400">
          Generate BIP39/BIP44 compliant wallets. 100% Client-side.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!showImport ? (
          <motion.div
            key="generator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStrength(128)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  strength === 128 ? 'bg-primary text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                12 Words (128-bit)
              </button>
              <button
                onClick={() => setStrength(256)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  strength === 256 ? 'bg-primary text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                24 Words (256-bit)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
              >
                <RefreshCw size={20} />
                Generate New Wallet
              </button>
              
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-3 rounded-full font-bold transition-all border border-slate-700"
              >
                <Import size={20} />
                Import Mnemonic
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="importer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl mx-auto bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Import size={20} />
                Import Existing Wallet
              </h3>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportError('');
                  setImportText('');
                }}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-2 relative">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Enter your 12, 15, 18, 21, or 24 word mnemonic phrase here..."
                className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none font-mono text-sm"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setImportText(text);
                    } catch (err) {
                      console.error('Failed to read clipboard', err);
                    }
                  }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                  title="Paste from clipboard"
                >
                  <Clipboard size={14} />
                  Paste
                </button>
              </div>
              {importError && (
                <p className="text-red-400 text-sm flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {importError}
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="w-full bg-primary text-slate-900 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import Wallet
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mnemonic && !showImport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Mnemonic Display */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 relative overflow-hidden group">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Recovery Phrase (Mnemonic)</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title={showMnemonic ? "Hide" : "Show"}
                  >
                    {showMnemonic ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors relative"
                    title="Copy to clipboard"
                  >
                    {copyFeedback ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-3 md:grid-cols-4 gap-3 transition-all duration-300 ${showMnemonic ? 'filter-none' : 'blur-md select-none'}`}>
                {mnemonic.split(' ').map((word, index) => (
                  <div key={index} className="bg-slate-900/80 p-2 rounded border border-slate-700 flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-mono w-4">{index + 1}</span>
                    <span className="font-mono font-bold text-primary">{word}</span>
                  </div>
                ))}
              </div>
              
              {!showMnemonic && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <button 
                    onClick={() => setShowMnemonic(true)}
                    className="bg-slate-900/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors border border-slate-700"
                  >
                    <Eye size={18} />
                    Click to Reveal
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons for Cross-Page Copy */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                    onClick={() => onBackup?.(mnemonic)}
                    disabled={!onBackup}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25"
                >
                    <ShieldCheck size={18} />
                    Copy to "Enter Mnemonic Phrase"
                </button>
                
                <button
                    onClick={() => onBackupToBook?.(mnemonic)}
                    disabled={!onBackupToBook}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25"
                >
                    <BookLock size={18} />
                    Copy to "Steganography"
                </button>
            </div>

            {/* Derived Addresses */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-200">Wallet Details</h3>
                <button
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold border border-slate-600"
                >
                  {showSensitive ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showSensitive ? 'Hide Sensitive Keys' : 'Show Sensitive Keys'}
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Ethereum Address (BIP44)</label>
                    <div className="bg-slate-900 p-3 rounded-lg font-mono text-sm break-all border border-slate-700 flex items-center justify-between gap-4">
                      <span className="text-green-400">{walletDetails?.address}</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-500" />
                      Path: {walletDetails?.path} (Standard Metamask/Ledger)
                    </p>
                  </div>

                  {showSensitive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-2 border-t border-slate-700/50"
                    >
                      <div className="space-y-1">
                        <label className="text-xs text-red-400 uppercase font-bold tracking-wider flex items-center gap-1">
                          <Key size={12} /> Private Key
                        </label>
                        <div className="bg-red-950/30 p-3 rounded-lg font-mono text-sm break-all border border-red-900/50 text-red-300">
                          {walletDetails?.privateKey}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Public Key</label>
                        <div className="bg-slate-900/50 p-3 rounded-lg font-mono text-xs break-all border border-slate-700 text-slate-400">
                          {walletDetails?.publicKey}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* QR Code Section */}
                {qrCodeUrl && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl gap-2 shrink-0">
                    <img src={qrCodeUrl} alt="Address QR Code" className="w-32 h-32" />
                    <span className="text-slate-900 text-xs font-bold flex items-center gap-1">
                      <QrCode size={12} />
                      Address QR
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex gap-3 items-start">
              <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-yellow-200/80 space-y-1">
                <p className="font-bold text-yellow-500">Security Warning</p>
                <p>
                  Write down these words on paper and store them safely. 
                  <strong>Never</strong> share them with anyone. 
                  If you lose these words, your funds are lost forever.
                </p>
              </div>
            </div>


          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
