import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, ArrowRight, Wallet, ShieldCheck, User, Copy, Clipboard } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { QRCodeSVG } from 'qrcode.react';
import { useLicense } from '../contexts/LicenseContext';
import { getDeviceFingerprint } from '../utils/device';

interface USDTPaymentModalProps {
  plan: {
    id: string;
    name: string;
    price: string;
  };
  onClose: () => void;
}

type Chain = 'BSC' | 'TRX' | 'ETH';

const OFFICIAL_WALLETS: Record<Chain, string> = {
  BSC: '0xfbaa3b973faf78f7c8b736a8a923773b4f332d36',
  TRX: 'TBnYQQorJyMoDXMejP5EtBEY1PthosqbzP',
  ETH: '0xfbaa3b973faf78f7c8b736a8a923773b4f332d36'
};

const CHAIN_INFO: Record<Chain, { name: string; standard: string; color: string }> = {
  BSC: { name: 'BNB Smart Chain', standard: 'BEP20', color: 'text-yellow-400' },
  TRX: { name: 'TRON', standard: 'TRC20', color: 'text-red-400' },
  ETH: { name: 'Ethereum', standard: 'ERC20', color: 'text-blue-400' }
};

export const USDTPaymentModal = ({ plan, onClose }: USDTPaymentModalProps) => {
  const { userNickname: nickname } = useLicense();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);

  const [txHash, setTxHash] = useState('');
  const [paymentId, setPaymentId] = useState('');
  // const [verifying, setVerifying] = useState(false); // Unused
  
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Poll for payment status
  useEffect(() => {
    if (step === 4 && paymentId) {
        // setVerifying(true);
        const interval = setInterval(async () => {
            try {
                // Determine API URL based on environment
                const WORKER_URL = window.location.hostname === 'localhost' 
                    ? 'http://localhost:8787' 
                    : '/api';
                
                const res = await fetch(`${WORKER_URL}/check-payment-status?txHash=${paymentId}`);
                const data = await res.json();
                
                if (data.status === 'verified') {
                    clearInterval(interval);
                    // setVerifying(false);
                    // Handle Success Logic
                    if (plan.id === 'price_weekly_trial' && data.tempToken) {
                         sessionStorage.setItem('cryptokey_real_license', 'TEMP_PRO_ACTIVATED');
                         sessionStorage.setItem('cryptokey_temp_token', data.tempToken);
                         sessionStorage.setItem('cryptokey_license_expiry', (Date.now() + 86400000).toString());
                         window.location.reload();
                    } else {
                        // For regular plans, reload to refresh license status
                        setTimeout(() => window.location.reload(), 2000);
                    }
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    // setVerifying(false);
                    setError(data.reason || 'Payment verification failed. Please check your transaction.');
                    setStep(2); // Go back to input
                }
                // If pending, continue polling
            } catch (e) {
                // Ignore poll errors (network glitches, etc.)
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }
  }, [step, paymentId, plan.id]);

  const handleNextStep = async () => {
    setError('');
    
    if (step === 1) {
      // 1. Bypass check for Anonymous 24h Pass
      if (plan.id === 'price_weekly_trial') {
        setStep(2);
        return;
      }

      // 2. If already logged in
      if (nickname) {
        setStep(2);
      } else {
        // Must login/register
        window.dispatchEvent(new CustomEvent('OPEN_LOGIN_MODAL'));
        onClose();
      }
    } else if (step === 2) {
      if (!selectedChain) {
        setError('Please select a payment network');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!txHash) {
        setError('Transaction Hash (TXID) is required');
        return;
      }

      // Validation Logic
      const cleanHash = txHash.trim();
      let isValid = false;

      if (selectedChain === 'TRX') {
         // TRON TXID: 64 hex chars
         isValid = /^[a-fA-F0-9]{64}$/.test(cleanHash);
         if (!isValid) setError('Invalid TRON TXID. It should be a 64-character hex string (not an address).');
      } else if (selectedChain === 'BSC' || selectedChain === 'ETH') {
         // ETH/BSC TXID: 0x + 64 hex chars OR just 64 hex chars
         isValid = /^(0x)?[a-fA-F0-9]{64}$/.test(cleanHash);
         if (!isValid) setError(`Invalid ${selectedChain} TXID. It should look like 0x... and have 64 hex characters.`);
      }

      if (!isValid) return;

      setPaymentId(cleanHash);
      setStep(4);
    }
  };


  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTxHash(text);
    } catch (err) {
      setError('Failed to read clipboard. Please type manually.');
    }
  };

  const handleCopy = () => {
    if (selectedChain) {
      navigator.clipboard.writeText(OFFICIAL_WALLETS[selectedChain]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentComplete = async () => {
    setIsLoading(true);
    setError('');

    const WORKER_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8787' 
        : '/api';

    try {
        const fingerprint = await getDeviceFingerprint();
        const response = await fetch(`${WORKER_URL}/submit-usdt-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userNickname: nickname || undefined,
                network: selectedChain?.toLowerCase(),
                txHash: txHash,
                amount: parseFloat(plan.price.replace('$','')), // Extract number
                planType: plan.id === 'price_weekly_trial' ? '24h' : (plan.id === 'price_yearly' ? 'yearly' : 'monthly'),
                deviceFingerprint: fingerprint
            })
        });

        if (response.ok) {
            const data = await response.json();
            setPaymentId(data.paymentId || txHash); // Use returned ID or txHash
            setStep(4);
        } else {
            const data = await response.json().catch(() => ({}));
            setError(data.error || "Failed to submit payment verification. Please try again.");
        }
    } catch (e) {
        setError("Network error. Please ensure the backend is running.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Wallet className="text-primary" size={20} />
            USDT Payment <span className="text-slate-500 text-sm">Step {step}/4</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Step 1: User Identity */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {plan.id === 'price_weekly_trial' ? (
                 <div className="space-y-4">
                     <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-amber-500" size={24} />
                     </div>
                     <div className="text-center space-y-2">
                        <h4 className="text-xl font-bold text-white">Temporary Access Warning</h4>
                        <p className="text-slate-400 text-sm">You are purchasing a 24-Hour Pass without logging in.</p>
                     </div>
                     
                     <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 space-y-3">
                         <div className="flex gap-3">
                             <ShieldCheck className="text-amber-500 shrink-0" size={20} />
                             <p className="text-sm text-amber-200">
                                 This license is <strong>device-bound</strong>. It will only work on this specific browser and device.
                             </p>
                         </div>
                         <div className="flex gap-3">
                             <X className="text-red-400 shrink-0" size={20} />
                             <p className="text-sm text-red-200">
                                 If you clear your cache or switch devices, you will <strong>lose access</strong> permanently. No recovery possible.
                             </p>
                         </div>
                     </div>

                     <div className="text-center">
                         <p className="text-xs text-slate-500 mb-4">We recommend logging in for safety, but you can proceed anonymously.</p>
                     </div>
                 </div>
              ) : (
                <div className="space-y-6 animate-in fade-in">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="text-primary" size={24} />
                        </div>
                        <h4 className="text-xl font-bold text-white">Account Verification</h4>
                        {nickname ? (
                             <p className="text-green-400 text-sm flex items-center justify-center gap-1">
                                <Check size={14} /> Logged in as <span className="font-bold">{nickname}</span>
                             </p>
                        ) : (
                             <div className="text-red-400 space-y-2">
                                <p>You must be logged in to subscribe to this plan.</p>
                                <p className="text-xs text-slate-400">Please close this window and register/login first.</p>
                             </div>
                        )}
                    </div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                onClick={handleNextStep} 
                className="w-full h-12 text-lg font-bold"
                disabled={!nickname && plan.id !== 'price_weekly_trial'}
              >
                Continue <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Select Chain & Enter Wallet */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="space-y-4">
                <label className="text-sm text-slate-400 block">Select Payment Network</label>
                <div className="grid grid-cols-1 gap-3">
                  {(Object.keys(CHAIN_INFO) as Chain[]).map((chain) => (
                    <button
                      key={chain}
                      onClick={() => setSelectedChain(chain)}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all group ${
                        selectedChain === chain 
                          ? 'bg-primary/10 border-primary text-white' 
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${selectedChain === chain ? 'bg-primary' : 'bg-slate-600'}`} />
                        <span className="font-bold">{chain}</span>
                        <span className="text-xs text-slate-500">({CHAIN_INFO[chain].standard})</span>
                      </div>
                      {selectedChain === chain && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {selectedChain && (
                 <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center animate-in fade-in">
                    <p className="text-sm text-slate-400">Selected Network:</p>
                    <p className="text-lg font-bold text-white">{CHAIN_INFO[selectedChain].name} ({CHAIN_INFO[selectedChain].standard})</p>
                 </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={handleNextStep} className="w-full">
                Continue <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 3 && selectedChain && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="text-center space-y-2">
                <p className="text-slate-400 text-sm">Please send exactly</p>
                <div className="text-3xl font-bold text-white">{plan.price}</div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                  Network: {CHAIN_INFO[selectedChain].name} ({CHAIN_INFO[selectedChain].standard})
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <QRCodeSVG value={OFFICIAL_WALLETS[selectedChain]} size={160} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Official Wallet Address</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/30 p-3 rounded-lg text-xs font-mono text-slate-300 break-all border border-slate-700/50">
                      {OFFICIAL_WALLETS[selectedChain]}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg transition-colors shrink-0"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-200 flex gap-3">
                <AlertTriangle className="shrink-0" size={20} />
                <p>Ensure you are sending USDT on the <strong>{selectedChain} ({CHAIN_INFO[selectedChain].standard})</strong> network. Wrong network transfers will be lost.</p>
              </div>

              <div className="space-y-4 animate-in fade-in">
                  <label className="text-sm text-slate-400 block">Transaction Hash (TXID)</label>
                  <div className="relative">
                    <Input
                      value={txHash}
                      onChange={(e) => {
                          setTxHash(e.target.value);
                      }}
                      placeholder={`Paste the transaction hash (TXID)`}
                      className="pr-24 font-mono text-sm"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button 
                            onClick={handlePaste}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Paste from Clipboard"
                        >
                            <Clipboard size={16} />
                        </button>
                    </div>
                  </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                onClick={handlePaymentComplete} 
                className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'I Have Sent Payment'}
              </Button>
            </div>
          )}

          {/* Step 4: Verification */}
          {step === 4 && renderVerificationStep()}
        </div>
      </div>
    </div>
  );
};
