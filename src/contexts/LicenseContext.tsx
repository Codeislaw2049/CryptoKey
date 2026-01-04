import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { wasmManager } from '../wasm/wasmLoader';
import { getDeviceFingerprint } from '../utils/device';

interface LicenseContextType {
  isPro: boolean;
  userNickname: string | null;
  toggleLicense: () => void; // For testing/demo purposes
  licenseType: 'free' | 'pro_simulated' | 'pro_real' | 'pro_local' | 'pro_temp';
  licenseExpiry: number | null;
  activateLicense: (key: string) => boolean;
  verifyLicenseFile: (file: File) => Promise<boolean>;
  requestTOTP: (nickname: string) => Promise<any>;
  loginWithTOTP: (nickname: string, token: string) => Promise<boolean>;
  logout: () => void;
  triggerUpgrade: () => void;
  isUpgradeModalOpen: boolean;
  setUpgradeModalOpen: (open: boolean) => void;
  features: {
    maxRowCount: number;
    maxUploads: number;
    allowDuress: boolean;
    allowDualAuth: boolean;
    allowSharding: boolean;
    allowStreamScan: boolean;
    allowStrictMatching: boolean;
  };
}

export const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  // Default to free
  const [licenseType, setLicenseType] = useState<'free' | 'pro_simulated' | 'pro_real' | 'pro_local' | 'pro_temp'>('free');
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState<number | null>(null);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const isPro = licenseType !== 'free';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes
  const OFFLINE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 Hours

  // Persist state for dev convenience (only for simulated)
  useEffect(() => {
    // FORCE FREE ON INIT unless explicit valid license found
    
    const checkLicense = async () => {
        // Security Fix: Check if cache is expired on startup
        const cachedLicense = sessionStorage.getItem('cryptokey_real_license');
        const cachedExpiry = sessionStorage.getItem('cryptokey_license_expiry');

        if (cachedLicense && cachedExpiry) {
            const expiryTime = parseInt(cachedExpiry);
            if (Date.now() > expiryTime) {
                console.warn('[License] Cache expired, clearing...');
                sessionStorage.removeItem('cryptokey_real_license');
                sessionStorage.removeItem('cryptokey_last_active');
                sessionStorage.removeItem('cryptokey_license_expiry');
                setLicenseType('free');
                // Continue to allow other checks (like local .key file) to potentially upgrade it back
                // But for now, we've cleared the stale session
            } else {
                console.log('[License] Cache still valid, expires in', Math.floor((expiryTime - Date.now()) / 1000), 'seconds');
            }
        }

        // Monotonic Clock Check (Anti-Time Manipulation)
        // Only applies if we have a stored real license (Online Pro)
        const storedRealForCheck = sessionStorage.getItem('cryptokey_real_license');
        const isOnlinePro = storedRealForCheck && (storedRealForCheck.startsWith('AUTH:') || storedRealForCheck === 'TEMP_PRO_ACTIVATED');
        
        if (isOnlinePro) {
            const lastSeen = localStorage.getItem('cryptokey_sys_clock_check');
            const now = Date.now();
            if (lastSeen && now < parseInt(lastSeen)) {
                console.error("System time manipulation detected. Clock moved backwards.");
                alert(t('license.alerts.systemClockError'));
                logout();
                return;
            }
            localStorage.setItem('cryptokey_sys_clock_check', now.toString());
        }

        let newType: 'free' | 'pro_simulated' | 'pro_real' | 'pro_local' | 'pro_temp' = 'free';

        // 0. Auto-Read License Key (ROM/USB Strategy)
        // REMOVED: File-based license check is insecure for web/online usage.
        // Offline versions should inject license state via hardware binding (see Offline_Version_Guide.md).
        
        // NEW: Offline License Injection via Global Variable
        // This allows the Electron/C++ shell to inject the license status directly.
        // See: docs/Offline_Version_Guide.md
        const offlineLicense = (window as any).CRYPTOKEY_OFFLINE_LICENSE;
        if (offlineLicense && offlineLicense.isPro) {
            console.log('[License] Offline Hardware License Detected:', offlineLicense.hardwareId);
            setLicenseType('pro_local');
            return; // Skip other checks
        }

        // 1. Check Real License (SessionStorage - Cleared on Browser Close)
        const storedReal = sessionStorage.getItem('cryptokey_real_license');
        const lastActive = sessionStorage.getItem('cryptokey_last_active');
        const storedExpiry = sessionStorage.getItem('cryptokey_license_expiry');
        
        if (storedReal) {
           // Check Timeout
           const now = Date.now();
           if (lastActive && (now - parseInt(lastActive) > SESSION_TIMEOUT_MS)) {
               console.warn("Session expired");
               sessionStorage.removeItem('cryptokey_real_license');
               sessionStorage.removeItem('cryptokey_last_active');
               sessionStorage.removeItem('cryptokey_license_expiry');
               setLicenseExpiry(null);
           } else {
               // Verify if it's an authenticated session
               if (storedReal.startsWith('AUTH:')) {
                   const nickname = storedReal.replace('AUTH:', '');
                   
                   setUserNickname(nickname);
                   sessionStorage.setItem('cryptokey_last_active', now.toString());
                   
                   // Check if stored expiry exists and is valid
                   if (storedExpiry) {
                       const expiry = parseInt(storedExpiry);
                       setLicenseExpiry(expiry);
                       if (expiry > now) {
                           newType = 'pro_real';
                           
                           // Offline Grace Period Check
                           const lastOnlineCheck = localStorage.getItem('cryptokey_last_online_check');
                           if (!lastOnlineCheck || (now - parseInt(lastOnlineCheck) > OFFLINE_GRACE_PERIOD_MS)) {
                               // Force check if grace period exceeded
                               try {
                                   const controller = new AbortController();
                                   const timeoutId = setTimeout(() => controller.abort(), 5000);
                                   const sessionToken = sessionStorage.getItem('cryptokey_session_token');
                                   const deviceFingerprint = await getDeviceFingerprint();
                                            
                                   const res = await fetch('/api/get-license', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ nickname, token: sessionToken, deviceFingerprint }),
                                       signal: controller.signal
                                   });
                                   clearTimeout(timeoutId);
        
                                   if (res.ok) {
                                       const data = await res.json();
                                       if (data.success && data.license?.is_pro) {
                                           localStorage.setItem('cryptokey_last_online_check', now.toString());
                                       } else {
                                           console.warn("Grace period check failed: License invalid");
                                           newType = 'free'; // Revoke
                                       }
                                   } else {
                                        // Server reachable but error? If 500, maybe keep. If 401/403, revoke.
                                        // For safety, if we can't verify after grace period, we revoke.
                                        console.warn("Grace period check failed: Server error");
                                        newType = 'free';
                                   }
                               } catch (e) {
                                   console.warn("Grace period check failed: Network unreachable");
                                   // If network is unreachable AND grace period exceeded, strictly speaking we should revoke.
                                   // User requirement: "Force max offline grace period".
                                   newType = 'free';
                               }
                           }

                       } else {
                           // Expired?
                           // Wait, if it's an admin/lifetime without expiry, storedExpiry might not be set or set to far future.
                           // If storedExpiry is missing but we are AUTHed, we should re-verify.
                           newType = 'free'; 
                       }
                   } else {
                       // If authenticated but no expiry info, check backend
                       // This handles cases like Admin Login where expiry might not be strictly set in session storage yet
                       try {
                           const controller = new AbortController();
                           const timeoutId = setTimeout(() => controller.abort(), 3000);
                           const sessionToken = sessionStorage.getItem('cryptokey_session_token');
                           const deviceFingerprint = await getDeviceFingerprint();
                                    
                           const res = await fetch('/api/get-license', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ nickname, token: sessionToken, deviceFingerprint }),
                               signal: controller.signal
                           });
                           clearTimeout(timeoutId);

                           if (res.ok) {
                               const data = await res.json();
                               if (!data.success && (data.error === 'SESSION_INVALID' || data.error === 'SESSION_MISSING')) {
                                   // KV Propagation Check again
                                   const loginTs = sessionStorage.getItem('cryptokey_login_timestamp');
                                   if (loginTs && (Date.now() - parseInt(loginTs) < 15000)) {
                                       console.warn("Session check failed but within grace period. Ignoring.");
                                       return;
                                   } else {
                                       console.warn("Session invalid, logging out.");
                                       logout(); // Use helper
                                       newType = 'free';
                                   }
                               } else if (data.success && data.license?.is_pro) {
                                   newType = 'pro_real';
                                   if (data.license.expiry) {
                                       setLicenseExpiry(data.license.expiry);
                                       sessionStorage.setItem('cryptokey_license_expiry', data.license.expiry.toString());
                                   }
                               }
                           }
                       } catch (e) {
                           console.warn("Background license sync failed/timed out, defaulting to free");
                           newType = 'free'; 
                       }
                    }
                } else if (storedReal === 'OFFLINE_KEY_ACTIVATED') {
                   newType = 'pro_local';
                   sessionStorage.setItem('cryptokey_last_active', now.toString());
               } else if (storedReal === 'TEMP_PRO_ACTIVATED') {
                    // Check 24h timeout specifically for temp pro
                    if (storedExpiry) {
                        const expiry = parseInt(storedExpiry);
                        setLicenseExpiry(expiry);
                        if (expiry > now) {
                            newType = 'pro_temp';
                            sessionStorage.setItem('cryptokey_last_active', now.toString());

                            // Verify Temp Token with Backend
                            const tempToken = sessionStorage.getItem('cryptokey_temp_token');
                            if (tempToken) {
                                try {
                                    const controller = new AbortController();
                                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                                    const deviceFingerprint = await getDeviceFingerprint();
                                    
                                    const res = await fetch('/api/get-license', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ tempToken, deviceFingerprint }), 
                                        signal: controller.signal
                                    });
                                    clearTimeout(timeoutId);

                                    if (res.ok) {
                                        const data = await res.json();
                                        if (!data.success) {
                                            console.warn("Temp license invalid/expired, removing.");
                                            newType = 'free';
                                            sessionStorage.removeItem('cryptokey_real_license');
                                            sessionStorage.removeItem('cryptokey_temp_token');
                                        }
                                    }
                                } catch (e) {
                                    // Network error, keep existing state if within expiry
                                }
                            }

                        } else {
                            newType = 'free';
                        }
               }
           }
        }
    } 
    
    // 2. Check Dev/Simulated License (Only if not real)
        if (newType === 'free') {
            const stored = localStorage.getItem('cryptokey_dev_pro_status');
            if (stored === 'true') {
               newType = 'pro_simulated';
            }
        }
        
        setLicenseType(newType);
    };

    checkLicense();

    // -----------------------------------------------------------
    // OFFLINE MODE / USB KEY AUTO-ACTIVATION
    // Controlled by: VITE_LICENSE_AUTO_CHECK
    // If 'true', skips online validation for local checks and polls periodically.
    // -----------------------------------------------------------
    const enableAutoCheck = import.meta.env.VITE_LICENSE_AUTO_CHECK === 'true';
    let intervalId: NodeJS.Timeout | null = null;

    if (enableAutoCheck) {
         const intervalMs = parseInt(import.meta.env.VITE_LICENSE_CHECK_INTERVAL || '1000');
         intervalId = setInterval(checkLicense, intervalMs);
    }

    const handleFocus = () => {
        checkLicense();
    };
    window.addEventListener('focus', handleFocus);
    
    const updateActivity = () => {
        if (sessionStorage.getItem('cryptokey_real_license')) {
            sessionStorage.setItem('cryptokey_last_active', Date.now().toString());
        }
    };
    
    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);
    
    return () => {
        if (intervalId) clearInterval(intervalId);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('click', updateActivity);
        window.removeEventListener('keydown', updateActivity);
    };
  }, []);

  // Periodic USB Check (Security Fix for Offline Version)
  useEffect(() => {
    if (licenseType === 'pro_local') {
      // Check if running in Tauri context
      const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
      
      if (isTauri) {
        const invoke = (window as any).__TAURI__.invoke;
        console.log("[License] Starting periodic USB check...");
        
        const checkInterval = setInterval(async () => {
          try {
            // Call the new Rust command
            const result: any = await invoke('check_usb_present');
            if (result && result.present === false) {
              console.warn("[License] ⚠️ USB Key removed, disabling Pro features");
              setLicenseType('free');
              sessionStorage.removeItem('cryptokey_real_license');
              sessionStorage.removeItem('cryptokey_license_expiry');
              alert(t('license.alerts.usbRemoved') || 'USB Key has been removed. Pro features have been disabled.');
            }
          } catch (e) {
            // If command doesn't exist (e.g. running in web mode), ignore
          }
        }, 30000); // Check every 30 seconds

        return () => {
          console.log("[License] Stopping USB check");
          clearInterval(checkInterval);
        };
      }
    }
  }, [licenseType, t]);

  const toggleLicense = () => {
    if (licenseType === 'pro_real') {
        if (confirm(t('license.alerts.deactivateConfirm'))) {
            logout();
        }
        return;
    }

    const newState = licenseType === 'free' ? 'pro_simulated' : 'free';
    setLicenseType(newState);
    localStorage.setItem('cryptokey_dev_pro_status', String(newState === 'pro_simulated'));
    console.log(`License switched to: ${newState}`);
  };

  const logout = () => {
      setLicenseType('free');
      setUserNickname(null);
      setLicenseExpiry(null);
      sessionStorage.removeItem('cryptokey_real_license');
      sessionStorage.removeItem('cryptokey_last_active');
      sessionStorage.removeItem('cryptokey_license_expiry');
      sessionStorage.removeItem('cryptokey_session_token');
      localStorage.removeItem('cryptokey_real_license'); 
  };

  const triggerUpgrade = () => {
      setUpgradeModalOpen(true);
  };

  const activateLicense = (_key: string): boolean => {
    console.warn("Manual key activation is deprecated. Please use Login.");
    return false;
  };

  const verifyLicenseFile = async (file: File): Promise<boolean> => {
      try {
          const text = await file.text();
          let isValid = false;

          try {
              const json = JSON.parse(text);
              if (json.content && json.signature) {
                  // NEW LOGIC: Priority to WASM in PROD
                  if (import.meta.env.PROD) {
                      if (wasmManager.isReady()) {
                          const exports = wasmManager.getExports();
                          if (exports && exports.verify_license_wasm) {
                              const contentStr = typeof json.content === 'string' ? json.content : JSON.stringify(json.content);
                              isValid = exports.verify_license_wasm(contentStr, json.signature);
                          }
                      } else {
                          console.error("WASM not ready in PROD for license verification");
                          // Fail open or closed? Closed.
                          isValid = false;
                      }
                  } else {
                      // DEV: Try JS first, then WASM
                      const { verifyLicenseSignature } = await import('../utils/licenseVerification');
                      isValid = await verifyLicenseSignature(json.content, json.signature);
                      
                      if (!isValid && wasmManager.isReady()) {
                          const exports = wasmManager.getExports();
                          if (exports && exports.verify_license_wasm) {
                              const contentStr = typeof json.content === 'string' ? json.content : JSON.stringify(json.content);
                              if (exports.verify_license_wasm(contentStr, json.signature)) {
                                  isValid = true;
                              }
                          }
                      }
                  }
              }
          } catch (e) {
              console.warn("JSON parse failed, checking legacy binary...", e);
          }
          
          if (!isValid) {
              // Legacy check logic if needed
          }

          if (isValid) {
             setLicenseType('pro_local');
             sessionStorage.setItem('cryptokey_real_license', 'OFFLINE_KEY_ACTIVATED');
             sessionStorage.setItem('cryptokey_last_active', Date.now().toString());
          }
          return isValid;

      } catch (e) {
          console.error("License file verify error", e);
          return false;
      }
  };

  const requestTOTP = async (nickname: string): Promise<any> => {
    try {
      // API call to backend to register/get secret
      // Mock for now if no backend:
      // return { success: true, data: { secret: 'JBSWY3DPEHPK3PXP', otpauth: 'otpauth://totp/CryptoKey:user?secret=JBSWY3DPEHPK3PXP&issuer=CryptoKey' } };
      
      const referralCode = sessionStorage.getItem('cryptokey_referral_code');

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, referralCode })
      });
      const data = await response.json();
      
      return data;
    } catch (e) {
      console.error("TOTP request failed", e);
      return { success: false, error: 'Network error' };
    }
  };

  const loginWithTOTP = async (nickname: string, token: string): Promise<boolean> => {


    try {
      const normalizedNickname = nickname.trim();
      const deviceFingerprint = await getDeviceFingerprint();

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: normalizedNickname, totpCode: token, deviceFingerprint })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        // Login Successful
        setUserNickname(normalizedNickname);
        sessionStorage.setItem('cryptokey_real_license', `AUTH:${normalizedNickname}`);
        sessionStorage.setItem('cryptokey_last_active', Date.now().toString());
        
        if (data.token) {
            sessionStorage.setItem('cryptokey_session_token', data.token);
            sessionStorage.setItem('cryptokey_login_timestamp', Date.now().toString());
        }

        // CRITICAL FIX: Optimistically set Pro state if backend confirms
        if (data.user && data.user.is_pro) {
             setLicenseType('pro_real');
             if (data.user.expiry) {
                 setLicenseExpiry(data.user.expiry);
                 sessionStorage.setItem('cryptokey_license_expiry', data.user.expiry.toString());
             } else {
                 // If no expiry (e.g. Admin or Lifetime), don't set expire time, but ensure Pro
                 // We can set a fake far-future expiry for session storage consistency if needed, 
                 // but checking is_pro is enough.
                 // Clear any old expiry
                 sessionStorage.removeItem('cryptokey_license_expiry');
                 setLicenseExpiry(null); 
             }
        } else {
             setLicenseType('free');
        }

        return true;
      }
      return false;
    } catch (e) {
      console.error("TOTP login failed", e);
      return false;
    }
  };

  return (
    <LicenseContext.Provider value={{ 
      isPro, 
      userNickname,
      toggleLicense, 
      licenseType, 
      licenseExpiry,
      activateLicense,
      verifyLicenseFile,
      loginWithTOTP,
      requestTOTP,
      logout,
      triggerUpgrade,
      isUpgradeModalOpen,
      setUpgradeModalOpen,
      features: {
        maxRowCount: isPro ? 1000 : 100, 
        maxUploads: isPro ? 100 : 3,
        allowDuress: isPro,
        allowDualAuth: isPro,
        allowSharding: isPro,
        allowStreamScan: isPro,
        allowStrictMatching: isPro
      }
    }}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};
