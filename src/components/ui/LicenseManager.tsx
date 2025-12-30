import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../../contexts/LicenseContext';
import { Button } from './Button';
import { Key, CheckCircle, X, ShieldCheck, ChevronUp, User, Copy, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

const DesktopQRWrapper = ({ url }: { url: string }) => {
    const [dataUrl, setDataUrl] = useState<string>('');
    
    useEffect(() => {
        if (!url) return;
        QRCode.toDataURL(url, { width: 150, margin: 1 })
            .then(setDataUrl)
            .catch(err => console.error(err));
    }, [url]);

    if (!dataUrl) return <div className="w-32 h-32 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

    return <img src={dataUrl} alt="Desktop Auth QR" className="w-32 h-32" />;
};

export const LicenseManager = () => {
  const { t } = useTranslation();
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
        setTimeLeft(t('licenseManager.status.hardwareKeyActive'));
        setIsExpired(false);
        return;
    }

    if (!licenseExpiry) {
        setTimeLeft(t('licenseManager.status.active')); // Lifetime or Admin
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
  const [localCopySuccess, setLocalCopySuccess] = useState(false);
  const [showDesktopAuthQR, setShowDesktopAuthQR] = useState<'google' | 'microsoft' | null>(null);

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

  useEffect(() => {
      if (localCopySuccess) {
          const timer = setTimeout(() => setLocalCopySuccess(false), 2000);
          return () => clearTimeout(timer);
      }
  }, [localCopySuccess]);

  const handleRegister = async () => {
    if (!nickname) {
      setError(t('licenseManager.register.errorNickname'));
      return;
    }
    // Validation: 3-20 chars, alphanumeric
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nickname)) {
        setError(t('licenseManager.register.errorFormat'));
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
                setSuccess(t('licenseManager.register.success'));
            } catch (e) {
                console.error("QR Gen failed", e);
                setSuccess(t('licenseManager.register.manualSuccess'));
            }
        } else {
            // Enhanced error handling
            const errMsg = response?.error || 'Registration failed';
            if (errMsg.toLowerCase().includes('taken') || errMsg.toLowerCase().includes('exist')) {
                 setError(t('licenseManager.register.errorTaken', { nickname }));
            } else {
                 setError(errMsg);
            }
        }
    } catch (e) {
        setError(t('licenseManager.networkError', { error: String(e) }));
    }
    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!nickname || !totpToken) {
        setError(t('licenseManager.login.inputError'));
        return;
    }
    
    setIsLoading(true);
    setError('');
    
    const success = await loginWithTOTP(nickname, totpToken);
    
    if (success) {
        setSuccess(t('licenseManager.login.success'));
        setUpgradeModalOpen(false);
        // Reset sensitive fields
        setTotpToken('');
    } else {
        setError(t('licenseManager.login.error'));
    }
    
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setLocalCopySuccess(true);
    // setSuccess('Copied to clipboard!'); // Removed global toast in favor of local feedback
  };

  const getMobileOS = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) return "android";
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return "ios";
    return "desktop";
  };

  const AuthenticatorLinks = () => {
    const os = getMobileOS();
    
    const links = {
        google: {
            android: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
            ios: "https://apps.apple.com/us/app/google-authenticator/id388497605"
        },
        microsoft: {
            android: "https://play.google.com/store/apps/details?id=com.azure.authenticator",
            ios: "https://apps.apple.com/us/app/microsoft-authenticator/id983156458"
        }
    };

    if (os === 'desktop') {
        const qrBaseUrl = "https://cryptokey.im/install-auth";
        
        return (
            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider text-center">{t('licenseManager.authApp.title')}</p>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setShowDesktopAuthQR(showDesktopAuthQR === 'google' ? null : 'google')}
                        className={`flex-1 p-2 rounded border transition-all text-center ${showDesktopAuthQR === 'google' ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                     >
                         <span className="text-xs font-bold block">{t('licenseManager.authApp.google')}</span>
                         <span className="text-[9px] opacity-70 block">{t('licenseManager.authApp.download')}</span>
                     </button>
                     <button 
                        onClick={() => setShowDesktopAuthQR(showDesktopAuthQR === 'microsoft' ? null : 'microsoft')}
                        className={`flex-1 p-2 rounded border transition-all text-center ${showDesktopAuthQR === 'microsoft' ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                     >
                         <span className="text-xs font-bold block">{t('licenseManager.authApp.microsoft')}</span>
                         <span className="text-[9px] opacity-70 block">{t('licenseManager.authApp.download')}</span>
                     </button>
                </div>
                
                {showDesktopAuthQR && (
                    <div className="mt-3 text-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-white p-2 rounded-lg inline-block mx-auto mb-2">
                            {/* Local QR Code Generation - Replaces api.qrserver.com */}
                            <DesktopQRWrapper url={`${qrBaseUrl}?app=${showDesktopAuthQR}`} />
                        </div>
                        <p className="text-[10px] text-slate-400">
                            {t('licenseManager.register.scanNote')}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    const platform = os === 'android' ? 'android' : 'ios';

    return (
        <div className="flex gap-2 mt-2">
            <a href={links.google[platform]} target="_blank" rel="noreferrer" className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded p-1.5 text-center transition-colors">
                <span className="text-[10px] text-slate-200 block font-bold">{t('licenseManager.authApp.google')}</span>
                <span className="text-[8px] text-slate-400 block">{t('licenseManager.authApp.download')}</span>
            </a>
            <a href={links.microsoft[platform]} target="_blank" rel="noreferrer" className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded p-1.5 text-center transition-colors">
                <span className="text-[10px] text-slate-200 block font-bold">{t('licenseManager.authApp.microsoft')}</span>
                <span className="text-[8px] text-slate-400 block">{t('licenseManager.authApp.download')}</span>
            </a>
        </div>
    );
  };

  // Compact Badge (When Closed)
  if (!isUpgradeModalOpen) {
    const isPro = ['pro_real', 'pro_local', 'pro_temp'].includes(licenseType);
    const isLoggedIn = !!userNickname;
    
    let badgeClass = 'bg-amber-900/20 border-amber-500/50 text-amber-200';
    let icon = <Key size={18} className="text-amber-400" />;
    let text = t('licenseManager.status.activatePro');
    
    if (isPro) {
        if (licenseType === 'pro_temp') {
            badgeClass = 'bg-amber-900/90 border-amber-500 text-amber-100';
            icon = <ShieldCheck size={18} className="text-amber-400" />;
            text = t('licenseManager.status.tempPro');
        } else if (licenseType === 'pro_local') {
            badgeClass = 'bg-green-900/90 border-green-500 text-green-100';
            icon = <ShieldCheck size={18} className="text-green-400" />;
            text = t('licenseManager.status.proActive');
        } else {
            // Online Pro User
            badgeClass = 'bg-green-900/90 border-green-500 text-green-100';
            icon = <ShieldCheck size={18} className="text-green-400" />;
            text = t('licenseManager.status.proActive');
        }
    } else if (isLoggedIn) {
        // Logged in but no license (Free Tier)
        badgeClass = 'bg-slate-800 border-slate-600 text-slate-300';
        icon = <User size={18} className="text-slate-400" />;
        text = userNickname ? userNickname.substring(0, 10) : t('licenseManager.status.user');
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
        <div className="absolute top-2 right-2">
          <button onClick={() => setUpgradeModalOpen(false)} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="bg-amber-500/10 p-2 rounded-lg">
                <ShieldCheck className="text-amber-500" size={24} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-white">{t('licenseManager.modal.title')}</h2>
                <p className="text-xs text-slate-400">{t('licenseManager.modal.subtitle')}</p>
             </div>
          </div>

          {['pro_real', 'pro_local', 'pro_temp'].includes(licenseType) ? (
             <div className="space-y-4">
                 <div className={`p-4 rounded-lg border ${licenseType === 'pro_local' ? 'bg-green-900/20 border-green-500/50' : 'bg-amber-900/20 border-amber-500/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${licenseType === 'pro_local' ? 'text-green-400' : 'text-amber-400'}`}>
                            {licenseType === 'pro_local' ? t('licenseManager.status.hardwareKeyActive') : t('licenseManager.status.proLicenseActive')}
                        </span>
                        <CheckCircle size={16} className={licenseType === 'pro_local' ? 'text-green-400' : 'text-amber-400'} />
                    </div>
                    {licenseExpiry && (
                        <div className="text-xs text-slate-400">
                           {t('licenseManager.status.expiresIn')} <span className="text-white font-mono">{timeLeft}</span>
                           {isExpired && <span className="text-red-500 font-bold ml-2">({t('licenseManager.status.expired')})</span>}
                        </div>
                    )}
                 </div>

                 {licenseType !== 'pro_local' && (
                     <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300" onClick={logout}>
                        {t('licenseManager.modal.logout')}
                     </Button>
                 )}
             </div>
          ) : (
             <div className="space-y-4">
                 <div className="flex bg-slate-800 p-1 rounded-lg">
                     <button 
                        onClick={() => setMode('login')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'login' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                        {t('licenseManager.login.tab')}
                     </button>
                     <button 
                        onClick={() => setMode('register')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'register' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                        {t('licenseManager.register.tab')}
                     </button>
                 </div>

                 {mode === 'login' ? (
                     <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">{t('licenseManager.login.nickname')}</label>
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                                    placeholder={t('licenseManager.login.nicknamePlaceholder')}
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                />
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">{t('licenseManager.login.code')}</label>
                            <div className="relative">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-mono tracking-widest"
                                    placeholder={t('licenseManager.login.codePlaceholder')}
                                    value={totpToken}
                                    onChange={e => setTotpToken(e.target.value.replace(/[^0-9]/g, ''))}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                />
                            </div>
                         </div>
                         <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white mt-2" onClick={handleLogin} disabled={isLoading}>
                             {isLoading ? <Loader2 size={16} className="animate-spin" /> : t('licenseManager.login.button')}
                         </Button>
                     </div>
                 ) : (
                     <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                         {!registerData ? (
                             <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">{t('licenseManager.register.chooseNickname')}</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                                            placeholder={t('licenseManager.register.nicknamePlaceholder')}
                                            value={nickname}
                                            onChange={e => setNickname(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                                        />
                                    </div>
                                    
                                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <p className="text-[10px] text-amber-200 font-bold mb-1">
                                            {t('licenseManager.register.note')}
                                        </p>
                                        <p className="text-[10px] text-amber-500/80 leading-relaxed">
                                            {t('terms.sections.responsibilities.items.1')}
                                        </p>
                                    </div>
                                </div>

                                <AuthenticatorLinks />

                                <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white mt-2" onClick={handleRegister} disabled={isLoading}>
                                     {isLoading ? <Loader2 size={16} className="animate-spin" /> : t('licenseManager.register.button')}
                                </Button>
                             </>
                         ) : (
                             <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center animate-in zoom-in duration-300">
                                 <h3 className="text-sm font-bold text-white mb-2">Scan with Authenticator App</h3>
                                 <div className="bg-white p-2 rounded-lg inline-block mb-3">
                                    {qrCodeUrl ? (
                                       <img src={qrCodeUrl} alt="TOTP QR" className="w-32 h-32" />
                                    ) : (
                                       <div className="w-32 h-32 flex items-center justify-center text-black text-xs">Loading QR...</div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <AuthenticatorLinks />
                                </div>
                                
                                <div className="text-left bg-slate-900 p-2 rounded border border-slate-800 mb-3">
                                    <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Manual Entry Key</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 font-mono text-xs text-amber-400 break-all">{registerData.secret}</code>
                                        <button onClick={() => copyToClipboard(registerData.secret)} className="text-slate-400 hover:text-white">
                                            {localCopySuccess ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                 </div>

                                 <Button 
                                    size="sm" 
                                    className="w-full bg-green-600 hover:bg-green-500 text-white" 
                                    onClick={() => {
                                        setRegisterData(null);
                                        setMode('login');
                                        setSuccess('Key Saved! Please Login now.');
                                    }}
                                 >
                                     I Have Saved It, Go to Login
                                 </Button>
                             </div>
                         )}
                     </div>
                 )}

                 {error && (
                    <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <X size={12} className="text-red-400" />
                        {error}
                    </div>
                 )}
                 {success && (
                    <div className="p-2 bg-green-900/20 border border-green-500/30 rounded text-xs text-green-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={12} className="text-green-400" />
                        {success}
                    </div>
                 )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
