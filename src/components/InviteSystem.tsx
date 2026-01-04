import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getIdentity, setInviter, UserIdentity } from '../utils/identity';
import { Copy, UserPlus, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useLicense } from '../contexts/LicenseContext';

export const InviteSystem = () => {
  const { t } = useTranslation();
  const { userNickname } = useLicense();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const localIdentity = getIdentity();
    setIdentity(localIdentity);

    if (userNickname) {
      // Optimistically set invite code to nickname as they are same in backend
      setIdentity(prev => prev ? { ...prev, inviteCode: userNickname } : null);

      fetch('/api/referral-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: userNickname })
      })
      .then(res => res.json())
      .then(data => {
          if (data.success && data.data.code) {
              setIdentity(prev => prev ? { ...prev, inviteCode: data.data.code } : null);
          }
      })
      .catch(console.error);
    }
  }, [userNickname]);

  const handleCopy = () => {
    if (identity?.inviteCode) {
      navigator.clipboard.writeText(identity.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = () => {
    setMessage(null);
    if (!inputCode.trim()) return;

    const result = setInviter(inputCode.trim().toUpperCase());
    if (result) {
      setMessage({ type: 'success', text: t('invite.success', 'Invite code accepted!') });
      setIdentity(getIdentity()); // Refresh
    } else {
      const { inviteCode } = getIdentity();
      if (inputCode.trim().toUpperCase() === inviteCode) {
        setMessage({ type: 'error', text: t('invite.self', 'You cannot invite yourself') });
      } else {
        setMessage({ type: 'error', text: t('invite.invalid', 'Invalid invite code') });
      }
    }
  };

  if (!identity) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
               <UserPlus className="text-primary" />
               {t('invite.title', 'Invite System')}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{t('invite.subtitle', 'Share your code and invite friends')}</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* My Invite Code Card */}
         <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
               <Share2 size={18} />
               {t('invite.myCode', 'My Invite Code')}
            </div>
            <div className="flex items-center gap-2">
               <div className="flex-1 bg-black/40 border border-slate-600 rounded-lg p-3 text-center text-xl font-mono tracking-widest text-primary">
                 {identity.inviteCode}
               </div>
               <Button onClick={handleCopy} className="h-[54px] w-[54px] p-0 flex items-center justify-center bg-slate-700 hover:bg-slate-600">
                 {copied ? <CheckCircle className="text-green-400" /> : <Copy className="text-slate-300" />}
               </Button>
            </div>
            <p className="text-xs text-slate-500 text-center">
              {t('invite.shareDesc', 'Share this code with your friends to invite them.')}
            </p>
         </div>

         {/* Enter Inviter Code Card */}
         <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
               <UserPlus size={18} />
               {t('invite.enterCode', "Enter Inviter's Code")}
            </div>
            
            {identity.inviterId ? (
               <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
                  <p className="text-green-400 text-sm mb-1">{t('invite.alreadySet', 'Inviter already set')}</p>
                  <p className="text-xl font-mono tracking-widest text-white">{identity.inviterId}</p>
               </div>
            ) : (
               <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder={t('invite.placeholder') || 'ABC12345'}
                      maxLength={8}
                      className="flex-1 bg-black/40 border border-slate-600 rounded-lg p-3 text-center text-lg font-mono tracking-widest text-white placeholder:text-slate-700 focus:ring-1 focus:ring-primary outline-none uppercase"
                    />
                    <Button onClick={handleSubmit} disabled={!inputCode} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-slate-900 font-bold">
                       {t('invite.submit', 'Submit')}
                    </Button>
                  </div>
                  {message && (
                    <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                       {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                       {message.text}
                    </div>
                  )}
               </div>
            )}
         </div>
       </div>
    </div>
  );
};
