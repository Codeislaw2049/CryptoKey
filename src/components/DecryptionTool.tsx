import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { ProBadge } from './ui/ProBadge';
import { Input } from './ui/Input';
import { decryptWithAES } from '../utils/crypto';
import { decodeBookCipherToIndex, indicesToMnemonic } from '../utils/mnemonic';
import { Unlock, Search, BookOpen, KeyRound, Eye, FileText, Globe, Upload, Loader2, Clipboard, QrCode, ShieldCheck, ArrowLeft, ArrowRight, Camera, Copy, CheckCircle } from 'lucide-react';
import { parseChunk, decompressData } from '../utils/compression';
import { readQrFromFile } from '../utils/qrReader';
import ShardDualAuthDecryptor from './ShardDualAuthDecryptor';
import { QRCodeStreamScanner } from './QRCodeStreamScanner';
import { 
  parseGutenbergTxt 
} from '../utils/txtParser';
import { 
  fetchGutenbergContent 
} from '../utils/urlFetcher';
import { 
  offsetsToMnemonic,
  chapterIndicesToMnemonic,
  virtualLineIndicesToMnemonic,
  indexToMnemonic
} from '../utils/gutenbergIndex';

import { sanitizeInput } from '../utils/sanitize';

type RecoveryMode = 'physical' | 'file' | 'url';

import { useLicense } from '../contexts/LicenseContext';

