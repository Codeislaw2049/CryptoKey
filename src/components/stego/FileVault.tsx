import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Lock, Unlock, Upload, Download, Trash2, Layers, Split, AlertCircle, CheckCircle2, Shield, Key, Settings, Plus, Archive, AlertTriangle, HelpCircle } from 'lucide-react';
import { packFiles, unpackFiles, encryptBinary, decryptBinary, shardBinary, mergeShards, extractMetadata, encryptShare, decryptShare } from '../../utils/fileCrypto';
import { split, combine } from '../../utils/shamir';

type VaultMode = 'encrypt' | 'decrypt';
type KeyMode = 'single' | 'shamir';

import { useLicense } from '../../contexts/LicenseContext';
import { ProBadge } from '../ui/ProBadge';

export function FileVault() {
  const { t } = useTranslation();
  const { isPro, triggerUpgrade } = useLicense();
  const [mode, setMode] = useState<VaultMode>('encrypt');
  
  // Input Files
  const [files, setFiles] = useState<File[]>([]);
  
  // Security State
  const [usePassword, setUsePassword] = useState(true);
  const [password, setPassword] = useState('');
  const [keyMode, setKeyMode] = useState<KeyMode>('single');
  
  // Single Key File
  const [keyFile, setKeyFile] = useState<File | null>(null);
  
  // Shamir Key Files
  const [shamirFiles, setShamirFiles] = useState<File[]>([]);
  const [threshold, setThreshold] = useState(2);
  
  // Options
  const [isSharding, setIsSharding] = useState(false);
  const [shardCount, setShardCount] = useState(3);
  const [isCompressionEnabled, setIsCompressionEnabled] = useState(true);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  
  // Decryption State (Shamir)
  const [requiredShamirMeta, setRequiredShamirMeta] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);
  const shamirInputRef = useRef<HTMLInputElement>(null);

  // Adjust threshold when shamir files change
  useEffect(() => {
    if (shamirFiles.length > 0) {
      if (threshold > shamirFiles.length) {
        setThreshold(Math.max(2, Math.ceil(shamirFiles.length * 0.6)));
      }
    }
  }, [shamirFiles.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      let selected = Array.from(e.target.files);
      
      // Free User Limit Check (Immediate Feedback)
      if (!isPro && selected.length > 3) {
          setError(t('errors.freeLimitFiles') || 'Free users are limited to 3 files. First 3 files selected.');
          triggerUpgrade();
          selected = selected.slice(0, 3);
      } else {
          setError(null);
      }

      setFiles(selected);
      setResultFiles([]);
      setStatus(null);
    }
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setKeyFile(e.target.files[0]);
    }
  };
  
  const handleShamirUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const unique = newFiles.filter(nf => !shamirFiles.some(sf => sf.name === nf.name && sf.size === nf.size));
      setShamirFiles([...shamirFiles, ...unique]);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setResultFiles([]);
    setError(null);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleEncrypt = async () => {
    if (files.length === 0) {
      setError(t('errors.noFile') || 'Please select files first');
      return;
    }
    
    // Free User Limit Check
    if (!isPro && files.length > 3) {
        setError(t('errors.freeLimitFiles') || 'Free users are limited to 3 files. Please upgrade for unlimited files.');
        triggerUpgrade();
        return;
    }

    if (usePassword && !password) {
      setError(t('errors.noPassword') || 'Password is required when enabled');
      return;
    }
    if (keyMode === 'shamir' && shamirFiles.length < 2) {
        setError(t('errors.minShamirFiles') || 'At least 2 Key Files required for sharding');
        return;
    }

    setIsProcessing(true);
    setError(null);
    setStatus(t('steganography.process.packing') || 'Packing files...');
    setResultFiles([]);

    try {
      // 1. Pack
      const packed = await packFiles(files, isCompressionEnabled);
      
      // 2. Encrypt
      setStatus(t('steganography.process.encrypting') || 'Encrypting...');
      
      let encrypted: Uint8Array;
      let secret: string | undefined = undefined;
      let metadata: any = undefined;

      if (keyMode === 'shamir') {
          // Shamir Mode
          secret = generateSecret();
          const shares = await split(secret, shamirFiles.length, threshold);
          
          const encryptedShares = [];
          for (let i = 0; i < shamirFiles.length; i++) {
              const fileBuffer = new Uint8Array(await shamirFiles[i].arrayBuffer());
              const encShare = await encryptShare(shares[i], fileBuffer);
              encryptedShares.push({
                  id: i + 1,
                  data: Array.from(encShare)
              });
          }

          metadata = {
              type: 'shamir-keyfiles',
              threshold: threshold,
              shares: encryptedShares
          };

          encrypted = await encryptBinary(packed, usePassword ? password : '', undefined, undefined, secret, metadata);
      } else {
          // Single Key Mode
          const keyBuffer = keyFile ? new Uint8Array(await keyFile.arrayBuffer()) : undefined;
          encrypted = await encryptBinary(packed, usePassword ? password : '', keyBuffer);
      }

      // 3. Payload Sharding (Optional)
      let finalFiles: File[] = [];
      
      if (isSharding) {
        setStatus(t('steganography.process.sharding') || 'Sharding payload...');
        const shards = shardBinary(encrypted, shardCount);
        
        finalFiles = shards.map((shard, index) => {
                const ext = '.enc.part' + (index + 1);
                return new File([shard as any], `vault-${Date.now()}${ext}`, { type: 'application/octet-stream' });
              });
      } else {
          finalFiles = [
            new File([encrypted as any], `vault-${Date.now()}.enc`, { type: 'application/octet-stream' })
          ];
      }

      setResultFiles(finalFiles);
      setStatus(t('steganography.status.successHide') || 'Encryption successful!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Encryption failed');
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (files.length === 0) {
      setError(t('errors.noFile') || 'Please select files first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStatus(t('steganography.process.analyzing') || 'Analyzing files...');
    setResultFiles([]);
    setRequiredShamirMeta(null);

    try {
      let encryptedData: Uint8Array;

      // 1. Check for Payload Shards
      if (files.length > 1) {
        const buffers = await Promise.all(files.map(f => f.arrayBuffer().then(b => new Uint8Array(b))));
        setStatus(t('steganography.process.merging') || 'Merging shards...');
        try {
            encryptedData = mergeShards(buffers);
        } catch (e) {
            // Fallback: assume user uploaded independent files? 
            // For now, if merge fails, we try the first file if it's the only one, but here len > 1
            // Or maybe user uploaded multiple Shamir Key Files? 
            // No, Key Files are separate input.
            throw new Error('Failed to merge payload shards. Ensure all parts are present.');
        }
      } else {
        encryptedData = new Uint8Array(await files[0].arrayBuffer());
      }

      // 2. Check Metadata for Shamir
      const meta = extractMetadata(encryptedData);
      
      if (meta && meta.type === 'shamir-keyfiles') {
          setRequiredShamirMeta({ ...meta, rawData: encryptedData });
          setIsProcessing(false);
          setStatus(t('steganography.status.keyFilesRequired') || 'Multi-Key Files Required');
          return;
      }

      // 3. Legacy / Single Key Decrypt
      setStatus(t('steganography.process.decrypting') || 'Decrypting...');
      const keyBuffer = keyFile ? new Uint8Array(await keyFile.arrayBuffer()) : undefined;
      const decrypted = await decryptBinary(encryptedData, usePassword ? password : '', keyBuffer);

      // 4. Unpack
      setStatus(t('steganography.process.unpacking') || 'Unpacking...');
      const unpackedFiles = await unpackFiles(decrypted);

      setResultFiles(unpackedFiles);
      setStatus(t('steganography.status.successExtract') || 'Decryption successful!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Decryption failed. Check password, key file, or file integrity.');
      setStatus(null);
    } finally {
      if (!requiredShamirMeta) setIsProcessing(false);
    }
  };
  
  const handleShamirDecrypt = async () => {
      if (!requiredShamirMeta || shamirFiles.length === 0) return;
      
      setIsProcessing(true);
      setError(null);
      setStatus(t('steganography.shamir.verifying') || 'Verifying Key Files...');

      try {
          const shares = requiredShamirMeta.shares;
          const foundShares: string[] = [];

          // Try to unlock shares with uploaded files
          for (const file of shamirFiles) {
              const fileBuffer = new Uint8Array(await file.arrayBuffer());
              
              for (const shareMeta of shares) {
                  const encShareData = new Uint8Array(shareMeta.data);
                  const decrypted = await decryptShare(encShareData, fileBuffer);
                  if (decrypted) {
                      if (decrypted.startsWith(`${shareMeta.id}-`)) {
                          if (!foundShares.includes(decrypted)) {
                              foundShares.push(decrypted);
                          }
                      }
                  }
              }
          }

          if (foundShares.length < requiredShamirMeta.threshold) {
              throw new Error(`Not enough valid Key Files. Found ${foundShares.length}, need ${requiredShamirMeta.threshold}.`);
          }

          setStatus(t('steganography.status.reconstructing') || 'Reconstructing Secret...');
          const secret = await combine(foundShares);

          setStatus(t('steganography.status.decryptingPayload') || 'Decrypting Payload...');
          const decrypted = await decryptBinary(requiredShamirMeta.rawData, usePassword ? password : '', undefined, secret);
          
          const files = await unpackFiles(decrypted);
          setResultFiles(files);
          setRequiredShamirMeta(null); 
          setStatus(t('steganography.status.success') || 'Success!');

      } catch (err: any) {
          setError(err.message);
          setStatus(null);
      } finally {
          setIsProcessing(false);
      }
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    resultFiles.forEach(f => downloadFile(f));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Toggle */}
      <div className="flex p-1 bg-slate-800/50 rounded-lg">
        <button
          onClick={() => { setMode('encrypt'); clearFiles(); }}
          className={`flex-1 py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-all ${
            mode === 'encrypt' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-indigo-400'
          }`}
        >
          <Lock size={18} />
          <span className="font-medium">{t('steganography.mode.encrypt') || 'Encrypt & Shard'}</span>
        </button>
        <button
          onClick={() => { setMode('decrypt'); clearFiles(); }}
          className={`flex-1 py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-all ${
            mode === 'decrypt' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-purple-400'
          }`}
        >
          <Unlock size={18} />
          <span className="font-medium">{t('steganography.mode.decrypt') || 'Decrypt & Recover'}</span>
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            {mode === 'encrypt' ? <Layers className="text-indigo-400" /> : <FileText className="text-purple-400" />}
            {mode === 'encrypt' 
              ? (t('steganography.fileVault.encryptTitle') || 'Create Secure Vault')
              : (t('steganography.fileVault.decryptTitle') || 'Open Secure Vault')
            }
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            {mode === 'encrypt'
              ? (t('steganography.fileVault.encryptDesc') || 'Combine multiple files into a single encrypted package, with optional sharding for distributed storage.')
              : (t('steganography.fileVault.decryptDesc') || 'Restore your files from a single encrypted package or multiple shards.')
            }
          </p>

          {/* Enhanced Warnings */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-left max-w-2xl mx-auto mt-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="shrink-0 mt-0.5 text-amber-400" size={18} />
              <div className="space-y-2 text-sm text-amber-200/90">
                <p className="font-semibold text-amber-300">{t('steganography.fileVault.warning.title') || 'Important Security Reminders'}</p>
                <p>{t('steganography.fileVault.warning.password') || 'If you lose your password or key file, the data cannot be recovered. Please store them safely.'}</p>
                {mode === 'encrypt' && isSharding && (
                  <p className="text-amber-300/80 text-xs italic">{t('steganography.fileVault.warning.sharding') || 'Payload sharding splits encrypted data into multiple parts for distributed storage. All parts are needed to decrypt.'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-6">
          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">
              {mode === 'encrypt' 
                ? (t('steganography.input.filesToHide') || 'Select Files to Encrypt') 
                : (t('steganography.input.filesToRecover') || 'Select Encrypted File(s) / Shards')
              }
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-slate-500 hover:bg-slate-700/30 transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${files.length > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400 group-hover:text-slate-300'}`}>
                  {files.length > 0 ? <CheckCircle2 size={24} /> : <Upload size={24} />}
                </div>
                <div>
                  {files.length > 0 ? (
                    <div className="text-slate-200 font-medium">
                      {t('steganography.fileVault.selectedFiles', { count: files.length }) || `${files.length} files selected`}
                    </div>
                  ) : (
                    <>
                      <div className="text-slate-300 font-medium">
                        {t('steganography.dropzone.title') || 'Click to upload files'}
                      </div>
                      <div className="text-slate-500 text-sm mt-1">
                        {t('steganography.dropzone.subtitle') || 'Support multiple files selection'}
                      </div>
                      <div className="text-xs mt-3 text-slate-500 bg-slate-800/50 py-1 px-3 rounded-full inline-block border border-slate-700">
                          {isPro 
                              ? <span className="text-indigo-400 font-medium flex items-center gap-1"><CheckCircle2 size={12}/> {t('plan.proUnlimitedFiles') || 'Pro Plan: Unlimited Files'}</span>
                              : <span>{t('plan.freeLimit3Files') || 'Free Plan: Max 3 files'} • <span className="text-indigo-400 cursor-pointer hover:underline font-medium" onClick={(e) => { e.stopPropagation(); triggerUpgrade(); }}>{t('plan.upgradeForUnlimited') || 'Upgrade for Unlimited'}</span></span>
                          }
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {files.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-2">
                 {files.slice(0, 5).map((f, i) => (
                   <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full border border-slate-600 truncate max-w-[200px]">
                     {f.name}
                   </span>
                 ))}
                 {files.length > 5 && (
                   <span className="text-xs text-slate-500 py-1">+{files.length - 5} more</span>
                 )}
                 <button onClick={(e) => { e.stopPropagation(); clearFiles(); }} className="text-xs text-rose-400 hover:text-rose-300 ml-auto flex items-center gap-1">
                   <Trash2 size={12} /> {t('common.clear') || 'Clear'}
                 </button>
               </div>
            )}
          </div>

          {/* Security Settings (Password + Key) */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-slate-300 border-b border-slate-800 pb-2">
                  <Shield size={18} className="text-indigo-400" />
                  <span className="font-medium">{t('steganography.security.title') || 'Security Settings'}</span>
              </div>

              {/* Password Toggle */}
              <div className="space-y-3">
                  <label className="text-sm text-slate-400 flex items-center gap-2 cursor-pointer">
                      <input 
                          type="checkbox" 
                          checked={usePassword} 
                          onChange={(e) => setUsePassword(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500/50"
                      />
                      {t('steganography.security.usePassword') || 'Enable Password Protection'}
                  </label>
                  
                  {usePassword && (
                      <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('common.passwordPlaceholder') || 'Enter password'}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                  )}
              </div>

              {/* Key Mode Selection (Encrypt Mode Only) */}
              {mode === 'encrypt' && (
                  <div className="space-y-3 pt-2">
                      <label className="text-sm font-medium text-slate-400 block">
                          {t('steganography.keyFile.mode') || 'Key File Mode'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                          <button
                              onClick={() => setKeyMode('single')}
                              className={`py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${
                                  keyMode === 'single' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700/50'
                              }`}
                          >
                              <Key size={16} />
                              {t('steganography.keyMode.single') || 'Single Key'}
                          </button>
                          <button
                              onClick={() => {
                                  if (!isPro) {
                                      triggerUpgrade();
                                      return;
                                  }
                                  setKeyMode('shamir');
                              }}
                              className={`relative py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all overflow-hidden ${
                                  keyMode === 'shamir'
                                  ? 'bg-indigo-600 text-white'
                                  : isPro
                                      ? 'bg-slate-800 text-slate-500 hover:bg-slate-700/50'
                                      : 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-70'
                              }`}
                          >
                              <Settings size={16} />
                              {t('steganography.keyMode.multiKey') || 'Multi-Key (Sharded)'}
                              {!isPro && (
                                  <div className="absolute top-0 right-0 p-0.5">
                                      <ProBadge />
                                  </div>
                              )}
                          </button>
                      </div>
                  </div>
              )}

              {/* Key File Inputs */}
              <div className="space-y-2">
                  {keyMode === 'single' ? (
                      <div className="relative group">
                          <input ref={keyFileInputRef} type="file" onChange={handleKeyFileChange} className="hidden" />
                          {!keyFile ? (
                              <button onClick={() => keyFileInputRef.current?.click()} className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-500 text-sm hover:border-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2">
                                  <Plus size={16} />
                                  {t('steganography.keyFile.addSingle') || 'Add Key File (Optional)'}
                              </button>
                          ) : (
                              <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-emerald-500/30">
                                  <div className="flex items-center gap-2">
                                      <FileText size={16} className="text-emerald-400" />
                                      <span className="text-sm text-emerald-400 truncate max-w-[200px]">{keyFile.name}</span>
                                  </div>
                                  <button onClick={() => setKeyFile(null)} className="text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
                              </div>
                          )}
                          <p className="mt-1 text-[10px] text-slate-500">
                              {t('steganography.keyFile.help') || 'If used, the EXACT same file is required to decrypt.'}
                          </p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                  {t('steganography.shamir.filesCount', {count: shamirFiles.length}) || `${shamirFiles.length} files added`}
                              </span>
                              {shamirFiles.length > 0 && (
                                  <button onClick={() => setShamirFiles([])} className="text-xs text-rose-400 hover:underline">{t('steganography.keyFile.clearAll') || 'Clear All'}</button>
                              )}
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2">
                              {shamirFiles.map((f, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg text-xs text-slate-300">
                                      <FileText size={14} className="text-indigo-400" />
                                      <span className="truncate flex-1">{f.name}</span>
                                      <span className="text-slate-500">{(f.size/1024).toFixed(0)}KB</span>
                                  </div>
                              ))}
                              <button onClick={() => shamirInputRef.current?.click()} className="py-2 border border-dashed border-indigo-500/50 rounded-lg text-indigo-400 text-xs hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-1">
                                  <Plus size={14} /> {t('steganography.keyFile.addFiles') || 'Add Key File'}
                              </button>
                          </div>
                          <input ref={shamirInputRef} type="file" multiple onChange={handleShamirUpload} className="hidden" />

                          {/* Threshold Slider */}
                          {shamirFiles.length >= 2 && (
                              <div className="space-y-1 pt-2">
                                  <div className="flex justify-between text-xs text-slate-400">
                                      <span>{t('common.requiredToDecrypt') || 'Required to Decrypt:'}</span>
                                      <span className="text-indigo-400 font-bold">{threshold} / {shamirFiles.length}</span>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="2" 
                                      max={shamirFiles.length} 
                                      value={threshold} 
                                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                  />
                                  <p className="text-[10px] text-slate-500">
                                      {t('steganography.shamir.requiredFiles', { threshold, total: shamirFiles.length }) || `Any ${threshold} of these ${shamirFiles.length} files will be needed to decrypt.`}
                                  </p>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* Compression Option (Encrypt Only) */}
          <AnimatePresence>
            {mode === 'encrypt' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isCompressionEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                    <Archive size={20} />
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium">{t('steganography.compression.label') || 'Compress Files'}</div>
                    <div className="text-xs text-slate-500">{t('steganography.compression.desc') || 'Reduce file size before encryption'}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCompressionEnabled(!isCompressionEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isCompressionEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isCompressionEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Payload Sharding Options (Encrypt Only) */}
          <AnimatePresence>
            {mode === 'encrypt' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split size={18} className={isSharding ? 'text-indigo-400' : 'text-slate-500'} />
                    <span className="text-slate-300 font-medium">{t('steganography.sharding.enable') || 'Enable Payload Sharding'}</span>
                    {!isPro && <ProBadge />}
                  </div>
                  <button 
                    onClick={() => {
                        if (!isPro) {
                            triggerUpgrade();
                            return;
                        }
                        setIsSharding(!isSharding);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isSharding ? 'bg-indigo-500' : 'bg-slate-700'} ${!isPro ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSharding ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {isSharding && (
                  <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 border border-slate-700/50">
                    <div className="flex justify-between items-center text-sm text-slate-400">
                      <span>{t('steganography.sharding.count') || 'Number of Parts'}</span>
                      <div className="flex items-center gap-2">
                          <input
                              type="number"
                              min="2"
                              max="100"
                              value={shardCount}
                              onChange={(e) => {
                                  let val = parseInt(e.target.value);
                                  if (isNaN(val)) val = 2;
                                  if (val < 2) val = 2;
                                  if (val > 100) val = 100;
                                  setShardCount(val);
                              }}
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-indigo-400 font-bold focus:outline-none focus:border-indigo-500"
                          />
                      </div>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      value={shardCount}
                      onChange={(e) => setShardCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <p className="text-xs text-slate-500">
                      {t('steganography.sharding.note') || 'The encrypted result will be split into multiple files for distributed storage.'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <button
            onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
            disabled={isProcessing || (mode === 'encrypt' && files.length === 0)}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
              isProcessing 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : mode === 'encrypt'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-indigo-500/20'
                  : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-400 hover:to-fuchsia-400 shadow-purple-500/20'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{status}</span>
              </>
            ) : (
              <>
                {mode === 'encrypt' ? <Lock size={20} /> : <Unlock size={20} />}
                {mode === 'encrypt' 
                  ? (t('steganography.action.encrypt') || 'Encrypt Files') 
                  : (t('steganography.action.decrypt') || 'Recover Files')
                }
              </>
            )}
          </button>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start gap-3 text-sm"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {resultFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-4 border-t border-slate-700/50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-200 font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-indigo-400" />
                    {t('steganography.result.success') || 'Operation Successful'}
                  </h3>
                  <button onClick={downloadAll} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                    {t('steganography.result.downloadAll') || 'Download All'}
                  </button>
                </div>
                
                <div className="bg-slate-900/50 rounded-lg p-2 max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                  {resultFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <span className="text-slate-300 text-sm truncate">{file.name}</span>
                        <span className="text-slate-600 text-xs shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button 
                        onClick={() => downloadFile(file)}
                        className="p-2 rounded-full hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* About Section */}
        <div className="mt-6 p-5 bg-slate-900/50 rounded-xl text-sm text-slate-400 border border-slate-800">
          <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
            <HelpCircle size={18} className="text-indigo-400" />
            {t('steganography.fileVault.about.title') || 'About File Vault'}
          </h4>
          <p className="mb-3 leading-relaxed">
            {t('steganography.fileVault.about.text') || 'File Vault allows you to pack multiple files into a single encrypted package. You can enable payload sharding to split the result into multiple parts for distributed storage (e.g., cloud services). Multi-Key mode uses Shamir Secret Sharing to require multiple key files for decryption.'}
          </p>
          <div className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-emerald-500/50">
            <p className="text-emerald-400 font-semibold mb-1">{t('steganography.fileVault.about.noteTitle') || 'Best Practices:'}</p>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('steganography.fileVault.about.note') || 'Always keep backups of your password and key files. If using sharding, store parts in different locations. For maximum security, combine password + key file + sharding.'}
            </p>
          </div>
        </div>
      </div>

      {/* Shamir Recovery Modal */}
      {requiredShamirMeta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl">
                  <div className="text-center space-y-2">
                      <Shield size={48} className="text-indigo-500 mx-auto" />
                      <h3 className="text-xl font-bold text-white">{t('steganography.shamir.modalTitle') || 'Multi-Key Authentication'}</h3>
                      <p className="text-slate-400 text-sm">
                          {t('steganography.shamir.modalDesc') || 'This file is protected by multiple Key Files.'}
                          <br/>{t('steganography.shamir.modalNeedFiles', { threshold: requiredShamirMeta.threshold }).replace('{threshold}', `<strong class="text-indigo-400">${requiredShamirMeta.threshold}</strong>`) ?
                            <span dangerouslySetInnerHTML={{ __html: t('steganography.shamir.modalNeedFiles', { threshold: requiredShamirMeta.threshold }).replace('{threshold}', `<strong class="text-indigo-400">${requiredShamirMeta.threshold}</strong>`) }} /> :
                            <>You need to provide at least <strong className="text-indigo-400">{requiredShamirMeta.threshold}</strong> valid files.</>
                          }
                      </p>
                  </div>

                  <div className="space-y-4">
                      <div className="bg-slate-800 p-4 rounded-xl text-center border border-dashed border-slate-600 cursor-pointer hover:border-indigo-500 transition-colors"
                           onClick={() => shamirInputRef.current?.click()}>
                          <Upload className="mx-auto text-slate-500 mb-2" />
                          <p className="text-sm text-slate-300">{t('steganography.shamir.uploadKeyFiles') || 'Upload Key Files'}</p>
                          <p className="text-xs text-slate-500 mt-1">{t('steganography.shamir.filesSelected', { count: shamirFiles.length }) || `${shamirFiles.length} files selected`}</p>
                      </div>

                      {shamirFiles.length > 0 && (
                          <div className="max-h-32 overflow-y-auto space-y-1">
                              {shamirFiles.map((f, i) => (
                                  <div key={i} className="text-xs text-slate-400 flex justify-between px-2">
                                      <span className="truncate">{f.name}</span>
                                      <button onClick={() => setShamirFiles(shamirFiles.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-300">x</button>
                                  </div>
                              ))}
                          </div>
                      )}

                      <div className="flex gap-3">
                          <button 
                              onClick={() => { setRequiredShamirMeta(null); setShamirFiles([]); }}
                              className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 font-medium"
                          >
                              {t('steganography.shamir.cancel') || 'Cancel'}
                          </button>
                          <button 
                              onClick={handleShamirDecrypt}
                              disabled={shamirFiles.length < requiredShamirMeta.threshold || isProcessing}
                              className="flex-1 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isProcessing ? (t('steganography.shamir.verifying') || 'Verifying...') : (t('steganography.shamir.unlock') || 'Unlock')}
                          </button>
                      </div>
                      
                      {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
