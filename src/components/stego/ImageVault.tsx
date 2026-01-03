import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Lock, Unlock, Upload, Trash2, Layers, AlertTriangle, FileText, Plus, Shield, Settings, Key, HelpCircle, CheckCircle2 } from 'lucide-react';
import { packFiles, unpackFiles, encryptBinary, decryptBinary, extractMetadata, encryptShare, decryptShare } from '../../utils/fileCrypto';
import { embedBinary, extractBinary, getCapacity } from '../../utils/binaryStego';
import { split, combine } from '../../utils/shamir';
import { useLicense } from '../../contexts/LicenseContext';
import { ProBadge } from '../ui/ProBadge';

type VaultMode = 'hide' | 'extract';
type KeyMode = 'single' | 'shamir';

export function ImageVault() {
  const { t } = useTranslation();
  const { isPro, triggerUpgrade } = useLicense();
  const [mode, setMode] = useState<VaultMode>('hide');
  
  // State
  const [carrierImage, setCarrierImage] = useState<{ file: File, url: string, width: number, height: number, capacity: number } | null>(null);
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
  const [resultImage, setResultImage] = useState<string | null>(null); // URL
  const [recoveredFiles, setRecoveredFiles] = useState<File[]>([]);

  const carrierInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);
  const shamirInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clear state on mode switch
  useEffect(() => {
    setCarrierImage(null);
    setFilesToHide([]);
    setResultImage(null);
    setRecoveredFiles([]);
    setError(null);
    setStatus(null);
    setPassword('');
    setKeyFile(null);
    setShamirFiles([]);
    setRequiredShamirMeta(null);
  }, [mode]);

  // Adjust threshold when files change
  useEffect(() => {
    if (shamirFiles.length > 0) {
      // Default to ceil(n/2) + 1 if current threshold is invalid
      if (threshold > shamirFiles.length) {
        setThreshold(Math.max(2, Math.ceil(shamirFiles.length * 0.6)));
      }
    }
  }, [shamirFiles.length]);

  const handleCarrierUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setCarrierImage({
          file,
          url,
          width: img.width,
          height: img.height,
          capacity: getCapacity(img.width, img.height)
        });
        setError(null);
      };
      img.src = url;
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
      // Filter duplicates
      const unique = newFiles.filter(nf => !shamirFiles.some(sf => sf.name === nf.name && sf.size === nf.size));
      setShamirFiles([...shamirFiles, ...unique]);
    }
  };

  const getPayloadSizeEstimate = () => {
    const filesSize = filesToHide.reduce((acc, f) => acc + f.size, 0);
    // Overhead estimate
    const overhead = 1000 + (filesToHide.length * 200) + (keyMode === 'shamir' ? shamirFiles.length * 200 : 0); 
    return filesSize + overhead;
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleHide = async () => {
    if (!carrierImage || filesToHide.length === 0) return;

    // Free User Size Limit Check (1.5MB)
    if (!isPro) {
        const totalSize = filesToHide.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 1.5 * 1024 * 1024) {
            setError(t('errors.freeLimitSize') || 'Free users are limited to 1.5MB total file size. Please upgrade for unlimited size.');
            triggerUpgrade();
            return;
        }
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
                  id: i + 1, // Share ID (1-based)
                  data: Array.from(encShare) // Convert to array for JSON
              });
          }

          metadata = {
              type: 'shamir-keyfiles',
              threshold: threshold,
              shares: encryptedShares
          };

          // Encrypt Data with Master Secret (and Password if set)
          encrypted = await encryptBinary(packed, usePassword ? password : '', undefined, undefined, secret, metadata);
      } else {
          // Legacy / Single Key Mode
          const keyBuffer = keyFile ? new Uint8Array(await keyFile.arrayBuffer()) : undefined;
          encrypted = await encryptBinary(packed, usePassword ? password : '', keyBuffer);
      }

      // 3. Check Capacity
      if (encrypted.length > carrierImage.capacity) {
        throw new Error(t('errors.capacityExceeded', { 
          needed: (encrypted.length / 1024).toFixed(1), 
          available: (carrierImage.capacity / 1024).toFixed(1) 
        }) || `Capacity exceeded. Need ${(encrypted.length / 1024).toFixed(1)} KB.`);
      }

      // 4. Embed
      setStatus(t('steganography.process.embedding') || 'Embedding data...');
      
      const img = new Image();
      img.src = carrierImage.url;
      await new Promise(r => img.onload = r);

      const canvas = canvasRef.current!;
      canvas.width = carrierImage.width;
      canvas.height = carrierImage.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newImageData = embedBinary(imageData, encrypted);
      
      ctx.putImageData(newImageData, 0, 0);

      // 5. Generate Blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to generate image');

      const url = URL.createObjectURL(blob);
      setResultImage(url);
      setStatus(t('steganography.status.successHide') || 'Success!');

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (!carrierImage) return;

    setIsProcessing(true);
    setStatus(t('steganography.process.extracting') || 'Extracting data...');
    setError(null);
    setRecoveredFiles([]);
    setRequiredShamirMeta(null);

    try {
      // 1. Extract Binary
      const img = new Image();
      img.src = carrierImage.url;
      await new Promise(r => img.onload = r);

      const canvas = canvasRef.current!;
      canvas.width = carrierImage.width;
      canvas.height = carrierImage.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const encryptedData = extractBinary(imageData);
      
      if (!encryptedData) {
        throw new Error(t('errors.noHiddenData') || 'No hidden data found or image is corrupted');
      }

      // 2. Check Metadata
      const meta = extractMetadata(encryptedData);
      
      if (meta && meta.type === 'shamir-keyfiles') {
          // Shamir Mode Detected
          setRequiredShamirMeta({ ...meta, rawData: encryptedData });
          setIsProcessing(false);
          setStatus(t('steganography.status.keyFilesRequired') || 'Multi-Key Files Required');
          return;
      }

      // 3. Legacy / Single Key Decrypt
      setStatus(t('steganography.process.decrypting') || 'Decrypting...');
      const keyBuffer = keyFile ? new Uint8Array(await keyFile.arrayBuffer()) : undefined;
      // If user unchecked password but it's required, this might fail.
      // But we pass empty string if !usePassword.
      const decrypted = await decryptBinary(encryptedData, usePassword ? password : '', keyBuffer);

      // 4. Unpack
      setStatus(t('steganography.process.unpacking') || 'Unpacking files...');
      const files = await unpackFiles(decrypted);

      setRecoveredFiles(files);
      setStatus(t('steganography.status.successExtract') || 'Files recovered successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Extraction failed. Check password/key file.');
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
              
              // We don't know which file matches which share. Try all shares?
              // Optimization: We could store hash hint, but for now try all.
              // Actually, since encryption used index matching (File 1 -> Share 1),
              // but decryption user might upload in different order.
              // So we must try to decrypt ANY share with THIS file.
              
              for (const shareMeta of shares) {
                  const encShareData = new Uint8Array(shareMeta.data);
                  const decrypted = await decryptShare(encShareData, fileBuffer);
                  if (decrypted) {
                      // Verify format (id-hex)
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
          setRecoveredFiles(files);
          setRequiredShamirMeta(null); // Clear modal state
          setStatus(t('steganography.status.success') || 'Success!');

      } catch (err: any) {
          setError(err.message);
          setStatus(null);
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <canvas ref={canvasRef} className="hidden" />

       {/* Mode Toggle */}
       <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setMode('hide')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            mode === 'hide' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Lock size={20} />
          {t('steganography.mode.hideFiles') || 'Hide Files'}
        </button>
        <button
          onClick={() => setMode('extract')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            mode === 'extract' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Unlock size={20} />
          {t('steganography.mode.extractFiles') || 'Extract Files'}
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 space-y-8">
         {/* Header */}
         <div className="text-center space-y-2">
           <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
             <Layers className={mode === 'hide' ? 'text-indigo-400' : 'text-purple-400'} />
             {mode === 'hide' 
               ? (t('steganography.imageVault.hideTitle') || 'Hide Files in Image')
               : (t('steganography.imageVault.extractTitle') || 'Extract Files from Image')
             }
           </h2>
           <p className="text-slate-400 text-sm max-w-lg mx-auto">
             {mode === 'hide'
               ? (t('steganography.imageVault.hideDesc') || 'Select a carrier image and files to hide. The files will be encrypted and embedded invisibly.')
               : (t('steganography.imageVault.extractDesc') || 'Upload an image containing hidden files to recover them.')
             }
           </p>

           {/* Enhanced Warnings */}
           <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-left max-w-2xl mx-auto mt-4 space-y-2">
             <div className="flex items-start gap-2">
               <AlertTriangle className="shrink-0 mt-0.5 text-rose-400" size={18} />
               <div className="space-y-2 text-sm text-rose-200/90">
                 <p className="font-semibold text-rose-300">{t('steganography.imageVault.warning.title') || 'Critical Image Steganography Rules'}</p>
                 {mode === 'hide' && carrierImage && (
                   <p className="text-xs">{t('steganography.imageVault.warning.capacity') || 'Image capacity depends on resolution. Higher resolution = more storage space. If capacity is exceeded, choose a larger image.'}</p>
                 )}
                 <p>{t('steganography.imageVault.warning.format') || 'The output is always PNG format. Do not convert to JPG or compress, as this will destroy hidden data permanently.'}</p>
                 <p>{t('steganography.imageVault.warning.transfer') || 'When sharing, always use "Send as File" or "Original Quality". Social media platforms compress images and will destroy hidden data.'}</p>
               </div>
             </div>
           </div>
         </div>

         {/* Main Content */}
         <div className="space-y-6">
            
            {/* 1. Carrier Image */}
            <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300 ml-1">
                 {mode === 'hide' 
                   ? (t('steganography.input.carrier') || '1. Select Carrier Image (PNG/JPG)')
                   : (t('steganography.input.stegoImage') || '1. Select Image with Hidden Data')
                 }
               </label>
               <div 
                 onClick={() => carrierInputRef.current?.click()}
                 className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-slate-500 hover:bg-slate-700/30 transition-all cursor-pointer relative overflow-hidden group"
               >
                 <input ref={carrierInputRef} type="file" accept="image/*" className="hidden" onChange={handleCarrierUpload} />
                 
                 {carrierImage ? (
                    <div className="relative z-10 flex items-center gap-4 text-left">
                       <img src={carrierImage.url} alt="Carrier" className="w-20 h-20 object-cover rounded-lg bg-slate-900" />
                       <div>
                         <div className="text-slate-200 font-medium truncate max-w-[200px]">{carrierImage.file.name}</div>
                         <div className="text-slate-500 text-sm">{carrierImage.width} x {carrierImage.height} px</div>
                         {mode === 'hide' && (
                           <div className="text-indigo-400 text-xs mt-1">
                             Max Capacity: {(carrierImage.capacity / 1024 / 1024).toFixed(2)} MB
                           </div>
                         )}
                       </div>
                       <button onClick={(e) => {e.stopPropagation(); setCarrierImage(null);}} className="ml-auto p-2 text-rose-400 hover:bg-rose-500/10 rounded-full">
                         <Trash2 size={18} />
                       </button>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                       <ImageIcon size={32} className="text-slate-500 group-hover:text-slate-400" />
                       <span className="text-slate-400 group-hover:text-slate-300">{t('steganography.input.clickUploadImage') || 'Click to upload image'}</span>
                    </div>
                 )}
               </div>
            </div>

            {/* 2. Files to Hide (Only in Hide Mode) */}
            <AnimatePresence>
               {mode === 'hide' && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="space-y-2 overflow-hidden"
                 >
                   <label className="text-sm font-medium text-slate-300 ml-1">
                     {t('steganography.input.filesToHide') || '2. Select Files to Hide'}
                   </label>
                   <div 
                     onClick={() => filesInputRef.current?.click()}
                     className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-slate-700/30 transition-all cursor-pointer group"
                   >
                     <input ref={filesInputRef} type="file" multiple className="hidden" onChange={handleFilesUpload} />
                     <div className="flex flex-col items-center gap-2">
                        <Upload size={24} className="text-slate-500 group-hover:text-slate-400 transition-colors" />
                        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
                          {filesToHide.length > 0 ? (t('steganography.filesSelected', { count: filesToHide.length }) || `${filesToHide.length} files selected`) : (t('steganography.dropzone.title') || 'Click to select files')}
                        </span>
                        <div className="text-xs mt-2 text-slate-500 bg-slate-800/50 py-1 px-3 rounded-full inline-block border border-slate-700">
                          {isPro 
                              ? <span className="text-indigo-400 font-medium flex items-center gap-1"><CheckCircle2 size={12}/> {t('plan.proUnlimited') || 'Pro Plan: Unlimited'}</span>
                              : <span>{t('plan.freeLimit3FilesSize') || 'Free Plan: Max 3 files / 1.5MB'} • <span className="text-indigo-400 cursor-pointer hover:underline font-medium" onClick={(e) => { e.stopPropagation(); triggerUpgrade(); }}>{t('plan.upgrade') || 'Upgrade'}</span></span>
                          }
                        </div>
                     </div>
                   </div>
                   
                   {/* File List & Capacity Check */}
                   {filesToHide.length > 0 && carrierImage && (
                      <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-2">
                         <div className="flex justify-between items-center text-slate-400 border-b border-slate-700 pb-2">
                           <span>Estimated Size:</span>
                           <span className={getPayloadSizeEstimate() > carrierImage.capacity ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                             {(getPayloadSizeEstimate() / 1024).toFixed(1)} KB / {(carrierImage.capacity / 1024).toFixed(1)} KB
                           </span>
                         </div>
                         <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                           {filesToHide.map((f, i) => (
                             <div key={i} className="flex justify-between text-slate-500">
                               <span className="truncate max-w-[70%]">{f.name}</span>
                               <span>{(f.size / 1024).toFixed(1)} KB</span>
                             </div>
                           ))}
                         </div>
                      </div>
                   )}
                 </motion.div>
               )}
            </AnimatePresence>

            {/* 3. Security Settings */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-slate-300 border-b border-slate-800 pb-2">
                    <Shield size={18} className="text-emerald-400" />
                    <span className="font-medium">{t('steganography.security.title') || 'Security Settings'}</span>
                </div>

                {/* Password Toggle */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={usePassword} 
                                onChange={(e) => setUsePassword(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500/50"
                            />
                            {t('steganography.security.usePassword') || 'Enable Password Protection'}
                        </label>
                    </div>
                    
                    {usePassword && (
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('steganography.enterPassword') || 'Enter encryption password'}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    )}
                </div>

                {/* Key Mode Selection (Only in Hide Mode or if not shamir detected yet) */}
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
                                <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-indigo-500/30">
                                    <span className="text-sm text-indigo-400 truncate max-w-[200px]">{keyFile.name}</span>
                                    <button onClick={() => setKeyFile(null)} className="text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
                                </div>
                            )}
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
                                    <Plus size={14} /> Add Key File
                                </button>
                            </div>
                            <input ref={shamirInputRef} type="file" multiple onChange={handleShamirUpload} className="hidden" />

                            {/* Threshold Slider */}
                            {shamirFiles.length >= 2 && (
                                <div className="space-y-1 pt-2">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Required to Decrypt:</span>
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
                                        Any {threshold} of these {shamirFiles.length} files will be needed to decrypt.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <button
               onClick={mode === 'hide' ? handleHide : handleExtract}
               disabled={isProcessing || !carrierImage || (mode === 'hide' && filesToHide.length === 0)}
               className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                 isProcessing 
                   ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                   : mode === 'hide'
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
                   {mode === 'hide' ? <Lock size={20} /> : <Unlock size={20} />}
                   {mode === 'hide' ? (t('steganography.action.embed') || 'Embed Files') : (t('steganography.action.extract') || 'Extract Files')}
                 </>
               )}
            </button>

            {/* Error */}
            <AnimatePresence>
               {error && (
                 <motion.div
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400"
                 >
                   <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                   <p className="text-sm">{error}</p>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>

         {/* Results */}
         <AnimatePresence>
           {(resultImage || recoveredFiles.length > 0) && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-slate-900 rounded-xl p-6 border border-slate-800"
             >
               {resultImage && (
                 <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Stego Image Ready!</h3>
                    <img src={resultImage} alt="Result" className="max-w-xs mx-auto rounded-lg border border-slate-700" />
                    <a 
                      href={resultImage} 
                      download={`stego_image_${Date.now()}.png`}
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      <Upload size={18} className="rotate-180" /> Download Image
                    </a>
                 </div>
               )}

               {recoveredFiles.length > 0 && (
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-4">
                      <CheckCircle2 size={24} />
                      <h3 className="text-lg font-bold">Recovered {recoveredFiles.length} Files</h3>
                    </div>
                    <div className="grid gap-2">
                      {recoveredFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                          <span className="text-slate-300 truncate">{f.name}</span>
                          <button 
                            onClick={() => {
                                const url = URL.createObjectURL(f);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = f.name;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="text-emerald-400 hover:underline text-sm"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
             </motion.div>
           )}
         </AnimatePresence>
      </div>
      
      {/* Shamir Recovery Modal (Simple Inline Implementation) */}
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

      {/* Enhanced About Section */}
      <div className="mt-8 p-5 bg-slate-900/50 rounded-xl text-sm text-slate-400 border border-slate-800">
          <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
            <HelpCircle size={18} className="text-purple-400" />
            {t('steganography.about.title') || 'About Image Vault'}
          </h4>
          <p className="mb-3 leading-relaxed">
            {t('steganography.imageVault.aboutText') || 'Image Vault allows you to hide multiple files inside a normal image. The result looks like a regular photo.'}
          </p>
          <div className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-blue-500/50 mb-3">
            <p className="text-blue-400 font-semibold mb-1">{t('steganography.about.noteTitle') || 'Note:'}</p>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('steganography.imageVault.aboutNote') || 'The output is a PNG image. Do not compress it or convert it to JPG, otherwise the hidden data will be lost.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
              <p className="text-emerald-400 font-medium mb-1">💡 {t('steganography.imageVault.tip.carrier') || 'Choose a complex image (photos, landscapes) rather than simple graphics for better steganography.'}</p>
            </div>
            <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
              <p className="text-indigo-400 font-medium mb-1">🔒 {t('steganography.imageVault.tip.security') || 'For maximum security, enable password + key file + multi-key sharding.'}</p>
            </div>
          </div>
        </div>
    </div>
  );
}