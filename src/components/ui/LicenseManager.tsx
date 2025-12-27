import { useState, useEffect } from 'react';
import { useLicense } from '../../contexts/LicenseContext';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { Key, CheckCircle, X, ShieldCheck, ChevronUp, User } from 'lucide-react';
import QRCode from 'qrcode';

export const LicenseManager = () => {
  const { licenseType, licenseExpiry, loginWithTOTP, requestTOTP, logout, isUpgradeModalOpen, setUpgradeModalOpen, userNickname } = useLicense();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const isRealPro = ['pro_real', 'pro_local', 'pro_temp'].includes(licenseType);
    
    if (!isRealPro) {
        setTimeLeft('');
        setIsExpired(false);
        return;
    }

    if (licenseType === 'pro_local') {
        setTimeLeft('USB Key / Local');
        setIsExpired(false);
        return;
    }

    if (!licenseExpiry) {
        setTimeLeft('Active'); // Lifetime or Admin
        return;
    }

    const updateTimer = () => {
        const now = Date.now();
        const diff = licenseExpiry - now;

        if (diff <= 0) {
            setTimeLeft('00:00:00');
            setIsExpired(true);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n: number) => n.toString().padStart(2, '0');
        
        if (days > 0) {
            setTimeLeft(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        } else {
            setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        }
        setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [licenseType, licenseExpiry]);
  
  const [nickname, setNickname] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [registerData, setRegisterData] = useState<{secret: string, otpauth: string} | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleRegister = async () => {
    if (!nickname) {
      setError('Please enter a Nickname');
      return;
    }
    // Validation: 3-20 chars, alphanumeric
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nickname)) {
        setError('Nickname must be 3-20 characters (A-Z, 0-9, _)');
        return;
    }

    setIsLoading(true);
    setError('');
    
    try {
        const response = await requestTOTP(nickname);
        if (response && response.success && response.data) {
            const { secret, otpauth } = response.data;
            setRegisterData({ secret, otpauth });
            try {
                const url = await QRCode.toDataURL(otpauth);
                setQrCodeUrl(url);
                setSuccess('Nickname Registered! Bind Authenticator now.');
            } catch (e) {
                console.error("QR Gen failed", e);
                setSuccess('Registered! Please enter secret manually.');
            }
        } else {
            // Enhanced error handling
            const errMsg = response?.error || 'Registration failed';
            if (errMsg.toLowerCase().includes('taken') || errMsg.toLowerCase().includes('exist')) {
                 setError(`Nickname "${nickname}" is already taken.`);
            } else {
                 setError(errMsg);
            }
        }
    } catch (e) {
        setError('Network error: ' + String(e));
    }
    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!nickname || !totpToken) {
        setError('Please enter Nickname and Code');
        return;
    }
    
    setIsLoading(true);
    setError('');
    
    const success = await loginWithTOTP(nickname, totpToken);
    
    if (success) {
        setSuccess('Login Successful! Pro Features Activated.');
        setUpgradeModalOpen(false);
        // Reset sensitive fields
        setTotpToken('');
    } else {
        setError('Login Failed. Invalid Code or Nickname.');
    }
    
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  // Compact Badge (When Closed)
  if (!isUpgradeModalOpen) {
    const isPro = ['pro_real', 'pro_local', 'pro_temp'].includes(licenseType);
    const isLoggedIn = !!userNickname;
    
    let badgeClass = 'bg-amber-900/20 border-amber-500/50 text-amber-200';
    let icon = <Key size={18} className="text-amber-400" />;
    let text = 'ACTIVATE PRO';
    
    if (isPro) {
        if (licenseType === 'pro_temp') {
            badgeClass = 'bg-amber-900/90 border-amber-500 text-amber-100';
            icon = <ShieldCheck size={18} className="text-amber-400" />;
            text = 'TEMP PRO';
        } else if (licenseType === 'pro_local') {
            badgeClass = 'bg-green-900/90 border-green-500 text-green-100';
            icon = <ShieldCheck size={18} className="text-green-400" />;
            text = 'PRO ACTIVE';
        } else {
            // Online Pro User
            badgeClass = 'bg-green-900/90 border-green-500 text-green-100';
            icon = <ShieldCheck size={18} className="text-green-400" />;
            text = 'PRO ACTIVE';
        }
    } else if (isLoggedIn) {
        // Logged in but no license (Free Tier)
        badgeClass = 'bg-slate-800 border-slate-600 text-slate-300';
        icon = <User size={18} className="text-slate-400" />;
        text = userNickname ? userNickname.substring(0, 10) : 'USER';
    } else {
        // Not logged in
        badgeClass = 'bg-amber-900/20 border-amber-500/50 text-amber-200';
        icon = <Key size={18} className="text-amber-400" />;
        text = 'ACTIVATE PRO';
    }

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <button 
                onClick={() => setUpgradeModalOpen(true)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all hover:scale-105
                    ${badgeClass}
                `}
            >
                {icon}
                <span className="text-xs font-bold">{text}</span>
                {!isPro && <ChevronUp size={14} className="opacity-50" />}
            </button>
        </div>
    );
  }

  // Expanded Modal (When Open)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setUpgradeModalOpen(false)}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className={licenseType === 'pro_real' ? "text-green-400" : "text-amber-500"} />
                {licenseType === 'pro_real' ? 'Pro License Active' : 'Activate Pro License'}
            </h3>
            <button onClick={() => setUpgradeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            {/* Feedback Messages */}
            {(error || success) && (
                <div className={`p-3 rounded-lg border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
                    error 
                        ? 'bg-red-500/10 border-red-500/50 text-red-200' 
                        : 'bg-green-500/10 border-green-500/50 text-green-200'
                }`}>
                    {error ? <X size={16} /> : <CheckCircle size={16} />}
                    <p className="text-sm font-medium">{error || success}</p>
                </div>
            )}

            {/* Status Display */}
            {['pro_real', 'pro_local', 'pro_temp'].includes(licenseType) ? (
                <div className="text-center py-4 space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isExpired ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                        {isExpired ? (
                            <X size={32} className="text-red-500" />
                        ) : (
                            <CheckCircle size={32} className="text-green-500" />
                        )}
                    </div>
                    
                    <div>
                        {isExpired ? (
                            <>
                                <p className="text-red-400 font-medium text-lg">License Expired</p>
                                <p className="text-slate-400 text-sm mt-1">Please renew your subscription.</p>
                                <Link 
                                    to="/pricing" 
                                    onClick={() => setUpgradeModalOpen(false)}
                                    className="inline-block mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors"
                                >
                                    Renew Now
                                </Link>
                            </>
                        ) : (
                            <>
                                {licenseType === 'pro_local' ? (
                                    <div className="space-y-3">
                                        <p className="text-green-400 font-bold text-xl">Official Offline License</p>
                                        <p className="text-slate-400 text-xs">Valid Local Key Detected</p>
                                    </div>
                                ) : licenseType === 'pro_temp' ? (
                                    <div className="space-y-3">
                                         <p className="text-green-400 font-bold text-xl">24h Temporary Pass</p>
                                         <p className="text-amber-400 font-mono text-xl font-bold mt-2 tracking-wider">
                                            {timeLeft}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-green-400 font-medium text-lg">Pro License Active</p>
                                        <p className="text-slate-300 font-bold text-xl mt-1">{userNickname}</p>
                                        {timeLeft && (
                                            <p className="text-amber-400 font-mono text-sm font-bold mt-2 tracking-wider">
                                                Expires: {timeLeft}
                                            </p>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => {
                            logout();
                            setUpgradeModalOpen(false);
                        }}
                        className="w-full py-2 mt-4 text-sm font-bold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                        {licenseType === 'pro_local' ? 'Deactivate Local Key' : 'Logout'}
                    </button>
                </div>
            ) : (
                <>
                    {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (
                        <div className="text-center py-8 space-y-4">
                            <ShieldCheck size={48} className="text-amber-500 mx-auto" />
                            <h4 className="text-xl font-bold text-white">Local Offline Mode</h4>
                            <p className="text-slate-400 text-sm px-4">
                                Online registration is disabled in local environment.
                                <br />
                                Please place a valid <code>.key</code> file in the root directory.
                            </p>
                            <div className="pt-4">
                                <a 
                                    href="https://cryptokey.im" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
                                >
                                    Get Official License
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mode Toggle */}
                            <div className="flex p-1 bg-slate-800 rounded-lg">
                                <button 
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                    onClick={() => { setMode('login'); setRegisterData(null); }}
                                >
                                    Login
                                </button>
                                <button 
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                    onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                                >
                                    Register
                                </button>
                            </div>

                            {/* Login Form */}
                            {mode === 'login' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 uppercase font-bold">Nickname</label>
                                        <input 
                                            type="text" 
                                            value={nickname}
                                            onChange={(e) => {
                                                setNickname(e.target.value);
                                                if (error) setError('');
                                            }}
                                            placeholder="Your Nickname"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 uppercase font-bold">Authenticator Code</label>
                                        <input 
                                            type="text" 
                                            value={totpToken}
                                            onChange={(e) => setTotpToken(e.target.value)}
                                            placeholder="000 000"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest text-lg"
                                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                        />
                                    </div>
                                    <Button variant="primary" className="w-full py-3" onClick={handleLogin} disabled={isLoading}>
                                        {isLoading ? 'Verifying...' : 'Unlock Pro Features'}
                                    </Button>
                                </div>
                            )}

                            {/* Register Form */}
                            {mode === 'register' && (
                                <div className="space-y-4">
                                    {!registerData ? (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 uppercase font-bold">Nickname (Unique)</label>
                                                <input 
                                                    type="text" 
                                                    value={nickname}
                                                    onChange={(e) => setNickname(e.target.value)}
                                                    placeholder="Create a Nickname (3-20 chars)"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                                                />
                                            </div>
                                            <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-4">
                                                <p className="text-amber-200 text-xs leading-relaxed">
                                                    <strong>Privacy First:</strong> No email required. 
                                                    Your unique nickname and authenticator are your only keys. 
                                                    Don't lose them!
                                                </p>
                                            </div>
                                            <Button variant="secondary" className="w-full py-3" onClick={handleRegister} disabled={isLoading}>
                                                {isLoading ? 'Checking Availability...' : 'Create Account'}
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="text-center space-y-2">
                                                <h4 className="text-slate-200 font-medium">Bind Authenticator</h4>
                                                <p className="text-xs text-slate-400">Scan this with your Auth App</p>
                                            </div>
                                            
                                            {qrCodeUrl && (
                                                <div className="bg-white p-4 rounded-lg w-fit mx-auto">
                                                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                                                </div>
                                            )}
                                            
                                            <div className="text-center space-y-2">
                                                <p className="text-xs text-slate-500">Or enter secret manually:</p>
                                                <code 
                                                    onClick={() => copyToClipboard(registerData.secret)}
                                                    className="block bg-slate-950 p-2 rounded border border-slate-800 text-amber-500 text-xs cursor-pointer hover:bg-slate-900"
                                                >
                                                    {registerData.secret}
                                                </code>
                                            </div>

                                            <Button 
                                                variant="primary" 
                                                className="w-full" 
                                                onClick={() => { setMode('login'); setRegisterData(null); }}
                                            >
                                                I have bound it, Go to Login
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
