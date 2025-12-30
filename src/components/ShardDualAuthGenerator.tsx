import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { generateSecret, generateTotpUri } from '../utils/dualAuth';
import { compressData, createChunks } from '../utils/compression';
import CryptoJS from 'crypto-js';
import { Loader2, Download, Smartphone, ShieldCheck, Lock, Play, Pause, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from 'react-i18next';

interface Props {
  mnemonic: string;
  password?: string;
  lineNumber?: number;
  ciphertext?: string;
  hash?: string;
  onBack: () => void;
}

const ShardDualAuthGenerator: React.FC<Props> = ({ mnemonic, password = '', lineNumber = 0, ciphertext, hash, onBack }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [secretA, setSecretA] = useState('');
  const [secretB, setSecretB] = useState('');
  const [authQrA, setAuthQrA] = useState('');
  const [authQrB, setAuthQrB] = useState('');
  const [shardQrcodes, setShardQrcodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Streaming State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamIntervalMs, setStreamIntervalMs] = useState(300);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect for streaming
  useEffect(() => {
    if (isStreaming && shardQrcodes.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % shardQrcodes.length);
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
  }, [isStreaming, shardQrcodes.length, streamIntervalMs]);

  // Step 1: Generate Secrets and Binding QRs
  const generateAuthSecrets = async () => {
    const sA = generateSecret();
    const sB = generateSecret();
    setSecretA(sA);
    setSecretB(sB);

    const uriA = generateTotpUri(sA, t('shardDualAuth.prefix.ciphertext'), 'CryptoKey');
    const uriB = generateTotpUri(sB, t('shardDualAuth.prefix.passwordLine'), 'CryptoKey');

    const qrA = await QRCode.toDataURL(uriA);
    const qrB = await QRCode.toDataURL(uriB);

    setAuthQrA(qrA);
    setAuthQrB(qrB);
  };

  // Step 2: Encrypt, Compress, Shard
  const generateShardCodes = async () => {
    setLoading(true);
    try {
      if (!secretA || !secretB) throw new Error(t('errors.bindAuthFirst'));

      // 1. Encrypt Password+Line with Secret B
      const pwdLineData = JSON.stringify({ password, lineNumber });
      const encryptedPwdLine = CryptoJS.AES.encrypt(pwdLineData, secretB).toString();

      // 2. Encrypt Mnemonic with Secret A (Legacy / Fallback)
      // We keep this for now, but the primary payload will be the 'ciphertext' if available.
      const encryptedMnemonic = CryptoJS.AES.encrypt(mnemonic, secretA).toString();

      let coreData;

      // 3. Prepare Payload
      // If we have the full 'ciphertext' (Standard Mode Payload with Mixed Rows), we encrypt THAT with Secret A.
      // This ensures we preserve the Obfuscation (Fake Rows) and Large Payload Size (8+ Shards).
      if (ciphertext) {
          const encryptedCiphertext = CryptoJS.AES.encrypt(ciphertext, secretA).toString();
          coreData = JSON.stringify({
              ec: encryptedCiphertext, // Encrypted Ciphertext (Huge)
              epl: encryptedPwdLine,   // Encrypted Password + Line (Context)
              h: hash
          });
      } else {
          // Fallback for cases where ciphertext isn't provided (shouldn't happen in current flow)
          coreData = JSON.stringify({
              em: encryptedMnemonic,
              epl: encryptedPwdLine,
              h: hash
          });
      }

      // 4. Compress
      const compressedData = await compressData(coreData);

      // 5. Shard
      const chunks = createChunks(compressedData, 2500); // 2.5k per shard for safety (Byte Mode limit ~2953)

      // 6. Generate QR Codes
      const urls = await Promise.all(chunks.map(chunk => 
        QRCode.toDataURL(chunk, {
          width: 1080, // High res for dense data
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'L'
        })
      ));

      setShardQrcodes(urls);
      setStep(2);

      // 7. Local Storage Backup (Optional, but recommended in doc)
      // We ask for a backup password to protect these secrets in local storage
      // To avoid blocking UI with prompts, we'll skip the prompt for now and 
      // rely on the user SAVING THE BINDING QRs as the backup.
      // The text said "User saves all QR codes". 
      // If we save to LocalStorage, we need a password.
      // For UX simplicity in this component, we will emphasize SAVING THE IMAGES.

    } catch (e) {
      console.error(e);
      alert(t('shardDualAuth.error.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        
        if (navigator.share && navigator.canShare) {
            try {
                const file = new File([blob], filename, { type: blob.type });
                const shareData = { files: [file], title: filename };
                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    return;
                }
            } catch (e) {
                console.warn('Share API failed:', e);
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
    } catch (e) {
        console.error('Download failed', e);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  };

  const downloadAll = async () => {
    // Download Auth QRs
    if (authQrA) {
        await downloadImage(authQrA, 'Authenticator_A_Key.png');
        await new Promise(r => setTimeout(r, 1000));
    }
    if (authQrB) {
        await downloadImage(authQrB, 'Authenticator_B_Key.png');
        await new Promise(r => setTimeout(r, 1000));
    }
    // Download Shards
    for (let i = 0; i < shardQrcodes.length; i++) {
        await downloadImage(shardQrcodes[i], `Shard_${i + 1}_of_${shardQrcodes.length}.png`);
        await new Promise(r => setTimeout(r, 1000));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          {t('dualAuthGenerator.title')}
        </h2>
        <Button variant="outline" onClick={onBack} size="sm">{t('common.back')}</Button>
      </div>

      {/* Use hidden class instead of conditional rendering to prevent DOM crashes from extensions */}
      <div className={step === 1 ? 'space-y-6' : 'hidden'}>
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          <p className="font-semibold">{t('dualAuthGenerator.howItWorks.title')}</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>{t('dualAuthGenerator.howItWorks.step1')}</li>
            <li>{t('dualAuthGenerator.howItWorks.step2')}</li>
            <li dangerouslySetInnerHTML={{ __html: t('dualAuthGenerator.howItWorks.step3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('dualAuthGenerator.howItWorks.step4') }} />
            <li>{t('dualAuthGenerator.howItWorks.step5')}</li>
            <li>{t('dualAuthGenerator.howItWorks.step6')}</li>
          </ul>
        </div>

        {!authQrA ? (
          <div className="text-center py-8">
            <Button onClick={generateAuthSecrets} className="w-full max-w-sm">
              <Lock className="w-4 h-4 mr-2" />
              {t('dualAuthGenerator.generateKeys')}
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border p-4 rounded-lg text-center space-y-3 bg-gray-50">
              <h3 className="font-bold text-sm text-indigo-700">{t('dualAuthGenerator.authA')}</h3>
              <div className="bg-white p-2 inline-block rounded shadow-sm">
                <img src={authQrA} alt="Auth A" className="w-48 h-48" />
              </div>
              <p className="text-xs text-gray-500">{t('dualAuthGenerator.scanAuth')}</p>
              <Button variant="outline" size="sm" onClick={() => downloadImage(authQrA, 'Authenticator_A_Key.png')}>
                <Download className="w-3 h-3 mr-1" /> {t('dualAuthGenerator.saveImage')}
              </Button>
            </div>

            <div className="border p-4 rounded-lg text-center space-y-3 bg-gray-50">
              <h3 className="font-bold text-sm text-purple-700">{t('dualAuthGenerator.authB')}</h3>
              <div className="bg-white p-2 inline-block rounded shadow-sm">
                <img src={authQrB} alt="Auth B" className="w-48 h-48" />
              </div>
              <p className="text-xs text-gray-500">{t('dualAuthGenerator.scanAuth')}</p>
              <Button variant="outline" size="sm" onClick={() => downloadImage(authQrB, 'Authenticator_B_Key.png')}>
                <Download className="w-3 h-3 mr-1" /> {t('dualAuthGenerator.saveImage')}
              </Button>
            </div>
          </div>
        )}

        {authQrA && (
          <div className="pt-4 border-t">
            <Button
              onClick={generateShardCodes}
              className="w-full"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
              {loading ? t('common.processing') : t('dualAuthGenerator.encryptAndGenerate')}
            </Button>
          </div>
        )}
      </div>

      <div className={step === 2 ? 'space-y-6' : 'hidden'}>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-bold text-green-800 mb-2">{t('dualAuthGenerator.encryptionComplete')}</h3>
          <p className="text-green-700 text-sm">
            {t('dualAuthGenerator.resultDesc', { count: shardQrcodes.length })}
          </p>
          <p className="text-red-600 font-bold mt-2 text-sm uppercase">
            {t('dualAuthGenerator.importantWarning')}
          </p>
        </div>

        {/* Streaming UI */}
        {shardQrcodes.length > 0 && (
          <div className="space-y-4 max-w-sm mx-auto">
             <div className="bg-white p-4 rounded-xl shadow-2xl aspect-square flex items-center justify-center relative group border border-slate-200">
               <img 
                 src={shardQrcodes[currentIndex]} 
                 alt={`Shard ${currentIndex + 1}`} 
                 className="w-full h-full object-contain"
               />
               {isStreaming && (
                 <div className="absolute inset-0 border-4 border-indigo-500 rounded-xl pointer-events-none animate-pulse" />
               )}
             </div>

             {shardQrcodes.length > 1 && (
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1">
                     <Zap size={12} className="text-yellow-500 fill-yellow-500" />
                     {t('qrGenerator.streamMode')}
                   </span>
                   <span className="text-xs font-mono text-slate-500">
                     {Math.round(1000 / streamIntervalMs)} FPS
                   </span>
                 </div>

                 <div className="flex items-center gap-3">
                   <Button
                     onClick={() => setIsStreaming(!isStreaming)}
                     size="sm"
                     className={`flex-1 ${isStreaming ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-500'} text-white`}
                   >
                     {isStreaming ? (
                       <>
                         <Pause size={16} className="mr-2" /> {t('qrGenerator.pauseStream')}
                       </>
                     ) : (
                       <>
                         <Play size={16} className="mr-2" /> {t('qrGenerator.playStream')}
                       </>
                     )}
                   </Button>
                   
                   {/* Speed Control */}
                   <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
                      <button 
                        onClick={() => setStreamIntervalMs(500)}
                        className={`px-2 py-1 text-xs rounded ${streamIntervalMs === 500 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        1x
                      </button>
                      <button 
                        onClick={() => setStreamIntervalMs(250)}
                        className={`px-2 py-1 text-xs rounded ${streamIntervalMs === 250 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        2x
                      </button>
                      <button 
                        onClick={() => setStreamIntervalMs(100)}
                        className={`px-2 py-1 text-xs rounded ${streamIntervalMs === 100 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        MAX
                      </button>
                   </div>
                 </div>
               </div>
             )}

             {/* Manual Navigation */}
             <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <Button
                  onClick={() => { setIsStreaming(false); if(currentIndex > 0) setCurrentIndex(c => c - 1); }}
                  variant="ghost"
                  size="sm"
                  disabled={currentIndex === 0 || isStreaming}
                  className="text-slate-500 hover:bg-slate-200"
                >
                  <ArrowLeft size={20} />
                </Button>
                
                <div className="flex flex-col items-center">
                    <span className="text-sm font-mono text-slate-500 font-bold">
                      {t('qrGenerator.shardCount', { current: currentIndex + 1, total: shardQrcodes.length })}
                    </span>
                    <button 
                        onClick={() => downloadImage(shardQrcodes[currentIndex], `Shard_${currentIndex + 1}_of_${shardQrcodes.length}.png`)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline mt-1 font-medium"
                    >
                        {t('qrGenerator.saveImage')}
                    </button>
                </div>

                <Button
                  onClick={() => { setIsStreaming(false); if(currentIndex < shardQrcodes.length - 1) setCurrentIndex(c => c + 1); }}
                  variant="ghost"
                  size="sm"
                  disabled={currentIndex === shardQrcodes.length - 1 || isStreaming}
                  className="text-slate-500 hover:bg-slate-200"
                >
                  <ArrowRight size={20} />
                </Button>
             </div>
          </div>
        )}

          <div className="flex justify-center pt-4 border-t">
            <Button onClick={downloadAll} className="bg-green-600 hover:bg-green-700 w-full max-w-sm">
              <Download className="w-4 h-4 mr-2" />
              {t('dualAuthGenerator.downloadAll')}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 opacity-50 hover:opacity-100 transition-opacity">
            {shardQrcodes.map((url, i) => (
              <div key={i}
                   className={`border p-2 rounded text-center bg-gray-50 cursor-pointer ${currentIndex === i ? 'ring-2 ring-indigo-500' : ''}`}
                   onClick={() => { setIsStreaming(false); setCurrentIndex(i); }}
              >
                <p className="text-xs font-mono mb-1 text-gray-700 font-bold">{t('dualAuthGenerator.shardLabel', { index: i + 1 })}</p>
                <img src={url} alt={`Shard ${i+1}`} className="w-full bg-white rounded" />
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};

export default ShardDualAuthGenerator;
