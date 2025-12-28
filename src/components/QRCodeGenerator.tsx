import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from './ui/Button';
import { QrCode, Trash2, ArrowLeft, ArrowRight, Loader2, ShieldCheck, Download, Play, Pause, Zap } from 'lucide-react';
import { compressData, createChunks } from '../utils/compression';
import ShardDualAuthGenerator from './ShardDualAuthGenerator';
import { useLicense } from '../contexts/LicenseContext';
import { ProBadge } from './ui/ProBadge';

interface QRCodeGeneratorProps {
  ciphertext: string;
  hash: string;
  mnemonic?: string;
  password?: string;
  lineNumber?: number;
}

// User requested ~4k per chunk. 
// Version 40 QR Code (L) holds ~2953 bytes (binary) or ~4296 alphanumeric.
// Base64URL contains '-', which is alphanumeric, but also '_', which is NOT.
// So the QR library will likely default to Byte mode (Binary).
// Max capacity for Byte mode (L) is ~2953 bytes.
// We set safe limit to 2500 to account for metadata overhead and safety margin.
const CHUNK_SIZE = 2500; 

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ ciphertext, hash, mnemonic, password, lineNumber }) => {
  const { features, triggerUpgrade } = useLicense();
  const [qrcodeUrls, setQrcodeUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useDualAuth, setUseDualAuth] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamIntervalMs, setStreamIntervalMs] = useState(300); // Default 300ms (approx 3.3 fps)
  const qrcodeRef = useRef<HTMLImageElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isStreaming && qrcodeUrls.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % qrcodeUrls.length);
      }, streamIntervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
       if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, qrcodeUrls.length, streamIntervalMs]);

  if (useDualAuth && mnemonic) {
    return (
      <ShardDualAuthGenerator 
        mnemonic={mnemonic} 
        password={password} 
        lineNumber={lineNumber}
        ciphertext={ciphertext}
        hash={hash}
        onBack={() => setUseDualAuth(false)} 
      />
    );
  }

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      // 1. Prepare Data (JSON stringify -> LZMA Compress -> Base64URL)
      const rawData = JSON.stringify({ c: ciphertext, h: hash });
      // Compress
      const compressedData = await compressData(rawData);
      
      // 2. Chunk Data (with metadata: v1|total|index|hash|data)
      const chunks = createChunks(compressedData, CHUNK_SIZE);

      console.log(`Compressed size: ${compressedData.length}, Chunks: ${chunks.length}`);

      // 3. Generate QRs
      const urls = await Promise.all(chunks.map(chunk => 
        QRCode.toDataURL(chunk, {
          width: 1080, // High res for dense data (Version 40 requires ~1000px for good readability)
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'L' // Low ECC for max capacity
        })
      ));
      
      setQrcodeUrls(urls);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      // alert('Failed to generate QR code. Data might be too large or compression failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearQRCode = () => {
    setQrcodeUrls([]);
    setCurrentIndex(0);
    setIsStreaming(false);
  };

  const nextChunk = () => {
    setIsStreaming(false);
    if (currentIndex < qrcodeUrls.length - 1) setCurrentIndex(p => p + 1);
  };

  const prevChunk = () => {
    setIsStreaming(false);
    if (currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  const toggleStream = () => {
    setIsStreaming(!isStreaming);
  };

  // Robust download function for mobile compatibility
  const downloadImage = (url: string, filename: string) => {
    // For Data URLs, converting to Blob often helps with mobile download behavior
    fetch(url)
      .then(res => res.blob())
      .then(async (blob) => {
        // Mobile "Save to Photos" support via Web Share API
        if (navigator.share && navigator.canShare) {
            try {
                const file = new File([blob], filename, { type: blob.type });
                const shareData = { files: [file], title: filename };
                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    return; // Success, skip fallback
                }
            } catch (e) {
                console.warn('Share API failed, falling back to download:', e);
            }
        }

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(err => {
        console.error('Download failed:', err);
        // Fallback
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  const handleDownloadAll = async () => {
     if (qrcodeUrls.length === 1) {
        downloadImage(qrcodeUrls[0], `cryptokey_backup_${Date.now()}.png`);
     } else {
        // Download all sequentially
        for (let i = 0; i < qrcodeUrls.length; i++) {
           downloadImage(qrcodeUrls[i], `cryptokey_backup_shard_${i+1}_of_${qrcodeUrls.length}.png`);
           await new Promise(r => setTimeout(r, 500)); // Delay to prevent browser throttling
        }
     }
  };

  if (qrcodeUrls.length > 0) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-white p-4 rounded-xl shadow-2xl mx-auto max-w-[320px] aspect-square flex items-center justify-center relative group">
          <img 
            ref={qrcodeRef}
            src={qrcodeUrls[currentIndex]} 
            alt={`QR Code ${currentIndex + 1}`} 
            className="w-full h-full object-contain"
          />
          {isStreaming && (
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-xl pointer-events-none animate-pulse" />
          )}
        </div>

        <div className="flex flex-col gap-3">
           {qrcodeUrls.length > 1 && (
             <div className={`bg-slate-800 p-3 rounded-lg border border-slate-700 ${!features.allowStreamScan ? 'opacity-80' : ''}`}>
               <div className="flex items-center justify-between mb-2">
                 <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                   <Zap size={12} className="text-yellow-400" />
                   Air-Gap Stream Mode
                   <ProBadge />
                 </span>
                 {features.allowStreamScan && (
                    <span className="text-xs font-mono text-slate-500">
                      {Math.round(1000 / streamIntervalMs)} FPS
                    </span>
                 )}
               </div>
               
               {!features.allowStreamScan ? (
                  <div className="text-center py-4 bg-slate-900/50 rounded-lg border border-dashed border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">High-speed QR streaming is a Pro feature.</p>
                      <Button size="sm" variant="outline" onClick={triggerUpgrade} className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
                            Unlock Stream Mode
                        </Button>
                  </div>
               ) : (
                   <>
                   <div className="flex items-center gap-3">
                     <Button 
                       onClick={toggleStream} 
                       size="sm"
                       className={`flex-1 ${isStreaming ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                     >
                       {isStreaming ? (
                         <>
                           <Pause size={16} className="mr-2" /> Pause Stream
                         </>
                       ) : (
                         <>
                           <Play size={16} className="mr-2" /> Play Stream
                         </>
                       )}
                     </Button>
                     
                     {/* Speed Control */}
                     <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
                        <button 
                          onClick={() => setStreamIntervalMs(500)}
                          className={`px-2 py-1 text-xs rounded ${streamIntervalMs === 500 ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          title="Slow (2 FPS)"
                        >
                          1x
                        </button>
                        <button 
                          onClick={() => setStreamIntervalMs(250)}
                          className={`px-2 py-1 text-xs rounded ${streamIntervalMs === 250 ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          title="Fast (4 FPS)"
                        >
                          2x
                        </button>
                        <button 
                          onClick={() => setStreamIntervalMs(100)}
                          className={`px-2 py-1 text-xs rounded ${streamIntervalMs === 100 ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          title="Turbo (10 FPS)"
                        >
                          MAX
                        </button>
                     </div>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-2 text-center">
                     Use a compatible QR scanner app (e.g. Cobo Vault, Keystone) to capture the stream.
                   </p>
                   </>
               )}
             </div>
           )}

           {/* Manual Controls */}
           <div className="flex justify-between items-center bg-slate-800 p-2 rounded-lg">
              <Button 
                onClick={prevChunk} 
                variant="ghost" 
                size="sm" 
                disabled={currentIndex === 0 || isStreaming}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </Button>
              <span className="text-sm font-mono text-slate-400">
                Shard {currentIndex + 1} of {qrcodeUrls.length}
              </span>
              <Button 
                onClick={nextChunk} 
                variant="ghost" 
                size="sm" 
                disabled={currentIndex === qrcodeUrls.length - 1 || isStreaming}
                className="text-slate-400 hover:text-white"
              >
                <ArrowRight size={20} />
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleDownloadAll} variant="secondary" className="w-full">
            <Download className="mr-2" size={16} />
            {qrcodeUrls.length > 1 ? 'Save All Images' : 'Save Image'}
          </Button>
          <Button onClick={clearQRCode} variant="ghost" className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <Trash2 className="mr-2" size={16} />
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mnemonic && (
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-4">
           <div className="flex items-start gap-3">
             <ShieldCheck className="text-indigo-400 shrink-0 mt-1" />
             <div>
               <h4 className="font-bold text-white mb-1">Dual Authenticator Mode (Recommended)</h4>
               <p className="text-xs text-slate-400 mb-3">
                 Split encryption into two separate QR keys (Key A + Key B). 
                 Even if one key is stolen, your data remains safe.
               </p>
               <Button 
                 onClick={() => setUseDualAuth(true)} 
                 size="sm" 
                 className="bg-indigo-600 hover:bg-indigo-500 text-white border-none w-full sm:w-auto"
               >
                 Switch to Dual Auth Encryption
               </Button>
             </div>
           </div>
        </div>
      )}

      <Button 
        onClick={generateQRCode} 
        disabled={isGenerating} 
        className="w-full h-12 text-lg font-bold bg-white text-slate-900 hover:bg-slate-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <QrCode className="mr-2" size={20} />
            Generate Standard QR Code
          </>
        )}
      </Button>
      <p className="text-xs text-center text-slate-500">
        Standard Mode: Generates AES-256 encrypted QR shards.
      </p>
    </div>
  );
};
