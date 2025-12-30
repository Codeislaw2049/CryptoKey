import { useState, useRef } from 'react';
import { Download, Eye, EyeOff, Image as ImageIcon, AlertTriangle, CheckCircle2, Copy, Share2, Layers, FileText, Lock, Clipboard } from 'lucide-react';
import { ProBadge } from './ui/ProBadge';
import { embedData, extractData } from '../utils/steganography';
import { split, combine, sha256, hexToStr } from '../utils/shamir';
import { motion, AnimatePresence } from 'framer-motion';
import { useLicense } from '../contexts/LicenseContext';
import { useTranslation } from 'react-i18next';

interface CarrierImage {
  file: File;
  element: HTMLImageElement;
  previewUrl: string;
  customName: string;
}

interface SteganographyToolProps {
  initialSecret?: string;
  onExtract?: (secret: string) => void;
}

export function SteganographyTool({ initialSecret, onExtract: _onExtract }: SteganographyToolProps) {
  const { t } = useTranslation();
  const { features, triggerUpgrade } = useLicense();
  const [mode, setMode] = useState<'hide' | 'extract'>('hide');
  
  // Hide Mode State
  const [hideImages, setHideImages] = useState<CarrierImage[]>([]);
  const [secret, setSecret] = useState(initialSecret || '');
  
  // Sharding State
  const [isSharded, setIsSharded] = useState(false);
  const [shardTotal, setShardTotal] = useState(3);
  const [shardThreshold, setShardThreshold] = useState(2);
  const [useStrictFilename, setUseStrictFilename] = useState(false);
  const [shardFilenames, setShardFilenames] = useState<string[]>([]);

  // Extract Mode State
  const [extractImages, setExtractImages] = useState<CarrierImage[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const copyToClipboard = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = result;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (e) {
        setError(t('steganography.error.copyFailed'));
      }
      document.body.removeChild(textArea);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newCarrierImages: CarrierImage[] = [];
    let loadedCount = 0;
    
    // Pro Limit Check
    let filesToProcess = Array.from(files);
    if (filesToProcess.length > features.maxUploads) {
        triggerUpgrade();
        filesToProcess = filesToProcess.slice(0, features.maxUploads);
    }

    filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                newCarrierImages.push({
                    file,
                    element: img,
                    previewUrl: img.src,
                    customName: file.name
                });
                loadedCount++;
                
                if (loadedCount === filesToProcess.length) {
                    if (mode === 'hide') {
                        setHideImages(newCarrierImages);
                        // Auto-configure sharding if multiple images
                        if (newCarrierImages.length > 1) {
                            setIsSharded(true);
                            setShardTotal(newCarrierImages.length);
                            setShardThreshold(Math.ceil(newCarrierImages.length * 0.6));
                        }
                        
                        // Initialize Shard Filenames
                        const initialShards = newCarrierImages.length > 1 ? newCarrierImages.length : 3;
                        const names = [];
                        for(let i=0; i<initialShards; i++) {
                            const baseName = newCarrierImages[i % newCarrierImages.length].file.name.replace(/\.[^/.]+$/, "");
                            names.push(`${baseName}-share-${i+1}.png`);
                        }
                        setShardFilenames(names);

                    } else {
                        setExtractImages(newCarrierImages);
                    }
                    setResult(null);
                    setError(null);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const downloadImage = (canvas: HTMLCanvasElement, filename: string) => {
      canvas.toBlob(async (blob) => {
          if (!blob) return;

          // Mobile "Save to Photos" support via Web Share API
          if (navigator.share && navigator.canShare) {
              try {
                  const file = new File([blob], filename, { type: 'image/png' });
                  const shareData = { files: [file], title: filename };
                  if (navigator.canShare(shareData)) {
                      await navigator.share(shareData);
                      return;
                  }
              } catch (e) {
                  console.warn('Share API failed, falling back to download:', e);
              }
          }

          const dataUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          link.click();
          URL.revokeObjectURL(dataUrl);
      }, 'image/png');
  };

  const handleHideData = async () => {
    if (hideImages.length === 0 || !secret || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error(t('errors.canvasContext'));

      const generatedFiles: File[] = [];

      if (isSharded) {
          // Generate Shards
          const shares = await split(secret, shardTotal, shardThreshold);
          
          // Process each share
          for (let i = 0; i < shares.length; i++) {
              // Determine which image to use
              // If multiple images uploaded, map 1-to-1 (cycling if needed)
              // If 1 image uploaded, reuse it
              const carrier = hideImages[i % hideImages.length];
              
              // Determine Output Filename from State
              let outputFilename = shardFilenames[i] || `share-${i+1}.png`;
              
              // Ensure .png extension
              if (!outputFilename.toLowerCase().endsWith('.png')) {
                  outputFilename += '.png';
              }

              // Draw fresh image
              canvas.width = carrier.element.width;
              canvas.height = carrier.element.height;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(carrier.element, 0, 0);
              
              // Prepare Payload
              let payload = shares[i];
              if (useStrictFilename) {
                  // Append strict filename requirement
                  payload += `|${outputFilename}`;
              }

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const newImageData = embedData(imageData, payload);
              
              ctx.putImageData(newImageData, 0, 0);
              
              // Create Blob for this shard
              const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
              if (blob) {
                  generatedFiles.push(new File([blob], outputFilename, { type: 'image/png' }));
              }
          }
          
          // Batch Download / Share Logic
          if (generatedFiles.length > 0) {
               // Try Web Share API for multiple files (Mobile)
               let shared = false;
               if (navigator.share && navigator.canShare) {
                   try {
                       const shareData = {
                           files: generatedFiles,
                           title: 'CryptoKey Shards',
                           text: 'Here are your encrypted image shards.'
                       };
                       if (navigator.canShare(shareData)) {
                           await navigator.share(shareData);
                           shared = true;
                       }
                   } catch (e) {
                       console.warn('Batch share failed, falling back to individual download', e);
                   }
               }
               
               if (!shared) {
                   // Fallback: Individual Downloads with delay to prevent browser blocking
                   for (const file of generatedFiles) {
                       const url = URL.createObjectURL(file);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = file.name;
                       document.body.appendChild(a);
                       a.click();
                       document.body.removeChild(a);
                       URL.revokeObjectURL(url);
                       // 800ms delay between downloads
                       await new Promise(r => setTimeout(r, 800));
                   }
               }
          }
          
          setResult(t('steganographyExtra.successGenerated', {count: shares.length}));
      } else {
          // Standard Single Image
          const carrier = hideImages[0];
          canvas.width = carrier.element.width;
          canvas.height = carrier.element.height;
          
          ctx.drawImage(carrier.element, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const newImageData = embedData(imageData, secret);
          
          ctx.putImageData(newImageData, 0, 0);
          downloadImage(canvas, carrier.customName.endsWith('.png') ? carrier.customName : carrier.customName + '.png');
          
          setResult(t('steganography.status.successHide'));
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  const handleExtractData = async () => {
    if (!canvasRef.current) return;
    if (extractImages.length === 0) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(t('errors.canvasContext'));

      const extractedData: string[] = [];

      for (const img of extractImages) {
          canvas.width = img.element.width;
          canvas.height = img.element.height;
          ctx.drawImage(img.element, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let data = extractData(imageData);
          
          if (data) {
              // Check for Strict Filename Lock
              // Format: ...|FILENAME
              // We look for the last pipe that might separate the filename
              // However, the share data itself is hex and might be followed by pipe
              // Standard share format: ID-HEXDATA
              // Locked share format: ID-HEXDATA|FILENAME
              
              if (data.includes('|')) {
                  const parts = data.split('|');
                  // A valid share has "ID-HEXDATA". 
                  // If we have "ID-HEXDATA|FILENAME", parts[0] is ID-HEXDATA, parts[1] is FILENAME
                  // But wait, the HexData decodes to "Checksum|Secret".
                  // So the Raw LSB data is "ID-HEXDATA" (standard) or "ID-HEXDATA|FILENAME" (locked).
                  
                  // Let's check if the part BEFORE the last pipe is a valid share ID-HEX
                  const potentialShare = parts[0];
                  const potentialFilename = parts.slice(1).join('|'); // Handle filenames with pipes? Unlikely but safe
                  
                  if (/^\d+-[0-9a-fA-F]+$/.test(potentialShare) && potentialFilename) {
                      // It looks like a locked share
                      // Verify filename
                      if (img.file.name !== potentialFilename) {
                          console.warn(`Filename mismatch! Expected: ${potentialFilename}, Got: ${img.file.name}`);
                          // Skip this share or throw error?
                          // User requirement: "Need to collect these uploaded photos (and filename consistent) to decrypt"
                          // So we should reject it.
                          continue; // Skip this invalid share
                      }
                      data = potentialShare; // Use the clean share data
                  }
              }
              
              extractedData.push(data);
          }
      }
      
      if (extractedData.length === 0) {
          throw new Error(t('steganography.status.noData'));
      }

      // Try to Combine Shards
      const looksLikeShards = extractedData.every(d => /^\d+-[0-9a-fA-F]+$/.test(d));

      if (looksLikeShards && extractedData.length >= 2) {
          try {
              const combined = await combine(extractedData);
              setResult(combined);
              setError(null);
              return;
          } catch (combineError: any) {
              console.warn("Failed to combine shards, attempting fallback check...", combineError);
              
              // Fallback: Check if any individual share happens to be the full secret
              let foundValidShare = false;
              
              for (const share of extractedData) {
                  try {
                      const parts = share.split('-');
                      if (parts.length !== 2) continue;
                      
                      const hexData = parts[1];
                      const decoded = hexToStr(hexData);
                      
                      const separatorIndex = decoded.indexOf('|');
                      if (separatorIndex === 64) {
                          const checksum = decoded.substring(0, 64);
                          const secret = decoded.substring(65);
                          const calculatedChecksum = await sha256(secret);
                          
                          if (checksum === calculatedChecksum) {
                              setResult(secret);
                              setError(null);
                              foundValidShare = true;
                              break;
                          }
                      }
                  } catch (e) { }
              }
              
              if (foundValidShare) return;
              
              setError(t('steganography.status.reconstructFailed', { error: combineError.message }));
          }
      }

      // If not shards or combine failed, show joined data
      setResult(extractedData.join('\n\n---\n\n'));
      setError(null);

    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => { 
            setMode('hide'); 
            setResult(null); 
            setError(null);
            // Clear Extract mode state
            setExtractImages([]);
            // Clear Hide mode state
            setHideImages([]);
            setSecret('');
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            mode === 'hide' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <EyeOff size={20} />
          {t('steganography.mode.hide')}
        </button>
        <button
          onClick={() => { 
            setMode('extract'); 
            setResult(null); 
            setError(null);
            // Clear Hide mode state
            setHideImages([]);
            // Clear Extract mode state
            setExtractImages([]);
            setSecret('');
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            mode === 'extract' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Eye size={20} />
          {t('steganography.mode.extract')}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-slate-800/50 p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center gap-4 py-8">
              {mode === 'extract' && extractImages.length > 0 ? (
                  <div className="w-full">
                      <div className="flex justify-between items-center mb-2 px-1">
                          <p className="text-sm text-slate-400">{extractImages.length} {t('steganography.label.imagesLoaded')}</p>
                          <button 
                              onClick={(e) => {
                                  e.preventDefault();
                                  setExtractImages([]);
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                          >
                              {t('steganography.button.clearAll')}
                          </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 w-full max-h-64 overflow-y-auto p-1">
                        {extractImages.map((img, i) => (
                             <div key={i} className="relative group">
                                <img src={img.previewUrl} alt={`Share ${i+1}`} className="w-full h-20 object-cover rounded-lg border border-slate-600" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                    <span className="text-xs text-white truncate px-1">{img.file.name}</span>
                                </div>
                             </div>
                        ))}
                      </div>
                  </div>
              ) : mode === 'hide' && hideImages.length > 0 ? (
                <div className="w-full space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-400">{hideImages.length} {t('steganographyExtra.carrierImages')}</p>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setHideImages([]);
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                        >
                            {t('steganography.button.clearAll')}
                        </button>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                        {isSharded ? (
                             // Sharded Mode: Show N slots
                             Array.from({ length: shardTotal }).map((_, i) => {
                                 const img = hideImages[i % hideImages.length];
                                 if (!img) return null;
                                 
                                 return (
                                    <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex gap-3 items-start">
                                        <div className="relative">
                                            <img src={img.previewUrl} alt={`Shard ${i+1}`} className="w-16 h-16 object-cover rounded bg-slate-900" />
                                            <span className="absolute -top-2 -left-2 w-5 h-5 bg-indigo-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold border-2 border-slate-800">
                                                {i + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-500 mb-1">Source: {img.file.name}</p>
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-indigo-400" />
                                                <input
                                                    type="text"
                                                    value={shardFilenames[i] || ''}
                                                    onChange={(e) => {
                                                        const newNames = [...shardFilenames];
                                                        newNames[i] = e.target.value;
                                                        setShardFilenames(newNames);
                                                    }}
                                                    placeholder={t('steganography.placeholder.shardFilename', { index: i+1 })}
                                                    className={`bg-slate-900 border rounded px-2 py-1 text-xs text-slate-200 w-full focus:ring-1 outline-none ${
                                                        useStrictFilename
                                                            ? 'border-amber-500/50 focus:ring-amber-500'
                                                            : 'border-slate-600 focus:ring-indigo-500'
                                                    }`}
                                                />
                                            </div>
                                            {useStrictFilename && (
                                                <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                                                    <Lock size={10} />
                                                    {t('steganographyExtra.strictMatchRequired')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                 );
                             })
                        ) : (
                            // Normal Mode: Show uploaded images
                            hideImages.map((img, i) => (
                                <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex gap-3 items-start">
                                    <img src={img.previewUrl} alt={`Carrier ${i+1}`} className="w-16 h-16 object-cover rounded bg-slate-900" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 mb-1">{t('steganography.label.original', { name: img.file.name })}</p>
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-indigo-400" />
                                            <input
                                                type="text"
                                                value={img.customName}
                                                onChange={(e) => {
                                                    const newImages = [...hideImages];
                                                    newImages[i].customName = e.target.value;
                                                    setHideImages(newImages);
                                                }}
                                                placeholder={t('steganography.placeholder.outputFilename')}
                                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-indigo-400">
                    {mode === 'extract' ? <Layers size={32} /> : <ImageIcon size={32} />}
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-slate-200">
                        {mode === 'extract' ? t('steganography.label.uploadImages') : t('steganography.label.uploadImages')}
                    </p>
                    <p className="text-sm text-slate-400">
                        {mode === 'extract' 
                            ? <span>{t('steganography.label.uploadExtractHelp')} <span className="text-amber-500/80">{t('steganography.label.limitInfo')}</span></span> 
                            : <span>{t('steganography.label.uploadHideHelp')} <span className="text-amber-500/80">{t('steganography.label.limitInfo')}</span></span>}
                    </p>
                  </div>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {mode === 'hide' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between items-center">
                  <span>{t('steganography.label.secretMessage')}</span>
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setSecret(text);
                      } catch (err) {
                        console.error('Failed to read clipboard:', err);
                      }
                    }}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Clipboard size={12} />
                    {t('steganography.button.paste')}
                  </button>
                </label>
                <textarea
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder={t('steganography.placeholder.pasteCiphertext')}
                />
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                   <p className="text-xs text-red-300 flex items-start gap-2">
                     <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                     <span>
                       <strong className="text-red-200">{t('steganography.warning.title')}</strong> {t('steganography.warning.text')}
                     </span>
                   </p>
                </div>
                
                <div className="mt-4 border-t border-slate-700 pt-4">
                    <label className={`flex items-center gap-2 cursor-pointer select-none mb-4 ${!features.allowSharding ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input 
                            type="checkbox"
                            checked={isSharded}
                            onChange={(e) => features.allowSharding && setIsSharded(e.target.checked)}
                            disabled={!features.allowSharding}
                            className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                        />
                        <span className="text-sm text-slate-300">{t('steganography.label.enableSharding')}</span>
                        {!features.allowSharding && <span className="text-xs text-amber-500 cursor-pointer" onClick={(e) => { e.preventDefault(); triggerUpgrade(); }}>{t('steganography.label.proOnly')}</span>}
                    </label>

                    {isSharded && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                        >
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">{t('steganography.label.totalShares')}</label>
                                    <input 
                                        type="number" 
                                        min={2}
                                        max={10}
                                        value={shardTotal}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 2;
                                            setShardTotal(val);
                                            if (shardThreshold > val) setShardThreshold(val);
                                        }}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">{t('steganography.label.threshold')}</label>
                                    <input 
                                        type="number" 
                                        min={2}
                                        max={shardTotal}
                                        value={shardThreshold}
                                        onChange={(e) => setShardThreshold(parseInt(e.target.value) || 2)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                                    />
                                </div>
                             </div>

                             <label className={`flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-slate-700/50 ${!features.allowStrictMatching ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input 
                                    type="checkbox"
                                    checked={useStrictFilename}
                                    onChange={(e) => features.allowStrictMatching && setUseStrictFilename(e.target.checked)}
                                    disabled={!features.allowStrictMatching}
                                    className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm text-slate-300 flex items-center gap-1">
                                        <Lock size={12} className="text-amber-400"/>
                                        {t('steganography.label.strictMatching')}
                                        <ProBadge />
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {t('steganography.label.strictMatchingHelp')}
                                    </span>
                                </div>
                            </label>
                        </motion.div>
                    )}
                </div>
              </div>
              <button
                onClick={handleHideData}
                disabled={hideImages.length === 0 || !secret}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSharded ? <Share2 size={20} /> : <Download size={20} />}
                {isSharded ? t('steganography.button.generateShards') : t('steganography.button.hideData')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl p-6 min-h-[200px] flex flex-col relative">
                 <label className="block text-sm font-medium text-slate-400 mb-4 flex justify-between items-center">
                    <span>{t('steganography.label.extractedContent')}</span>
                    <button 
                      onClick={copyToClipboard}
                      disabled={!result}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        copyFeedback
                          ? 'text-green-400'
                          : !result
                             ? 'text-slate-600 cursor-not-allowed'
                             : 'text-indigo-400 hover:text-indigo-300'
                      }`}
                    >
                      {copyFeedback ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {copyFeedback ? t('steganography.button.copied') : t('steganography.button.copy')}
                    </button>
                 </label>
                 {result && mode === 'extract' ? (
                   <textarea
                     readOnly
                     value={result}
                     className="flex-1 p-4 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm text-green-400 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                   />
                 ) : (
                   <div className="flex-1 flex items-center justify-center text-slate-600 italic">
                     {t('steganography.status.waitingImage')}
                   </div>
                 )}
              </div>
              <button
                onClick={handleExtractData}
                disabled={extractImages.length === 0}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Eye size={20} />
                {t('steganography.button.extractHidden')}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3"
          >
            <AlertTriangle size={20} />
            {error}
          </motion.div>
        )}
        {result && mode === 'hide' && (
           <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-3"
          >
            <CheckCircle2 size={20} />
            {result}
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
      
      <div className="mt-8 p-4 bg-slate-800/50 rounded-xl text-sm text-slate-400 border border-slate-700/50">
        <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
          <ImageIcon size={16} />
          {t('steganography.about.title')}
        </h4>
        <p>
          {t('steganography.about.text')}
          <br/><br/>
          <span className="text-yellow-400">{t('steganography.about.noteTitle')}</span> {t('steganography.about.noteText')}
        </p>
      </div>
    </div>
  );
}
