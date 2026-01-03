import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Lock, Unlock, Upload, Download, FileText, AlertCircle, CheckCircle2, AlertTriangle, Trash2, Shield, Key, Settings, Plus, HelpCircle } from 'lucide-react';
import { packFiles, unpackFiles, encryptBinary, decryptBinary, extractMetadata, encryptShare, decryptShare } from '../../utils/fileCrypto';
import { embedInVideo, extractFromVideo } from '../../utils/videoStego';
import { split, combine } from '../../utils/shamir';
import { useLicense } from '../../contexts/LicenseContext';
import { ProBadge } from '../ui/ProBadge';

type VaultMode = 'hide' | 'extract';
type KeyMode = 'single' | 'shamir';

export function VideoVault() {
  const { t } = useTranslation();
  const { isPro, triggerUpgrade } = useLicense();
  const [mode, setMode] = useState<VaultMode>('hide');
  
  // State
  const [carrierVideo, setCarrierVideo] = useState<{ file: File, url: string } | null>(null);
  const [filesToHide, setFilesToHide] = useState<File[]>([]);
  
  // Security State
  const [usePassword, setUsePassword] = useState(true);
  const [password, setPassword] = useState('');
  const [keyMode, setKeyMode] = useState<KeyMode>('single');
  
  // Single Key File
  const [keyFile, setKeyFile] = useState<File | null>(null);
  
  // Shamir Key Files
  const [shamirFiles, setShamirFiles] = useState<File[]>([]);
  const [threshold, setThreshold] = useState(2);
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Decryption State (for Shamir)
  const [requiredShamirMeta, setRequiredShamirMeta] = useState<any | null>(null);

  // Results
  const [resultVideo, setResultVideo] = useState<string | null>(null); // URL
  const [recoveredFiles, setRecoveredFiles] = useState<File[]>([]);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);
  const shamirInputRef = useRef<HTMLInputElement>(null);

  // Clear state on mode switch
  useEffect(() => {
    setCarrierVideo(null);
    setFilesToHide([]);
    setResultVideo(null);
    setRecoveredFiles([]);
    setError(null);
    setStatus(null);
    setPassword('');
    setKeyFile(null);
    setShamirFiles([]);
    setRequiredShamirMeta(null);
    // Clean up object URLs
    return () => {
      if (carrierVideo) URL.revokeObjectURL(carrierVideo.url);
      if (resultVideo) URL.revokeObjectURL(resultVideo);
    };
  }, [mode]);

  // Adjust threshold when files change
  useEffect(() => {
    if (shamirFiles.length > 0) {
      if (threshold > shamirFiles.length) {
        setThreshold(Math.max(2, Math.ceil(shamirFiles.length * 0.6)));
      }
    }
  }, [shamirFiles.length]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCarrierVideo({ file, url });
      setError(null);
    }
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      let selected = Array.from(e.target.files);
      
      // Free User Limit Check
      if (!isPro && selected.length > 3) {
          setError(t('errors.freeLimitFiles') || 'Free users are limited to 3 files. First 3 files selected.');
          triggerUpgrade();
          selected = selected.slice(0, 3);
      } else {
          setError(null);
      }
      
      setFilesToHide(selected);
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

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleHide = async () => {
    if (!carrierVideo || filesToHide.length === 0) return;
    if (usePassword && !password) {
        setError(t('errors.noPassword') || 'Password is required when enabled');
        return;
    }
    if (keyMode === 'shamir' && shamirFiles.length < 2) {
        setError(t('errors.minShamirFiles') || 'At least 2 Key Files required for sharding');
        return;
    }

    setIsProcessing(true);
    setStatus(t('steganography.process.packing') || 'Packing files...');
    setError(null);

    try {
      // 1. Pack
      const packed = await packFiles(filesToHide);
      
      // 2. Encrypt
      setStatus(t('steganography.process.encrypting') || 'Encrypting...');
      
      let encrypted: Uint8Array;
      let secret: string | undefined = undefined;
      let metadata: any = undefined;

      if (keyMode === 'shamir') {
          // Generate Master Secret
          secret = generateSecret();
          
          // Split Secret
          const shares = await split(secret, shamirFiles.length, threshold);
          
          // Encrypt Shares with Key Files
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
          // Legacy / Single Key
          const keyBuffer = keyFile ? new Uint8Array(await keyFile.arrayBuffer()) : undefined;
          encrypted = await encryptBinary(packed, usePassword ? password : '', keyBuffer);
      }

      // 3. Embed (Append)
      setStatus(t('steganography.process.embedding') || 'Embedding data...');
      const blob = await embedInVideo(carrierVideo.file, encrypted);
      
      const url = URL.createObjectURL(blob);
      setResultVideo(url);
      setStatus(t('steganography.status.successHide') || 'Success!');

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (!carrierVideo) return;

    setIsProcessing(true);
    setStatus(t('steganography.process.extracting') || 'Extracting data...');
    setError(null);
    setRecoveredFiles([]);
    setRequiredShamirMeta(null);

    try {
      // 1. Extract
      const encryptedData = await extractFromVideo(carrierVideo.file);
      
      if (!encryptedData) {
        throw new Error(t('errors.noHiddenData') || 'No hidden data found or video is corrupted');
      }

      // 2. Check Metadata
      const meta = extractMetadata(encryptedData);
      
      if (meta && meta.type === 'shamir-keyfiles') {
          setRequiredShamirMeta({ ...meta, rawData: encryptedData });
          setIsProcessing(false);
          setStatus(t('steganography.status.keyFilesRequired') || 'Multi-Key Files Required');
          return;
      }

      // 3. Decrypt
      setStatus(t('steganography.process.decrypting') || 'Decrypting...');
      const keyBuffer = keyFile ? new Uint8Array(await keyFile.arrayBuffer()) : undefined;
      const decrypted = await decryptBinary(encryptedData, usePassword ? password : '', keyBuffer);

      // 4. Unpack
      setStatus(t('steganography.process.unpacking') || 'Unpacking files...');
      const files = await unpackFiles(decrypted);

      setRecoveredFiles(files);
      setStatus(t('steganography.status.successExtract') || 'Files recovered successfully!');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Extraction failed. Check password, key file, or video integrity.');
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

          for (const file of shamirFiles) {
              const fileBuffer = new Uint8Array(await file.arrayBuffer());
              
              for (const shareMeta of shares) {
                  const encShareData = new Uint8Array(shareMeta.data);
                  const decrypted = await decryptShare(encShareData, fileBuffer);
                  if (decrypted && decrypted.startsWith(`${shareMeta.id}-`)) {
                      if (!foundShares.includes(decrypted)) {
                          foundShares.push(decrypted);
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
          setRecoveredFiles(files);
          setRequiredShamirMeta(null);
          setStatus(t('steganography.status.success') || 'Success!');

      } catch (err: any) {
          setError(err.message);
          setStatus(null);
      } finally {
          setIsProcessing(false);
      }
  };

  const downloadResult = () => {
    if (!resultVideo) return;
    const a = document.createElement('a');
    a.href = resultVideo;
    const originalName = carrierVideo?.file.name || 'video.mp4';
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    a.download = `stego-video-${Date.now()}${ext}`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Mode Selection */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setMode('hide')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
            mode === 'hide'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Lock size={20} />
          <span className="font-medium">{t('steganography.videoVault.hideTitle') || 'Hide Files in Video'}</span>
        </button>
        <button
          onClick={() => setMode('extract')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
            mode === 'extract'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Unlock size={20} />
          <span className="font-medium">{t('steganography.videoVault.extractTitle') || 'Extract Files from Video'}</span>
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-200">
                {mode === 'hide' 
                  ? (t('steganography.videoVault.hideTitle') || 'Hide Files in Video')
                  : (t('steganography.videoVault.extractTitle') || 'Extract Files from Video')
                }
              </h2>
              <p className="text-slate-400">
                {mode === 'hide'
                  ? (t('steganography.videoVault.hideDesc') || 'Select a carrier video and files to hide. The files will be appended to the video securely.')
                  : (t('steganography.videoVault.extractDesc') || 'Upload a video containing hidden files to recover them.')
                }
              </p>
              
              {/* Enhanced Warnings */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-left max-w-2xl mx-auto mt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="shrink-0 mt-0.5 text-orange-400" size={18} />
                  <div className="space-y-2 text-sm text-orange-200/90">
                    <p className="font-semibold text-orange-300">{t('steganography.videoVault.warning.title') || 'Important Video Steganography Warnings'}</p>
                    <p>{t('steganography.videoVault.warning.format') || 'Hidden data is appended to the video file. Do not re-encode, compress, or change the video format, as this will destroy the hidden data.'}</p>
                    <p>{t('steganography.videoVault.warning.transfer') || 'When sharing, always transfer as original file. Video streaming platforms re-encode videos and will destroy hidden data.'}</p>
                    {mode === 'hide' && filesToHide.length > 0 && (
                      <p className="text-xs text-orange-300/80 italic">{t('steganography.videoVault.warning.size') || 'The output video size will be slightly larger (by the size of hidden files). This is normal and expected.'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Inputs */}
              <div className="space-y-6">
                {/* 1. Video Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-400">
                    {mode === 'hide' 
                      ? (t('steganography.input.carrierVideo') || '1. Select Carrier Video (MP4/WebM)')
                      : (t('steganography.input.stegoVideo') || '1. Select Video with Hidden Data')
                    }
                  </label>
                  <div 
                    onClick={() => videoInputRef.current?.click()}
                    className={`
                      relative group cursor-pointer border-2 border-dashed rounded-xl p-8 transition-all
                      ${carrierVideo ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-700/30'}
                    `}
                  >
                    <input 
                      ref={videoInputRef}
                      type="file" 
                      accept="video/*" 
                      onChange={handleVideoUpload} 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className={`p-3 rounded-full ${carrierVideo ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400'}`}>
                        {carrierVideo ? <CheckCircle2 size={24} /> : <Video size={24} />}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-300">
                          {carrierVideo ? carrierVideo.file.name : (t('common.clickToUpload') || 'Click to upload')}
                        </p>
                        {carrierVideo && (
                          <p className="text-xs text-slate-500">
                            {(carrierVideo.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Files Input (Hide Mode Only) */}
                {mode === 'hide' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400">
                      {t('steganography.input.filesToHide') || '2. Select Files to Hide'}
                    </label>
                    <div 
                      onClick={() => filesInputRef.current?.click()}
                      className={`
                        relative group cursor-pointer border-2 border-dashed rounded-xl p-6 transition-all
                        ${filesToHide.length > 0 ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-700/30'}
                      `}
                    >
                      <input 
                        ref={filesInputRef}
                        type="file" 
                        multiple 
                        onChange={handleFilesUpload} 
                        className="hidden" 
                      />
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className={`p-2 rounded-full ${filesToHide.length > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400'}`}>
                          {filesToHide.length > 0 ? <FileText size={20} /> : <Upload size={20} />}
                        </div>
                        <p className="font-medium text-slate-300">
                          {filesToHide.length > 0 
                            ? t('steganography.fileCount', { count: filesToHide.length }) || `${filesToHide.length} files selected`
                            : (t('steganography.selectFiles') || 'Select files to hide')
                          }
                        </p>
                         <div className="text-xs mt-2 text-slate-500 bg-slate-800/50 py-1 px-3 rounded-full inline-block border border-slate-700">
                           {isPro 
                               ? <span className="text-indigo-400 font-medium flex items-center gap-1"><CheckCircle2 size={12}/> {t('plan.proUnlimited') || 'Pro Plan: Unlimited'}</span>
                               : <span>{t('plan.freeLimit3Files') || 'Free Plan: Max 3 files'} • <span className="text-indigo-400 cursor-pointer hover:underline font-medium" onClick={(e) => { e.stopPropagation(); triggerUpgrade(); }}>{t('plan.upgrade') || 'Upgrade'}</span></span>
                           }
                         </div>
                      </div>
                    </div>
                    
                    {/* File List */}
                    {filesToHide.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {filesToHide.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-slate-800 p-2 rounded">
                            <span className="truncate max-w-[200px] text-slate-300">{f.name}</span>
                            <span className="text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Security Settings */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-4">
                    <div className="flex items-center gap-2 text-slate-300 border-b border-slate-700 pb-2">
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
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                        )}
                    </div>

                    {/* Key Mode Selection (Hide Mode Only) */}
                    {mode === 'hide' && (
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
                                    <button onClick={() => keyFileInputRef.current?.click()} className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-500 text-sm hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                                        {t('steganography.keyFile.addSingle') || '+ Add Key File (Optional)'}
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-indigo-500/30">
                                        <span className="text-sm text-indigo-400 truncate max-w-[150px]">{keyFile.name}</span>
                                        <button onClick={() => setKeyFile(null)} className="text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">{shamirFiles.length} files added</span>
                                    {shamirFiles.length > 0 && <button onClick={() => setShamirFiles([])} className="text-xs text-rose-400">{t('steganography.keyFile.clear') || 'Clear'}</button>}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {shamirFiles.slice(0, 3).map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg text-xs text-slate-300">
                                            <FileText size={14} className="text-indigo-400" />
                                            <span className="truncate flex-1">{f.name}</span>
                                        </div>
                                    ))}
                                    {shamirFiles.length > 3 && <div className="text-xs text-center text-slate-500">+{shamirFiles.length - 3} more</div>}
                                    <button onClick={() => shamirInputRef.current?.click()} className="py-2 border border-dashed border-indigo-500/50 rounded-lg text-indigo-400 text-xs hover:bg-indigo-500/10 flex items-center justify-center gap-1">
                                        <Plus size={14} /> {t('steganography.keyFile.addFiles') || 'Add Files'}
                                    </button>
                                </div>
                                <input ref={shamirInputRef} type="file" multiple onChange={handleShamirUpload} className="hidden" />
                                
                                {shamirFiles.length >= 2 && (
                                    <div className="space-y-1 pt-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{t('steganography.shamir.thresholdLabel') || 'Threshold'}:</span>
                                            <span className="text-indigo-400 font-bold">{threshold} / {shamirFiles.length}</span>
                                        </div>
                                        <input type="range" min="2" max={shamirFiles.length} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={mode === 'hide' ? handleHide : handleExtract}
                  disabled={!carrierVideo || (mode === 'hide' && filesToHide.length === 0) || isProcessing}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isProcessing 
                      ? 'bg-slate-700 text-slate-400' 
                      : mode === 'hide'
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-indigo-500/20'
                        : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-400 hover:to-fuchsia-400 shadow-purple-500/20'
                    }
                  `}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                      {status}
                    </span>
                  ) : (
                    mode === 'hide' ? (t('steganography.action.embed') || 'Embed Files') : (t('steganography.action.extract') || 'Extract Files')
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Results */}
              <div className="space-y-6">
                <div className="h-full bg-slate-900/50 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                  {resultVideo ? (
                    <div className="space-y-6 w-full animate-in fade-in zoom-in duration-300">
                      <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-200">
                          {t('steganography.result.videoReady') || 'Stego Video Generated!'}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {t('steganography.result.videoReadyDesc') || 'Your files have been securely hidden inside the video.'}
                        </p>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                      >
                        <Download size={20} />
                        {t('common.download') || 'Download Video'}
                      </button>
                    </div>
                  ) : recoveredFiles.length > 0 ? (
                    <div className="space-y-6 w-full animate-in fade-in zoom-in duration-300">
                       <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto">
                        <Unlock size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-200">
                        {t('steganography.result.filesRecovered', { count: recoveredFiles.length }) || `${recoveredFiles.length} Files Recovered!`}
                      </h3>
                      <div className="max-h-60 overflow-y-auto space-y-2 text-left w-full">
                        {recoveredFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                            <span className="text-sm text-slate-300 truncate max-w-[150px]">{f.name}</span>
                            <button 
                              onClick={() => {
                                const url = URL.createObjectURL(f);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = f.name;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="text-purple-400 text-sm hover:underline"
                            >
                              Save
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <p>{t('steganography.result.waiting') || 'Results will appear here'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced About Section */}
            <div className="mt-8 p-5 bg-slate-900/50 rounded-xl text-sm text-slate-400 border border-slate-800">
              <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                <HelpCircle size={18} className="text-rose-400" />
                {t('steganography.about.title') || 'About Video Vault'}
              </h4>
              <p className="mb-3 leading-relaxed">
                {t('steganography.videoVault.aboutText') || 'Video Vault allows you to hide multiple files inside a video securely. The files are appended and encrypted.'}
              </p>
              <div className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-yellow-500/50 mb-3">
                <p className="text-yellow-400 font-semibold mb-1">{t('steganography.about.noteTitle') || 'Note:'}</p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t('steganography.videoVault.aboutNote') || 'The output format depends on the original video. Do not re-encode or compress the video, or the hidden files will be lost.'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
                  <p className="text-emerald-400 font-medium mb-1">🎬 {t('steganography.videoVault.tip.carrier') || 'Any video format works (MP4, WebM, etc.). The hidden data is format-independent.'}</p>
                </div>
                <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
                  <p className="text-indigo-400 font-medium mb-1">🔐 {t('steganography.videoVault.tip.detection') || 'Video steganography is highly covert - the video plays normally and file size increase is minimal.'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Shamir Recovery Modal */}
      {requiredShamirMeta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl">
                  <div className="text-center space-y-2">
                      <Shield size={48} className="text-indigo-500 mx-auto" />
                      <h3 className="text-xl font-bold text-white">{t('steganography.shamir.modalTitle') || 'Multi-Key Authentication'}</h3>
                      <p className="text-slate-400 text-sm">
                          This file is protected by multiple Key Files. 
                          <br/>You need to provide at least <strong className="text-indigo-400">{requiredShamirMeta.threshold}</strong> valid files.
                      </p>
                  </div>

                  <div className="space-y-4">
                      <div className="bg-slate-800 p-4 rounded-xl text-center border border-dashed border-slate-600 cursor-pointer hover:border-indigo-500 transition-colors"
                           onClick={() => shamirInputRef.current?.click()}>
                          <Upload className="mx-auto text-slate-500 mb-2" />
                          <p className="text-sm text-slate-300">{t('steganography.shamir.uploadKeyFiles') || 'Upload Key Files'}</p>
                          <p className="text-xs text-slate-500 mt-1">{shamirFiles.length} files selected</p>
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
