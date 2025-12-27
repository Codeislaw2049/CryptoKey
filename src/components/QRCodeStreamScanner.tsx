import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { parseChunk } from '../utils/compression';

interface QRCodeStreamScannerProps {
  onScanComplete: (chunks: Map<number, string>, hash?: string) => void;
  onClose: () => void;
  mode?: 'fullscreen' | 'embedded';
}

export const QRCodeStreamScanner: React.FC<QRCodeStreamScannerProps> = ({ onScanComplete, onClose, mode = 'fullscreen' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [hasCamera, setHasCamera] = useState(false);
  
  // Scanning State
  const [chunks, setChunks] = useState<Map<number, string>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [globalHash, setGlobalHash] = useState<string>('');

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready
          videoRef.current.setAttribute('playsinline', 'true'); // required for iOS
          videoRef.current.play();
          setHasCamera(true);
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError('Camera access denied or not available. Please ensure you are using HTTPS or localhost.');
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Attempt Scan
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
              handleScan(code.data);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleScan = (data: string) => {
    // 1. Parse Chunk
    const chunk = parseChunk(data);
    
    if (chunk) {
      // It's a structured chunk
      
      // Hash Check
      setGlobalHash(prev => {
        if (prev && prev !== chunk.hash) {
           // Mismatch! Warning?
           // For now, we ignore chunks from other sets to avoid corruption
           return prev; 
        }
        return chunk.hash;
      });
      
      // If we have a hash set, and this chunk doesn't match, ignore it
      // (This logic is slightly tricky inside the setter, so we do it cleanly here)
      // We need to access the CURRENT globalHash. The state update might be async.
      // So we rely on functional update for consistency or a ref. 
      // For simplicity, we'll check the state value (might be 1 frame old but ok)
      
      // Better: check against the state setter
      setChunks(prev => {
        // If this is a new chunk
        if (!prev.has(chunk.index)) {
           // Verify Hash (if we already have chunks)
           if (prev.size > 0 && globalHash && globalHash !== chunk.hash) {
             return prev; // Ignore mismatch
           }
           
           // Valid new chunk
           const next = new Map(prev);
           next.set(chunk.index, chunk.data);
           
           // Side effects
           setTotalChunks(chunk.total);
           
           // Vibrate
           if (navigator.vibrate) navigator.vibrate(50);
           
           // Check completion
           if (next.size === chunk.total) {
              // Defer completion to next tick to allow UI to update
              setTimeout(() => onScanComplete(next), 500);
           }
           
           return next;
        }
        return prev;
      });
      
    } else {
      // It's a raw string (Legacy or Single Chunk)
      // If we are expecting chunks (already scanned some), we ignore raw strings
      // If we haven't scanned anything yet, we treat this as a single result
      
      // We use a functional update to check current state safely
      setChunks(prev => {
         if (prev.size > 0) return prev; // Already in chunk mode, ignore raw
         
         // It's a single raw QR
         const singleMap = new Map();
         singleMap.set(1, data);
         
         setTotalChunks(1);
         if (navigator.vibrate) navigator.vibrate(50);
         setTimeout(() => onScanComplete(singleMap), 500);
         
         return singleMap;
      });
    }
  };

  const containerClasses = mode === 'fullscreen' 
    ? "fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
    : "relative w-full h-full min-h-[300px] bg-black flex flex-col items-center justify-center overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10">
        <div className="text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Stream Scanner
          </h3>
          <p className="text-xs text-slate-300">Point at the animated QR code</p>
        </div>
        <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/20">
          <X size={24} />
        </Button>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {!hasCamera && !error && (
          <div className="text-white flex flex-col items-center gap-4">
             <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
             <p>Accessing Camera...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-400 max-w-xs text-center p-4 bg-red-900/20 rounded-xl border border-red-500/30">
             <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
             <p>{error}</p>
             <Button onClick={onClose} className="mt-4 bg-slate-800 text-white">Close</Button>
          </div>
        )}

        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-64 h-64 border-2 border-indigo-500/50 rounded-xl relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1" />
              
              {/* Scan Line Animation */}
              {hasCamera && (
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
              )}
           </div>
        </div>
      </div>

      {/* Footer / Status */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-10">
        {chunks.size > 0 ? (
          <div className="space-y-3">
             <div className="flex justify-between items-end text-white mb-1">
               <span className="font-bold text-lg flex items-center gap-2">
                 <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                 Scanning...
               </span>
               <span className="font-mono text-xl text-indigo-400">
                 {chunks.size} / {totalChunks || '?'}
               </span>
             </div>
             
             {/* Progress Bar */}
             <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-indigo-500 transition-all duration-300"
                 style={{ width: `${(chunks.size / (totalChunks || 1)) * 100}%` }}
               />
             </div>
             
             {/* Grid Visualization */}
             {totalChunks > 0 && (
               <div className="flex gap-1 flex-wrap justify-center mt-2">
                 {Array.from({ length: totalChunks }).map((_, i) => {
                   const isFound = chunks.has(i + 1); // Index is 1-based
                   return (
                     <div 
                       key={i} 
                       className={`w-3 h-3 rounded-sm transition-all ${
                         isFound 
                           ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' 
                           : 'bg-slate-800 border border-slate-700'
                       }`}
                     />
                   );
                 })}
               </div>
             )}
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p className="mb-2">Waiting for data stream...</p>
            <div className="flex justify-center gap-2">
               <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-0" />
               <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-150" />
               <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
