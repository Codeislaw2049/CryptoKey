import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { decryptWithSecret, verifyToken } from '../utils/dualAuth';
import { Upload, CheckCircle, AlertTriangle, ScanLine, Smartphone, Loader2, Camera, Copy } from 'lucide-react';
import { QRCodeStreamScanner } from './QRCodeStreamScanner';
import { readQrFromFile } from '../utils/qrReader';
import { parseChunk, decompressData, verifyIntegrity } from '../utils/compression';
import { decryptWithAES } from '../utils/crypto';
import { decodeBookCipherToIndex, indicesToMnemonic, isBookCipherIndices } from '../utils/mnemonic';

interface ShardDualAuthDecryptorProps {
  initialShards?: Map<number, string>;
}

const ShardDualAuthDecryptor: React.FC<ShardDualAuthDecryptorProps> = ({ initialShards }) => {
  // State for Shards
  const [shards, setShards] = useState<Map<number, string>>(initialShards || new Map());
  const [totalShards, setTotalShards] = useState<number>(initialShards ? initialShards.size : 0);
  const [globalHash, setGlobalHash] = useState<string>('');
  const [mergedData, setMergedData] = useState<string | null>(null);
  
  // State for Keys (Secrets)
  const [secretA, setSecretA] = useState<string>('');
  const [secretB, setSecretB] = useState<string>('');
  
  // State for Auth Codes
  const [codeA, setCodeA] = useState('');
  const [codeB, setCodeB] = useState('');
  
  // State for Result
  const [decryptedResult, setDecryptedResult] = useState<{mnemonic: string, password: string, lineNumber: number, ciphertext?: string, hash?: string, fullRows?: string[][]} | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [error, setError] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [missingIndices, setMissingIndices] = useState<number[]>([]);
  const [showScanner, setShowScanner] = useState(false);

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

  const handleStreamScanComplete = (chunks: Map<number, string>, hash?: string) => {
    setShowScanner(false);
    setError('');
    
    // Replace shards with scanned chunks
    setShards(chunks);
    setTotalShards(chunks.size); 
    if (hash) setGlobalHash(hash);
    
    setProcessingStatus('Stream Scan Complete');
    setTimeout(() => setProcessingStatus(''), 2000);
  };

  // Handler: Upload Shards
  const handleShardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setProcessingStatus('Starting processing...');
    
    // Helper delay to allow UI to update
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    let newShardsCount = 0;
    const currentFailedFiles: string[] = [];
    let currentBatchHash = globalHash;

    try {
      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Processing image ${i + 1} of ${files.length}...`);
        await delay(50); // Yield to main thread

        const text = await readQrFromFile(files[i]);
        if (!text) {
          console.warn(`File ${files[i].name} is not a valid QR code`);
          currentFailedFiles.push(`${files[i].name} (No QR found)`);
          continue; 
        }

        const shard = parseChunk(text);
        if (!shard) {
           currentFailedFiles.push(`${files[i].name} (Invalid format)`);
           continue;
        }

        // Strict Hash Validation
        if (currentBatchHash && currentBatchHash !== shard.hash) {
           throw new Error(`Shard Integrity Error: File ${files[i].name} belongs to a different set (Hash: ${shard.hash.substring(0,6)}...) than previous shards (Hash: ${currentBatchHash.substring(0,6)}...). Please do not mix shards.`);
        }
        if (!currentBatchHash) currentBatchHash = shard.hash;

        // Update State
        setShards(prev => {
          const next = new Map(prev);
          next.set(shard.index, shard.data);
          
          // Side effect: update totals if not set
          if (totalShards === 0) setTotalShards(shard.total);
          if (!globalHash) setGlobalHash(shard.hash);
          
          return next;
        });
        
        newShardsCount++;
      }

      setProcessingStatus('Finalizing...');
      await delay(50);

      setFailedFiles(prev => [...prev, ...currentFailedFiles]);

      // Trigger merge check
      setShards(prev => {
        // We do this check inside the setter to ensure we have the latest state
        // But 'totalShards' is outside state. 
        // We can infer total from the first element in the map if we want, 
        // but let's rely on the user uploading enough.
        
        // Determine total from the map itself? No, we need metadata.
        // We'll trust the 'totalShards' state will be updated by the loop effects (which queue updates).
        // Actually, React state updates are batched. 
        // So 'totalShards' might still be 0 in this closure.
        
        // Let's rely on the Effect hook or a separate check.
        // But for now, let's just finish the upload.
        return prev;
      });
      
      // We manually trigger a check after a short delay to allow state to settle
      setTimeout(() => {
        setShards(currentShards => {
           // We can check if we have enough shards here
           // But 'totalShards' variable is still stale closure.
           // We need to access the LATEST totalShards.
           // The clean way is to use a useEffect to watch 'shards' and 'totalShards'.
           return currentShards;
        });
      }, 500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingStatus('');
      e.target.value = ''; // Reset input
    }
  };

  // Effect to attempt merge when shards change
  React.useEffect(() => {
    if (totalShards > 0) {
        // Calculate missing
        const foundIndices = new Set(shards.keys());
        const missing: number[] = [];
        // Indices are 1-based (1 to total)
        for (let i = 1; i <= totalShards; i++) {
            if (!foundIndices.has(i)) missing.push(i);
        }
        setMissingIndices(missing);

        // Auto-merge if we have enough shards (ignoring missing indices check to be robust against index anomalies)
        if (shards.size === totalShards && globalHash) {
            console.log('Attempting merge with shards:', Array.from(shards.keys()));
            
            // Merge
            const sorted = Array.from(shards.entries())
            .sort((a, b) => a[0] - b[0])
            .map(entry => entry[1])
            .join('');
            
            // Integrity Check
            if (!verifyIntegrity(sorted, globalHash)) {
                setError('Integrity Check Failed: The reassembled data is corrupted. Please rescan.');
                return;
            }
            
            // Decompress
            decompressData(sorted).then((jsonStr: string) => {
                setMergedData(jsonStr);
                setError(''); 
            }).catch((err: any) => {
                // If decompression fails, it might be due to wrong order/missing parts
                if (missing.length > 0) {
                     setError(`Decompression failed. You might be missing specific parts: ${missing.join(', ')}`);
                } else if (err.message && err.message.includes('Malformed UTF-8')) {
                     setError('Decompression Error: Malformed Data. Please try re-uploading the images, ensuring they are clear and complete.');
                } else {
                     setError('Decompression failed: ' + err.message);
                }
            });
        }
    }
  }, [shards, totalShards, globalHash]);

  // Handler: Upload Auth Key QR (Restore Secret)
  const handleKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await readQrFromFile(file);
      if (!text) throw new Error('Could not read QR code');
      
      // Parse otpauth:// URI
      // Format: otpauth://totp/Label?secret=SECRET&...
      if (!text.startsWith('otpauth://')) throw new Error('Invalid Auth QR Code');
      
      const url = new URL(text);
      const secret = url.searchParams.get('secret');
      
      if (!secret) throw new Error('No secret found in QR');
      
      if (type === 'A') setSecretA(secret);
      else setSecretB(secret);
      
    } catch (err: any) {
      setError(`Failed to load Key ${type}: ${err.message}`);
    }
    e.target.value = '';
  };

  // Helper to clear shards
  const clearShards = () => {
    setShards(new Map());
    setTotalShards(0);
    setGlobalHash('');
    setMergedData(null);
    setDecryptedResult(null);
    setError('');
    setFailedFiles([]);
    setMissingIndices([]);
    setProcessingStatus('');
  };

  // Handler: Final Decrypt
  const handleDecrypt = async () => {
    if (!mergedData || !secretA || !secretB) return;
    
    try {
      // 1. Verify Codes (Optional if strictly file-based, but enforced for security/process)
      // If user provided codes, verify them.
      if (codeA && !verifyToken(secretA, codeA)) throw new Error('Authenticator A code is incorrect');
      if (codeB && !verifyToken(secretB, codeB)) throw new Error('Authenticator B code is incorrect');
      
      // 2. Parse Merged Data
      const data = JSON.parse(mergedData);
      // Expected: { ec: string, epl: string } OR { em: string, epl: string }
      
      if ((!data.em && !data.ec) || !data.epl) throw new Error('Invalid data format');
      
      let mnemonic = '';
      let password = '';
      let lineNumber = 0;
      let ciphertext = '';
      let hash = '';
      let fullRows: string[][] = [];

      // 3. Decrypt
      if (data.ec) {
          // New "Huge" Payload Logic (Standard Mode Wrapped)
          
          // A. Decrypt ec -> ciphertext using Secret A
          const decryptedCiphertext = decryptWithSecret(data.ec, secretA);
          if (!decryptedCiphertext) throw new Error('Failed to decrypt Ciphertext (Key A might be wrong)');
          ciphertext = decryptedCiphertext;

          // B. Decrypt epl -> Context using Secret B
          const pwdLineJson = decryptWithSecret(data.epl, secretB);
          if (!pwdLineJson) throw new Error('Failed to decrypt Context (Key B might be wrong)');
          
          const context = JSON.parse(pwdLineJson);
          password = context.password;
          lineNumber = context.lineNumber;
          hash = data.h;

          // C. Decrypt ciphertext -> rows using password (Async)
          // We need to handle potential format variations in ciphertext (e.g. "Ciphertext: ... Hash: ...")
          let processedCiphertext = ciphertext;
          if (processedCiphertext.includes('Ciphertext:')) {
            const parts = processedCiphertext.split('Ciphertext:');
            if (parts.length > 1) processedCiphertext = parts[1];
          }
          if (processedCiphertext.includes('Hash:')) {
            processedCiphertext = processedCiphertext.split('Hash:')[0];
          }
          processedCiphertext = processedCiphertext.trim();

          const json = await decryptWithAES(processedCiphertext, password);
          const parsed = JSON.parse(json);
          
          let rows: string[][] = [];
          if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
              rows = parsed as string[][];
          } else if (Array.isArray(parsed)) {
              rows = [parsed as string[]];
          }
          fullRows = rows;

          // D. Extract Mnemonic at lineNumber
          // lineNumber is 1-based (from ResultStep), so we need to subtract 1 for 0-based array index
          let rowIndex = lineNumber > 0 ? lineNumber - 1 : 0;
          
          if (rows[rowIndex]) {
             mnemonic = rows[rowIndex].join(' ');
          } else {
             // Fallback: If specific row invalid, try to join all rows or just warn
             console.warn(`Row ${lineNumber} not found. Available rows: ${rows.length}`);
             if (rows.length === 1) {
                 rowIndex = 0;
                 mnemonic = rows[0].join(' '); // Auto-select if only 1 row
             }
          }

      } else {
          // Legacy Logic (Small Payload)
          mnemonic = decryptWithSecret(data.em, secretA);
          if (!mnemonic) throw new Error('Failed to decrypt Mnemonic (Key A might be wrong)');
          
          const pwdLineJson = decryptWithSecret(data.epl, secretB);
          if (!pwdLineJson) throw new Error('Failed to decrypt Context (Key B might be wrong)');
          
          const context = JSON.parse(pwdLineJson);
          password = context.password;
          lineNumber = context.lineNumber;
          
          // In legacy, ciphertext might be in data.c or missing
          ciphertext = data.c; 
          hash = data.h;
          fullRows = [[mnemonic]];
      }
      
      // Auto-decode if it looks like book cipher indices
      let displayMnemonic = mnemonic;
      if (isBookCipherIndices(mnemonic)) {
          try {
             // Handle space or newline separated indices
             const parts = mnemonic.trim().split(/[\s\n]+/);
             const indices = parts.map(p => {
                 // Remove any trailing/leading punctuation if any
                 const clean = p.replace(/[^\d-]/g, '');
                 if (!clean) return -1;
                 return decodeBookCipherToIndex(clean);
             }).filter(i => i !== -1);
             
             if (indices.length > 0) {
                 const words = indicesToMnemonic(indices);
                 // If we got words and they are all letters, use it
                 if (words && words.length > 0 && !words.includes('undefined')) {
                     displayMnemonic = words;
                 }
             }
          } catch (e) {
             console.warn('Failed to auto-decode book cipher indices', e);
          }
      }

      // Final fallback if displayMnemonic is empty but we have rows
      if (!displayMnemonic && fullRows.length > 0) {
         displayMnemonic = `(Error: Could not locate mnemonic at Line ${lineNumber}. Please check "Full Decrypted Content" below.)`;
      }

      setDecryptedResult({ mnemonic: displayMnemonic, password, lineNumber, ciphertext, hash, fullRows });
      setError('');
      
    } catch (err: any) {
      setError(err.message);
      setDecryptedResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Overlay */}
      {showScanner && (
        <QRCodeStreamScanner 
          onScanComplete={handleStreamScanComplete}
          onClose={() => setShowScanner(false)}
          mode="fullscreen"
        />
      )}

      {/* Step 1: Upload Shards */}
      <div className="border p-4 rounded-lg bg-slate-900/50 border-indigo-500/30 relative overflow-hidden">
        {/* Step Number Background */}
        <div className="absolute -right-4 -top-4 text-9xl font-bold text-slate-800/20 select-none pointer-events-none">
          1
        </div>

        <h3 className="font-semibold flex items-center gap-2 text-white relative z-10">
          <Upload className="w-4 h-4 text-indigo-400" /> 
          1. Upload Dual-Auth Shards
        </h3>
        <p className="text-sm text-slate-400 mb-4 relative z-10">
          Upload all shards (usually 8-12) generated by the Dual Auth Generator.
        </p>
        
        <div className="flex items-center gap-4 relative z-10">
          <Button 
            variant="outline" 
            className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/20"
            onClick={() => setShowScanner(true)}
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan Stream
          </Button>

          <Button variant="outline" className="relative border-white/20 hover:bg-white/10 text-white">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleShardUpload}
            />
            Select Images
          </Button>

          {(shards.size > 0 || failedFiles.length > 0) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearShards}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              Clear / Reset
            </Button>
          )}

          <span className="text-sm font-mono text-slate-300">
            {processingStatus ? (
              <span className="flex items-center gap-2 text-yellow-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {processingStatus}
              </span>
            ) : (
              <span className={shards.size === totalShards ? "text-green-400" : "text-yellow-400"}>
                 Progress: {shards.size} / {totalShards || '?'}
              </span>
            )}
          </span>
        </div>

        {failedFiles.length > 0 && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-800">
            <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Failed to read {failedFiles.length} files:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {failedFiles.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {totalShards > 0 && missingIndices.length > 0 && (
           <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-800">
             Missing Parts: {missingIndices.join(', ')}
           </div>
        )}
        
        {error && (
          <div className="text-red-400 text-sm flex items-center gap-2 bg-red-900/20 p-2 rounded border border-red-800">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {mergedData && (
          <div className="text-green-400 text-sm flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Shards merged successfully!
          </div>
        )}
      </div>

      {/* Step 2: Restore Keys (Required) */}
      <div className="space-y-4 border p-4 rounded-lg bg-gray-50/10 border-white/10">
        <h3 className="font-semibold flex items-center gap-2 text-white">
          <ScanLine className="w-4 h-4 text-purple-400" /> 
          2. Input Decryption Keys (Required)
        </h3>
        <p className="text-sm text-slate-400">
          The 6-digit Authenticator codes are NOT enough to decrypt your data. 
          <br/>
          You MUST provide the original <strong>Secret Keys</strong> (Key A & Key B) to unlock the encryption.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key A Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">Key A (Secret for Mnemonic)</label>
            
            {/* Upload Button */}
            <div className="relative">
               <Button variant={secretA ? "primary" : "outline"} size="sm" className={`w-full justify-center ${!secretA && 'text-slate-300 border-white/20 hover:bg-white/10'}`}>
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleKeyUpload(e, 'A')}
                />
                <ScanLine className="w-4 h-4 mr-2" />
                {secretA ? 'Key A QR Loaded' : 'Upload Key A QR'}
              </Button>
            </div>

            <div className="text-center text-xs text-slate-500">- OR -</div>

            {/* Manual Input */}
            <Input 
              type="password"
              placeholder="Paste Key A Secret (Base32)"
              value={secretA}
              autoComplete="new-password"
              onChange={(e) => setSecretA(e.target.value)}
              className="bg-slate-900/50 border-white/10 text-white text-xs h-9 placeholder:text-slate-600 font-mono"
            />
            <p className="text-[10px] text-slate-500 italic">
               * Lost QR? Check your Authenticator App "Export" or "Show Secret" feature to find this code.
            </p>
          </div>

          {/* Key B Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">Key B (Secret for Context)</label>
            
            {/* Upload Button */}
            <div className="relative">
               <Button variant={secretB ? "primary" : "outline"} size="sm" className={`w-full justify-center ${!secretB && 'text-slate-300 border-white/20 hover:bg-white/10'}`}>
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleKeyUpload(e, 'B')}
                />
                <ScanLine className="w-4 h-4 mr-2" />
                {secretB ? 'Key B QR Loaded' : 'Upload Key B QR'}
              </Button>
            </div>

            <div className="text-center text-xs text-slate-500">- OR -</div>

            {/* Manual Input */}
             <Input 
              type="password"
              placeholder="Paste Key B Secret (Base32)"
              value={secretB}
              autoComplete="new-password"
              onChange={(e) => setSecretB(e.target.value)}
              className="bg-slate-900/50 border-white/10 text-white text-xs h-9 placeholder:text-slate-600 font-mono"
            />
            <p className="text-[10px] text-slate-500 italic">
               * Lost QR? Check your Authenticator App "Export" or "Show Secret" feature to find this code.
            </p>
          </div>
        </div>
      </div>

      {/* Step 3: Auth Verification */}
      <div className="space-y-4 border p-4 rounded-lg bg-gray-50/10 border-white/10">
        <h3 className="font-semibold flex items-center gap-2 text-white">
          <Smartphone className="w-4 h-4 text-green-400" /> 
          3. Verify Keys with Authenticator Code (Optional)
        </h3>
        <p className="text-sm text-slate-400">
          Enter the current 6-digit codes from your Authenticator App to verify that the Keys you entered above are correct.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <Input 
            placeholder="Code A (e.g. 123456)" 
            value={codeA} 
            onChange={(e) => setCodeA(e.target.value)}
            maxLength={6}
            className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
          />
          <Input 
            placeholder="Code B (e.g. 654321)" 
            value={codeB} 
            onChange={(e) => setCodeB(e.target.value)}
            maxLength={6}
            className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={handleDecrypt}
            disabled={!mergedData || !secretA || !secretB}
          >
            Decrypt Data
          </Button>
          {(!secretA || !secretB) && (
            <p className="text-xs text-center text-red-400 animate-pulse">
              * Please provide both Secret Keys (Step 2) to enable decryption.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {decryptedResult && (
        <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500/30 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-bold text-white">Decryption Successful!</h3>
          </div>
          
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                 Recovered Secret (Mnemonic)
              </label>
              <button 
                onClick={() => handleCopy(decryptedResult.mnemonic)}
                className={`text-xs flex items-center gap-1 transition-colors ${copyFeedback ? 'text-green-400' : 'text-indigo-400 hover:text-indigo-300'}`}
              >
                {copyFeedback ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copyFeedback ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-700 font-mono text-sm break-all text-white shadow-inner">
              {decryptedResult.mnemonic}
            </div>
            
            {/* Warning if it STILL looks like indices (decoding failed) */}
            {isBookCipherIndices(decryptedResult.mnemonic) && (
               <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-800 flex items-start gap-2">
                 <ScanLine className="w-4 h-4 shrink-0 mt-0.5" />
                 <span>
                   <strong>Note:</strong> These appear to be Book Cipher Indices. 
                   Automatic decoding failed. Please use the "Standard Decryption Tool" with your book file if needed.
                 </span>
               </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">Context Password</label>
              <div className="bg-slate-950 p-3 rounded border border-slate-700 font-mono text-sm text-white">
                {decryptedResult.password || <span className="text-slate-600 italic">None</span>}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">Line Number</label>
              <div className="bg-slate-950 p-3 rounded border border-slate-700 font-mono text-sm text-white">
                {decryptedResult.lineNumber}
              </div>
            </div>
          </div>

          {/* Full Decrypted Content (Rows) */}
          {decryptedResult.fullRows && decryptedResult.fullRows.length > 0 && (
             <div className="pt-4 border-t border-slate-700/50">
               <label className="text-xs font-semibold text-slate-500 block mb-1">Full Decrypted Content (All Rows)</label>
               <div className="bg-slate-900/50 rounded border border-slate-700 overflow-hidden max-h-60 overflow-y-auto">
                 {decryptedResult.fullRows.map((row, idx) => (
                    <div key={idx} className={`p-2 font-mono text-xs text-slate-300 border-b border-slate-800 last:border-0 ${idx + 1 === decryptedResult.lineNumber ? 'bg-indigo-500/20 text-indigo-200' : ''}`}>
                       <span className="text-slate-500 mr-2 select-none w-6 inline-block text-right">{idx + 1}.</span>
                       {row.join(' ')}
                    </div>
                 ))}
               </div>
             </div>
          )}

          {/* Show full Ciphertext if recovered (Legacy support or if user really wants it) */}
          {decryptedResult.ciphertext && decryptedResult.ciphertext !== decryptedResult.mnemonic && (
             <div className="pt-4 border-t border-slate-700/50">
               <label className="text-xs font-semibold text-slate-500 block mb-1">Raw Ciphertext (Legacy)</label>
               <textarea 
                 readOnly 
                 className="w-full h-20 text-xs font-mono p-2 rounded border border-slate-700 bg-slate-900/50 resize-none focus:outline-none text-slate-400"
                 value={decryptedResult.ciphertext}
               />
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShardDualAuthDecryptor;
