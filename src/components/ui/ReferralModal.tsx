import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Share2, CheckCircle, Lock } from 'lucide-react';
import { LicenseContext } from '../../contexts/LicenseContext';

interface ReferralData {
  code: string;
  count: number;
  pro: boolean;
  earned_hours: number;
}

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const context = useContext(LicenseContext);
  const userNickname = context?.userNickname;

  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!userNickname) {
        setError(t('referral.loginRequired') || "Please register/login to invite friends.");
        setData(null);
      } else if (context?.licenseType === 'pro_local') {
        setError(t('referral.localPro') || "You are using a Permanent PRO license (USB Key). You do not need this feature.");
        setData(null);
      } else {
        loadReferralData();
      }
    }
  }, [isOpen, userNickname, context?.licenseType]);

  const loadReferralData = async () => {
    if (!userNickname) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/referral-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: userNickname })
      });
      
      const text = await response.text();
      if (!text) {
          throw new Error(t('errors.emptyResponse') || 'Empty response from server');
      }
      const res = JSON.parse(text);
      
      if (res.success) {
        const earned = res.data.earned_hours || 0;
        // Block Paid Pro users (who have not earned hours via invites)
        // If they have earned hours, they are "Invite Pro" and can continue.
        if (context?.licenseType === 'pro_real' && earned === 0) {
            setError(t('referral.alreadyPro') || "You are already a PRO user. This feature is for new or expired users.");
            setData(null);
            return;
        }

        setData({
          code: res.data.code,
          count: res.data.count,
          pro: res.data.pro,
          earned_hours: earned
        });
      } else {
        setError(res.message || res.error || t('errors.loadFailed') || "Failed to load referral data");
      }
    } catch (err) {
      console.error('Referral load error:', err);
      setError(t('errors.networkError') || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!data) return;
    const link = `${window.location.origin}?ref=${data.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden bg-slate-900 border border-slate-700 rounded-xl p-6 text-left shadow-2xl transition-all max-w-md w-full animate-in fade-in zoom-in duration-200">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
          >
            ✕
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/20 rounded-full text-primary">
              <Share2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">{t('referral.title')}</h2>
          </div>

        <p className="text-slate-300 mb-6">
          {t('referral.desc') || "Invite 3 friends to unlock 1 hour of PRO features! (Max 24 hours)"}
        </p>

        {loading ? (
          <div className="text-center py-8 text-slate-400">
            {t('common.loading')}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">
            <div className="p-3 bg-slate-700 rounded-full text-slate-400">
               <Lock size={24} />
            </div>
            <p className="text-slate-400 text-center">{error}</p>
            {!userNickname && (
                <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-primary text-slate-900 font-bold rounded hover:bg-primary/90 transition-colors"
                >
                    {t('common.close') || "Close"}
                </button>
            )}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                {t('referral.yourCode')}
              </div>
              <div className="text-2xl font-mono font-bold text-primary tracking-widest break-all">
                {data.code}
              </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
               <div className="flex justify-between items-center mb-2">
                   <span className="text-slate-300 text-sm">
                     {t('referral.stats', { count: data.count })}
                   </span>
                   <span className="text-emerald-400 text-sm font-bold">
                       {t('referral.earned', { hours: data.earned_hours }) || `${data.earned_hours}h / 24h Earned`}
                   </span>
               </div>
               
               {/* Progress to next hour */}
               <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary/20">
                        {t('referral.nextReward') || 'Next Reward'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-primary">
                        {t('referral.progress', { current: data.count % 3, total: 3 }) || `${data.count % 3} / 3`}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700">
                    <div style={{ width: `${(data.count % 3) / 3 * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"></div>
                  </div>
                </div>

               {data.pro ? (
                 <div className="flex items-center gap-2 text-green-400 font-bold text-sm mt-2 p-2 bg-green-400/10 rounded">
                   <CheckCircle size={16} />
                   <span>{t('referral.unlocked') || "PRO Active"}</span>
                 </div>
               ) : null}
            </div>

            <button
              onClick={copyLink}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
              {copied ? t('common.copied') : t('referral.copyLink')}
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
};
