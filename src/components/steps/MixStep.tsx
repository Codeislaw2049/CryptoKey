import React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProBadge } from '../ui/ProBadge';
import { mixDataInRows, generateFakeIndices } from '../../utils/generator';
import { encryptWithAES, arrayBufferToBase64 } from '../../utils/crypto';
import { Lock, Shuffle, ShieldAlert } from 'lucide-react';
import { useSecureMemory } from '../../hooks/useSecureMemory';
import { useLicense } from '../../contexts/LicenseContext';

interface MixStepProps {
  realData: string[];
  onNext: (result: { ciphertext: string; hash: string; realRowIndex: number; password: string }) => void;
  onBack: () => void;
}

export const MixStep = ({ realData, onNext, onBack }: MixStepProps) => {
  const { features, triggerUpgrade } = useLicense();
  const [password, setPassword] = useSecureMemory('');
  const [confirmPassword, setConfirmPassword] = useSecureMemory('');
  const [rowCount, setRowCount] = React.useState(100);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState('');

  // Duress Password State
  const [enableDuress, setEnableDuress] = React.useState(false);
  const [duressPassword, setDuressPassword] = useSecureMemory('');
  const [duressFakeContent, setDuressFakeContent] = React.useState('Access Denied. Unauthorized attempt logged.');

  const handleProcess = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (enableDuress) {
      if (!duressPassword) {
        setError('Duress password is required');
        return;
      }
      if (duressPassword === password) {
        setError('Duress password cannot be the same as real password');
        return;
      }
      if (duressPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setIsProcessing(true);
    setError('');

    try {
      // 1. Mix data into rows (Real Data)
      const { rows, realRowIndex } = mixDataInRows(realData, rowCount);
      const realPayload = JSON.stringify(rows);
      const { ciphertext: realCipher } = await encryptWithAES(realPayload, password);

      let finalCiphertext = realCipher;

      if (enableDuress) {
         // 2. Mix fake data into rows (Fake Data)
         let fakeData = [duressFakeContent];
         // Pad fake data to match real data dimensions (columns) to avoid revealing which vault is fake
         if (realData.length > 1) {
             const padding = generateFakeIndices(realData.length - 1);
             fakeData = [...fakeData, ...padding];
         }

         const { rows: fakeRows } = mixDataInRows(fakeData, rowCount);
         const fakePayload = JSON.stringify(fakeRows);
         const { ciphertext: fakeCipher } = await encryptWithAES(fakePayload, duressPassword);

         // 3. Combine into Vault Structure
         const vault = {
             v: '2',
             vaults: [realCipher, fakeCipher].sort(() => Math.random() - 0.5) // Shuffle
         };
         finalCiphertext = JSON.stringify(vault);
      }

      // 4. Calculate Final Hash
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(finalCiphertext));
      const finalHash = arrayBufferToBase64(new Uint8Array(hashBuffer));

      onNext({ ciphertext: finalCiphertext, hash: finalHash, realRowIndex, password });
    } catch (e) {
      console.error(e);
      setError('Encryption failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Lock className="text-primary" />
          Set Encryption Password
        </h2>
        <p className="text-slate-400">Set a strong password to encrypt your vault.</p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-4 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <Input
            type="password"
            label="Set Encryption Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a strong password"
            autoComplete="new-password"
          />
          <Input
            type="password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
          />
        </div>

        <div className="space-y-2 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Shuffle size={16} />
            Row Count (Mix Density) ({rowCount})
            {rowCount > 100 && <ProBadge />}
          </label>
          <input
            type="range"
            min="50"
            max={features.maxRowCount}
            step="50"
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
            className={`w-full accent-primary h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer ${rowCount > 100 ? 'accent-amber-500' : ''}`}
          />
          <p className="text-xs text-slate-500 text-center">
            Higher count = Better anonymity. 
            {features.maxRowCount <= 100 ? (
              <span className="text-amber-500/80 ml-1 cursor-pointer hover:underline" onClick={triggerUpgrade}>
                 (Limit: 100. Click to Upgrade)
              </span>
            ) : (
              <span className="text-amber-500/80 ml-1">Values &gt; 100 require Pro license.</span>
            )}
          </p>
        </div>

        {/* Duress Feature */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                 <ShieldAlert size={18} />
                 <span className="font-bold text-sm">Duress Password (Optional)</span>
                 <ProBadge />
              </div>
              <label className={`relative inline-flex items-center cursor-pointer ${!features.allowDuress ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={enableDuress} 
                  onChange={(e) => features.allowDuress && setEnableDuress(e.target.checked)} 
                  disabled={!features.allowDuress}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
           </div>
           
           {enableDuress && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                <p className="text-xs text-slate-400">
                  Create a fake vault that opens with a different password. Use this if forced to unlock your device.
                </p>
                <Input
                  type="password"
                  label="Duress Password"
                  value={duressPassword}
                  onChange={(e) => setDuressPassword(e.target.value)}
                  placeholder="Different from real password"
                  autoComplete="new-password"
                  className="border-amber-500/30 focus:border-amber-500"
                />
                <div className="space-y-1">
                   <label className="text-xs font-medium text-slate-400">Fake Content (Decoy)</label>
                   <textarea
                      value={duressFakeContent}
                      onChange={(e) => setDuressFakeContent(e.target.value)}
                      className="w-full h-20 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-amber-500 transition-colors"
                   />
                </div>
             </div>
           )}
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handleProcess} 
            className="flex-[2]" 
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Encrypt & Generate'}
          </Button>
        </div>
      </div>
    </div>
  );
};
