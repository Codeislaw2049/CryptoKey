import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ProBadge } from '../ui/ProBadge';
import { Mail, CheckCircle, Eye, EyeOff, AlertTriangle, Download, Printer, Copy, Monitor } from 'lucide-react';
import { QRCodeGenerator } from '../QRCodeGenerator';
import { sendEmailWithAttachment } from '../../utils/emailUtils';
import ShardDualAuthGenerator from '../ShardDualAuthGenerator';
import { useLicense } from '../../contexts/LicenseContext';

export interface ResultStepProps {
  result: {
    ciphertext: string;
    hash: string;
    realRowIndex: number;
    password?: string;
  };
  mnemonic?: string;
  onReset: () => void;
}

export const ResultStep: React.FC<ResultStepProps> = ({ result, mnemonic, onReset }) => {
  const { t } = useTranslation();
  const { features, triggerUpgrade } = useLicense();
  const [showRealIndex, setShowRealIndex] = useState(false);
  const [mode, setMode] = useState<'personal' | 'public'>('personal');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showDualAuth, setShowDualAuth] = useState(false);

  if (showDualAuth) {
    return (
      <ShardDualAuthGenerator
        mnemonic={mnemonic || ''}
        ciphertext={result.ciphertext}
        hash={result.hash}
        password={result.password}
        lineNumber={result.realRowIndex + 1}
        onBack={() => setShowDualAuth(false)}
      />
    );
  }

  const handleEmail = () => {
    sendEmailWithAttachment(result.ciphertext, result.hash);
  };

  const handleDownload = () => {
    const fileContent = `${t('resultStep.fileContent.header')}
${t('resultStep.fileContent.ciphertext')}
${result.ciphertext}

${t('resultStep.fileContent.hash')}
${result.hash}

---
${t('resultStep.fileContent.footer')}
${t('resultStep.fileContent.generated', { date: new Date().toLocaleString() })}
${t('resultStep.fileContent.note')}
`;
    const blob = new Blob([fileContent], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cryptokey_backup_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>CryptoKey Backup</title>
            <style>
              body { font-family: monospace; padding: 40px; }
              h1 { border-bottom: 2px solid #000; padding-bottom: 10px; }
              .box { border: 1px solid #ccc; padding: 20px; margin: 20px 0; word-break: break-all; }
              .footer { margin-top: 40px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h1>${t('resultStep.print.title')}</h1>
            <p><strong>Hash:</strong> ${result.hash}</p>
            <div class="box">
              <strong>Ciphertext:</strong><br/><br/>
              ${result.ciphertext}
            </div>
            <p class="footer">${t('resultStep.watermark', { date: new Date().toLocaleString() })}</p>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleCopy = async () => {
    const textToCopy = t('resultStep.clipboard.labels', { ciphertext: result.ciphertext, hash: result.hash });
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-2">
          <CheckCircle size={16} />
          {t('wizard.resultStep.success.banner')}
        </div>
        <h2 className="text-3xl font-black text-white">{t('wizard.resultStep.success.title')}</h2>
        <p className="text-slate-400">{t('wizard.resultStep.success.subtitle')}</p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-900/50 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setMode('personal')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === 'personal' 
              ? 'bg-slate-700 text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye size={14} />
            {t('wizard.resultStep.mode.personal')}
          </button>
          <button
            onClick={() => setMode('public')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              mode === 'public' 
              ? 'bg-primary text-slate-900 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor size={14} />
            {t('wizard.resultStep.mode.public')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Critical Secrets (Only in Personal Mode) */}
        <div className={`space-y-4 ${mode === 'public' ? 'opacity-20 pointer-events-none blur-sm select-none' : ''} transition-all duration-500`}>
          
          {/* Real Index Card */}
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-6 relative overflow-hidden group hover:border-primary/40 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle size={100} />
            </div>
            
            <h3 className="text-sm font-bold text-primary mb-1 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} />
              {t('wizard.resultStep.realIndex.title')}
            </h3>

            <div className="flex items-center gap-4 my-4">
              <div className="text-5xl font-black text-white tracking-tighter">
                {showRealIndex ? result.realRowIndex + 1 : "**"}
              </div>
              <button
                onClick={() => setShowRealIndex(!showRealIndex)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                {showRealIndex ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <p className="text-xs text-primary/80 font-medium">
              {t('wizard.resultStep.realIndex.help')}
            </p>
          </div>

          {/* Mnemonic Display (If applicable) */}
          {mnemonic && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
               <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">{t('wizard.resultStep.mnemonic.title')}</h3>
               <p className="font-mono text-sm text-slate-300 break-words leading-relaxed">
                  {showRealIndex ? mnemonic : "•".repeat(mnemonic.length)}
               </p>
            </div>
          )}

        </div>

        {/* Right: Public Safe Data */}
        <div className="space-y-4">
          
          {/* Hash */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <label className="text-xs font-bold text-slate-500 mb-1 block">{t('wizard.resultStep.hash.label')}</label>
            <code className="block w-full bg-black/30 p-2 rounded text-xs text-emerald-400 font-mono break-all">
              {result.hash}
            </code>
          </div>

          {/* Ciphertext Actions */}
          <div className="grid grid-cols-2 gap-3">
             <Button variant="outline" onClick={handleCopy} className="h-auto py-3 flex-col gap-1 text-xs">
                {copyFeedback ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                {copyFeedback ? t('wizard.resultStep.actions.copied') : t('wizard.resultStep.actions.copy')}
             </Button>
             <Button variant="outline" onClick={handleDownload} className="h-auto py-3 flex-col gap-1 text-xs">
                <Download size={18} />
                {t('wizard.resultStep.actions.download')}
             </Button>
             <Button variant="outline" onClick={handleEmail} className="h-auto py-3 flex-col gap-1 text-xs">
                <Mail size={18} />
                {t('wizard.resultStep.actions.email')}
             </Button>
             <Button variant="outline" onClick={handlePrint} className="h-auto py-3 flex-col gap-1 text-xs">
                <Printer size={18} />
                {t('wizard.resultStep.actions.print')}
             </Button>
          </div>
          
          <Button
             variant="primary"
             onClick={() => features.allowDualAuth ? setShowDualAuth(true) : triggerUpgrade()}
             className={`w-full py-4 font-bold shadow-lg relative overflow-hidden group ${
               features.allowDualAuth
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed hover:bg-slate-800'
             }`}
             title={!features.allowDualAuth ? t('wizard.resultStep.dualAuth.pro') : ""}
          >
             <span className="flex items-center justify-center gap-2">
               {t('wizard.resultStep.dualAuth.button')}
               <div className="scale-110"><ProBadge /></div>
             </span>
          </Button>

          {/* QR Code */}
          <div className="flex justify-center items-center mt-6">
             <div className="w-full">
                <QRCodeGenerator ciphertext={result.ciphertext} hash={result.hash} />
             </div>
          </div>

        </div>
      </div>

      <div className="pt-8 border-t border-slate-800/50 flex justify-center">
        <Button variant="ghost" onClick={onReset} className="text-slate-500 hover:text-white">
          {t('wizard.resultStep.reset')}
        </Button>
      </div>

    </div>
  );
};