export const DecryptionTool = () => {
  const { t } = useTranslation();
  const { features, triggerUpgrade } = useLicense();
  const [mode, setMode] = useState<RecoveryMode>('physical');
  const [ciphertext, setCiphertext] = useState('');
  const [password, setPassword] = useState('');
  const [useDualAuth, setUseDualAuth] = useState(false);
  const [dualAuthShards, setDualAuthShards] = useState<Map<number, string>>(new Map());
  // Results is now a 2D array: Rows of strings
  const [rows, setRows] = useState<string[][] | null>(null);
  const [targetRow, setTargetRow] = useState<string>('');
  const [recoveredMnemonic, setRecoveredMnemonic] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // New detailed status
  const [scanStatus, setScanStatus] = useState<string>('');
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [missingIndices, setMissingIndices] = useState<number[]>([]);

  // QR Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{current: number, total: number} | null>(null);
  const [isDualAuthDetected, setIsDualAuthDetected] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // File/URL State
  const [fileInfo, setFileInfo] = useState<{
    fullText: string;
    chapters: any[];
    virtualLines: string[];
  } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const [url, setUrl] = useState('');
  const [urlInfo, setUrlInfo] = useState<{
    pureText: string;
    textHash: string;
  } | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsingFile(true);
    setError('');
    try {
      const info = await parseGutenbergTxt(file);
      setFileInfo(info);
    } catch (e: any) {
      setError(e.message || 'Failed to parse file');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleFetchUrl = async () => {
    if (!url) return;
    setIsFetchingUrl(true);
    setError('');
    try {
      const info = await fetchGutenbergContent(url);
      setUrlInfo(info);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch URL');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleStreamScanComplete = async (chunks: Map<number, string>) => {
      setShowScanner(false);
      setError('');
      setScanProgress(null);
      setFailedFiles([]);
      setMissingIndices([]);
      setScanStatus(t('decryption.status.processing'));
      
      try {
          if (chunks.size === 0) return;

          setScanStatus(t('decryption.status.reassembling'));

          // Reassemble
          const sortedData = Array.from(chunks.entries())
            .sort((a, b) => a[0] - b[0])
            .map(entry => entry[1])
            .join('');

          // Decompress
          const jsonStr = await decompressData(sortedData);
          const data = JSON.parse(jsonStr);

          // Detect Dual Auth
      if (data.em && data.epl) {
           // Sanitize input data
           const sanitizedChunks = new Map<number, string>();
           chunks.forEach((val, key) => sanitizedChunks.set(key, sanitizeInput(val)));
           
           setDualAuthShards(sanitizedChunks);
           setUseDualAuth(true);
           setIsDualAuthDetected(true); // Show banner if we switch back
      } else if (data.c) {
          setCiphertext(sanitizeInput(data.c));
          // Also check for 'h' (hash) if needed, but we usually trust the payload
      } else if (data.em) {
           // Legacy or partial payload
           setCiphertext(sanitizeInput(data.em));
      } else {
               throw new Error(t('errors.invalidDataFormat'));
          }

      } catch (e: any) {
          setError(e.message || 'Stream processing failed');
      } finally {
          setScanStatus('');
      }
  };

  const handleCiphertextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      
      // Attempt to extract clean ciphertext from potential garbage/headers
      // Case 1: JSON format (contains "iv": "...")
      // Case 2: Base64 string (long alphanumeric)
      // Case 3: Result File format (--- headers ---)
      
      let clean = val;

      // 1. Try to find JSON block
      const jsonMatch = val.match(/\{[\s\S]*"iv"[\s\S]*\}/);
      if (jsonMatch) {
          clean = jsonMatch[0];
      } else {
          // 2. Fallback: Find the longest Base64-like string
          // This ignores all headers, footers, language labels, and separators.
          // AES ciphertext is Base64. We look for continuous blocks of [A-Za-z0-9+/=]
          
          // Split by whitespace to get "words"
          const words = val.split(/[\s\n\r\t]+/);
          
          // Filter potential Base64 strings (length > 20 to avoid short random words or labels)
          // Base64 chars: A-Z, a-z, 0-9, +, /, =
          const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
          
          const candidates = words.filter(w => {
              if (w.length < 20) return false;
              // Check if it looks like Base64
              return base64Regex.test(w);
          });
          
          if (candidates.length > 0) {
              // Pick the longest one. 
              // Usually ciphertext is longer than Hash (44 chars), but not always.
              // However, this is the safest heuristic for "just the ciphertext".
              clean = candidates.reduce((a, b) => a.length > b.length ? a : b);
          } else {
              // If no valid Base64 found, fallback to original trim
              clean = val.trim();
          }
      }

      setCiphertext(clean);
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setError('');
    setScanProgress(null);
    setFailedFiles([]);
    setMissingIndices([]);
    setScanStatus(t('decryption.status.scanning'));
    
    // Helper delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        const chunks = new Map<number, string>();
        let total = 0;
        let globalHash = '';
        const currentFailedFiles: string[] = [];
        
        // Process all files
        for (let i = 0; i < files.length; i++) {
            setScanStatus(t('decryption.status.scanProgress', { current: i + 1, total: files.length }));
            await delay(50);

            try {
                const text = await readQrFromFile(files[i]);
                if (text) {
                    const chunk = parseChunk(text);
                    if (chunk) {
                        if (globalHash && globalHash !== chunk.hash) {
                             throw new Error(t('errors.hashMismatch'));
                        }
                        globalHash = chunk.hash;
                        total = chunk.total;
                        chunks.set(chunk.index, chunk.data);
                    } else {
                        currentFailedFiles.push(`${files[i].name} ${t('decryption.errors.invalidFormat')}`);
                    }
                } else {
                    currentFailedFiles.push(`${files[i].name} ${t('decryption.errors.noQrFound')}`);
                }
            } catch (err) {
                console.warn('Failed to read QR from file:', files[i].name, err);
                currentFailedFiles.push(`${files[i].name} ${t('decryption.errors.failedToReadFile')}`);
            }
        }
        
        setFailedFiles(currentFailedFiles);

        if (chunks.size === 0) {
            throw new Error(t('errors.noValidQr'));
        }

        if (chunks.size < total) {
             setScanProgress({ current: chunks.size, total });
             
             // Calculate missing
             const missing = [];
             for(let j=1; j<=total; j++) {
                 if(!chunks.has(j)) missing.push(j);
             }
             setMissingIndices(missing);

             setError(t('decryption.errors.incompleteData', { current: chunks.size, total }));
             return;
        }

        setScanStatus(t('decryption.status.reassembling'));
        await delay(50);

        // Reassemble
        const sortedData = Array.from(chunks.entries())
            .sort((a, b) => a[0] - b[0])
            .map(entry => entry[1])
            .join('');
            
        // Decompress
        const jsonStr = await decompressData(sortedData);
        const data = JSON.parse(jsonStr);
        
        // Detect Dual Auth
      if (data.em && data.epl) {
           setIsDualAuthDetected(true);
      }

      if (data.c) {
          setCiphertext(sanitizeInput(data.c));
          setScanProgress(null);
      } else if (data.em) {
          // If ciphertext 'c' is missing (newer dual auth shards), we display the Encrypted Mnemonic 'em'.
          // This allows the user to see "something", but it is encrypted.
          setCiphertext(sanitizeInput(data.em));
          setScanProgress(null);
            // We append a warning to the error message if not dual auth mode
            if (!useDualAuth) {
               // We don't throw, we just let the "Dual Auth Detected" banner handle the warning.
            }
        } else {
             throw new Error(t('errors.invalidDataFormat'));
        }

    // ... render logic ...
    
    {isDualAuthDetected && (
      <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/50 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-indigo-400 shrink-0" />
          <div>
            <h3 className="font-bold text-indigo-100">{t('decryption.alert.dualAuthTitle')}</h3>
            <p className="text-sm text-indigo-300">
               {t('decryption.alert.dualAuthDesc')}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setUseDualAuth(true)}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {t('decryption.alert.switchToDual')} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    )}

    } catch (e: any) {
        setError(e.message || 'QR Scan Failed');
    } finally {
        setIsScanning(false);
        setScanStatus('');
        // Reset input
        e.target.value = '';
    }
  };
  
  // Effect to attempt recovery when target row changes
  useEffect(() => {
    if (!rows || !targetRow) {
        setRecoveredMnemonic(null);
        return;
    }

    const rowIndex = parseInt(targetRow) - 1; // User inputs 1-based index
    if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= rows.length) {
        setRecoveredMnemonic(null);
        return;
    }

    const rowData = rows[rowIndex];
    try {
      if (mode === 'physical') {
        // Try to decode as book cipher first
        const indices = rowData.map(item => decodeBookCipherToIndex(item));
        const validIndices = indices.filter(i => i >= 0 && i <= 2047);
        
        // Strategy 1: It's a valid mnemonic
        if (validIndices.length >= 12 && validIndices.length <= 24) {
            const mnemonic = indicesToMnemonic(validIndices);
            if (mnemonic.split(' ').length >= 12) {
                setRecoveredMnemonic(mnemonic);
                return;
            }
        }
        
        // Strategy 2: It's general data
        setRecoveredMnemonic(rowData.join('\n'));
      } else if (mode === 'file') {
        if (!fileInfo) {
          setRecoveredMnemonic(t('decryption.error.fileMode'));
          return;
        }
        
        // Auto-detect scheme based on format
        const sample = rowData[0];
        if (sample.includes('-')) {
          const parts = sample.split('-');
          if (parts.length === 2) {
             try {
                // Try Virtual Line first
                const res = virtualLineIndicesToMnemonic(rowData, fileInfo.virtualLines);
                setRecoveredMnemonic(res);
                return;
             } catch (e) {
                try {
                  // Try Offset
                  const res = offsetsToMnemonic(rowData, fileInfo.fullText);
                  setRecoveredMnemonic(res);
                  return;
                } catch (e2) {
                   throw new Error(t('decryption.error.fileMode'));
                }
             }
          } else if (parts.length === 3) {
             // Chapter-Line-Char
             const res = chapterIndicesToMnemonic(rowData, fileInfo.chapters);
             setRecoveredMnemonic(res);
             return;
          }
        }
        setRecoveredMnemonic(t('decryption.error.fileModeUnknown'));

      } else if (mode === 'url') {
        if (!urlInfo) {
          setRecoveredMnemonic(t('decryption.error.urlMode'));
          return;
        }
        
        // URL indices are Offset-Length-HashPrefix
        const res = indexToMnemonic(rowData, urlInfo.pureText, urlInfo.textHash);
        setRecoveredMnemonic(res);
      }
    } catch (e: any) {
         // If all else fails, show error
         if (mode === 'physical' && rowData) {
             setRecoveredMnemonic(rowData.join('\n'));
         } else {
             setRecoveredMnemonic(`${t('decryption.error.decryptFailed')} ${e.message || 'Unknown Error'}`);
         }
     }

  }, [targetRow, rows, mode, fileInfo, urlInfo]);

  const handlePaste = async () => {
    setError('');
    try {
      const text = await navigator.clipboard.readText();
      setCiphertext(sanitizeInput(text));
    } catch (e) {
      console.error('Failed to read clipboard', e);
      // Fallback for when clipboard API is not available/allowed
      setError(t('decryption.error.clipboard'));
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (e) {
        // Ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDecrypt = async () => {
    try {
      setError('');
      setRows(null);
      setRecoveredMnemonic(null);
      setTargetRow('');
      
      let processedCiphertext = ciphertext;

      // Smart cleaning: Remove non-ciphertext content if pasted with headers
      // Format: "Ciphertext: <content> ... Hash: <content>"
      if (processedCiphertext.includes('Ciphertext:')) {
        const parts = processedCiphertext.split('Ciphertext:');
        if (parts.length > 1) {
          processedCiphertext = parts[1];
        }
      }

      if (processedCiphertext.includes('Hash:')) {
        processedCiphertext = processedCiphertext.split('Hash:')[0];
      }

      processedCiphertext = processedCiphertext.trim();

      // Try to parse as Vault (Duress Feature)
      let decryptedJson = null;
      try {
        const potentialVault = JSON.parse(processedCiphertext);
        if (potentialVault && potentialVault.v === '2' && Array.isArray(potentialVault.vaults)) {
            // It's a vault! Try to decrypt each entry with the provided password
            for (const vaultCipher of potentialVault.vaults) {
                try {
                    decryptedJson = await decryptWithAES(vaultCipher, password);
                    // If we get here, decryption succeeded!
                    break; 
                } catch (e) {
                    // Wrong password for this vault entry, continue to next
                }
            }
            
            if (!decryptedJson) {
                throw new Error(t('errors.passwordIncorrect'));
            }
        }
      } catch (e) {
         // Not a vault or JSON parse error, proceed to standard decryption
      }

      // If not decrypted from vault yet, try standard decryption
      if (!decryptedJson) {
         decryptedJson = await decryptWithAES(processedCiphertext, password);
      }

      const parsed = JSON.parse(decryptedJson);
      
      if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
          setRows(parsed as string[][]);
      } else if (Array.isArray(parsed)) {
          // Backward compatibility
          setRows([parsed as string[]]);
      } else {
          throw new Error(t('errors.invalidDataFormat'));
      }

    } catch (e) {
      setError(t('decryption.errors.decryptionFailed'));
    }
  };

  if (useDualAuth) {
    return (
        <div className="animate-in fade-in slide-in-from-right-8">
            <div className="mb-4 flex items-center justify-between">
                <Button variant="ghost" onClick={() => {
                    setUseDualAuth(false);
                    setIsDualAuthDetected(false);
                }} className="text-slate-400 hover:text-white flex items-center gap-2">
                    <ArrowLeft size={16} />
                    {t('decryption.alert.backToStandard')}
                </Button>
                {isDualAuthDetected && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">
                    {t('decryption.alert.dualAuthBadge')}
                  </span>
                )}
            </div>
            <ShardDualAuthDecryptor initialShards={dualAuthShards} />
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Scanner Overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 text-slate-400 hover:text-white"
              onClick={() => setShowScanner(false)}
            >
              {t('decryption.label.closeScanner')}
            </Button>
            <QRCodeStreamScanner 
              onScanComplete={handleStreamScanComplete}
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-white mb-2">{t('decryption.title')}</h2>
          <p className="text-slate-400 text-sm">{t('decryption.subtitle')}</p>
        </div>
        <Button
                    variant="outline"
                    size="sm"
                    onClick={() => features.allowDualAuth ? setUseDualAuth(true) : triggerUpgrade()}
                    className={`flex items-center gap-2 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 whitespace-nowrap ${!features.allowDualAuth ? 'opacity-70' : ''}`}
                    title={!features.allowDualAuth ? "Pro Feature: Click to Upgrade" : ""}
                >
                    <ShieldCheck size={16} />
                    {t('decryption.alert.dualAuthBadge')}
                    <ProBadge />
                </Button>
      </div>

      <div className="bg-surface p-6 rounded-xl border border-slate-800 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <label className="text-sm font-medium text-slate-400">{t('decryption.label.ciphertext')}</label>
            <div className="flex items-center gap-2 flex-wrap">
                {/* Scan Stream Button */}
                <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs h-8 flex items-center gap-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 ${!features.allowStreamScan ? 'opacity-70' : ''}`}
                    onClick={() => features.allowStreamScan ? setShowScanner(true) : triggerUpgrade()}
                    title={!features.allowStreamScan ? "Pro Feature: Click to Upgrade" : ""}
                >
                    <Camera size={14} />
                    {t('decryption.button.scanStream')}
                    <ProBadge />
                </Button>

                {/* QR Upload Button */}
                <div className="relative">
                    <input
                        type="file"
                        id="qr-upload"
                        accept="image/*"
                        multiple
                        onChange={handleQRUpload}
                        className="hidden"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => document.getElementById('qr-upload')?.click()}
                    >
                        {isScanning ? <Loader2 size={14} className="animate-spin mr-2" /> : <QrCode size={14} className="mr-2" />}
                        {isScanning ? scanStatus || t('decryption.status.scanning') : t('decryption.button.uploadQRShards')}
                    </Button>
                </div>

                {/* Paste Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePaste}
                  className="text-xs h-8"
                  title={t('inputStep.tooltip.pasteClipboard')}
                >
                  <Clipboard size={14} className="mr-2" />
                  {t('decryption.button.paste')}
                </Button>
            </div>
          </div>

          <textarea
            value={ciphertext}
            onChange={handleCiphertextChange}
            className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-y"
            placeholder={t('decryption.placeholder.ciphertext')}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {failedFiles.length > 0 && (
            <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-800">
                <p className="font-bold">{t('decryption.label.failedFiles')}</p>
                <ul className="list-disc pl-4 mt-1">
                    {failedFiles.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
            </div>
        )}

        {missingIndices.length > 0 && (
            <div className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-800">
                <p className="font-bold">{t('decryption.label.missingParts')}</p>
                <p>{missingIndices.join(', ')}</p>
            </div>
        )}

        {scanProgress && (
            <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg flex items-center justify-between text-xs text-blue-300 animate-in fade-in">
                <span>{t('decryption.label.fragmentsFound')} {scanProgress.current} / {scanProgress.total}</span>
                <span className="font-bold">{t('decryption.label.uploadRemaining')}</span>
            </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">{t('decryption.label.password')}</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('decryption.placeholder.password')}
            autoComplete="new-password"
            className="bg-slate-900/50"
          />
        </div>

        <Button
          onClick={handleDecrypt}
          disabled={!ciphertext || !password}
          className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20"
        >
          <Unlock size={20} className="mr-2" />
          {t('decryption.button.decrypt')}
        </Button>
        
        {error && <p className="text-red-500 text-center font-medium bg-red-500/10 p-2 rounded">{error}</p>}
      </div>

      {rows && (
        <div className="space-y-6 border-t border-slate-800 pt-8 animate-in slide-in-from-bottom-4">
          
          {/* Recovery Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <button
                onClick={() => setMode('physical')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  mode === 'physical'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
             >
                <BookOpen size={24} />
                <span className="font-medium">{t('decryption.mode.physicalBook')}</span>
             </button>

             <button
                onClick={() => setMode('file')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  mode === 'file'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
             >
                <FileText size={24} />
                <span className="font-medium">{t('decryption.mode.digitalBook')}</span>
             </button>

             <button
                onClick={() => setMode('url')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  mode === 'url'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
             >
                <Globe size={24} />
                <span className="font-medium">{t('decryption.mode.onlineBook')}</span>
             </button>
          </div>

          {/* Mode Specific Inputs */}
          {mode === 'file' && (
             <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-white font-medium">
                   <Upload size={20} className="text-blue-400" />
                   <h3>{t('decryption.file.title')}</h3>
                </div>
                <p className="text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: t('decryption.file.description') }} />
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 flex items-center justify-between cursor-pointer hover:bg-slate-900 hover:border-blue-500 transition-all group"
                  >
                    <span className="truncate flex-1">
                      {fileInfo ? t('decryption.file.loaded', { size: Math.round(fileInfo.fullText.length / 1024) }) : t('decryption.file.choose')}
                    </span>
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full group-hover:bg-blue-500">
                      {t('decryption.file.browse')}
                    </span>
                  </label>

                  {isParsingFile && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="animate-spin text-blue-400" />
                    </div>
                  )}
                </div>
                {fileInfo && (
                   <div className="text-xs text-green-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {t('decryption.file.parsed', { count: fileInfo.chapters.length })}
                   </div>
                )}
             </div>
          )}

          {mode === 'url' && (
             <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-white font-medium">
                   <Globe size={20} className="text-blue-400" />
                   <h3>{t('decryption.url.title')}</h3>
                </div>
                <p className="text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: t('decryption.url.description') }} />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('decryption.url.placeholder')}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                  />
                  <Button
                    onClick={handleFetchUrl}
                    disabled={isFetchingUrl || !url}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {isFetchingUrl ? <Loader2 className="animate-spin" /> : t('decryption.url.fetch')}
                  </Button>
                </div>
                {urlInfo && (
                   <div className="text-xs text-green-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {t('decryption.url.loaded', { length: urlInfo.pureText.length, hash: urlInfo.textHash.slice(0, 8) })}
                   </div>
                )}
             </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-6">
              {/* Row Selector */}
              <div className="md:w-1/3 space-y-4">
                  <div className="bg-surface p-4 rounded-xl border border-slate-700 space-y-3 sticky top-4">
                      <div className="flex items-center gap-2 text-white font-bold">
                          <Search size={20} className="text-primary" />
                          <h3>{t('decryption.locate.title')}</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                          {t('decryption.locate.description')}
                      </p>
                      <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">{t('decryption.locate.row')}</span>
                          <input
                              type="number"
                              min="1"
                              max={rows.length}
                              placeholder="?"
                              className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono focus:border-primary focus:outline-none text-center"
                              value={targetRow}
                              onChange={(e) => setTargetRow(e.target.value)}
                          />
                          <span className="text-slate-500 text-xs">/ {rows.length}</span>
                      </div>
                  </div>
              </div>

              {/* Results Display */}
              <div className="md:w-2/3 space-y-4">
                  {recoveredMnemonic !== null ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 space-y-3 animate-in zoom-in-95">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-500 font-bold">
                                <KeyRound size={20} />
                                <h3>{t('decryption.result.title', { row: targetRow })}</h3>
                            </div>
                            <button
                                onClick={() => handleCopy(recoveredMnemonic || '')}
                                className={`text-xs flex items-center gap-1 transition-colors ${copyFeedback ? 'text-green-400' : 'text-green-500 hover:text-green-400'}`}
                                disabled={!recoveredMnemonic}
                            >
                                {copyFeedback ? <CheckCircle size={14} /> : <Copy size={14} />}
                                {copyFeedback ? t('decryption.result.copied') : t('decryption.result.copy')}
                            </button>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-lg font-mono text-green-400 break-words leading-relaxed border border-green-500/20 shadow-inner whitespace-pre-wrap">
                              {recoveredMnemonic || <span className="text-slate-500 italic">{t('decryption.result.empty')}</span>}
                          </div>
                      </div>
                  ) : targetRow ? (
                       <div className="bg-slate-800/50 p-4 rounded-xl text-center text-slate-400 border border-slate-700 border-dashed">
                           {t('decryption.result.rowAppears', { row: targetRow })}
                       </div>
                  ) : (
                      <div className="bg-primary/5 p-4 rounded-xl text-center text-primary/70 border border-primary/10">
                          <Eye className="mx-auto mb-2 opacity-50" />
                          {t('decryption.result.enterRow')}
                      </div>
                  )}

                  <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('decryption.result.rawPreview')}</h4>
                      <div className="h-64 overflow-y-auto custom-scrollbar bg-slate-950 rounded-xl border border-slate-800">
                          {rows.map((row, idx) => (
                              <div
                                key={idx}
                                className={`flex border-b border-slate-900 last:border-0 ${
                                    (idx + 1).toString() === targetRow
                                    ? 'bg-primary/20 text-white'
                                    : 'text-slate-500 hover:bg-slate-900'
                                }`}
                              >
                                  <div className="w-16 flex-shrink-0 p-2 border-r border-slate-900 font-mono text-xs text-right opacity-50 select-none">
                                      {idx + 1}
                                  </div>
                                  <div className="p-2 font-mono text-xs truncate flex-1 opacity-70">
                                      {row.join('  ')}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
        </div>
      )}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
             <div className="w-full max-w-lg bg-slate-900 rounded-xl overflow-hidden relative shadow-2xl border border-slate-700">
                <QRCodeStreamScanner 
                   onScanComplete={handleStreamScanComplete}
                   onClose={() => setShowScanner(false)}
                />
             </div>
        </div>
      )}
    </div>
  );
};
