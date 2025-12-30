import React, { useState } from 'react';
import { ShieldCheck, Loader2, XCircle, ExternalLink } from 'lucide-react';
import { APP_VERSION } from '../../version';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

export const IntegrityCheck: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'checking' | 'verified' | 'failed' | 'warning'>('idle');
  const [details, setDetails] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  const REPO_OWNER = 'Codeislaw2049';
  const REPO_NAME = 'cryptokey_im';

  const calculateHash = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyIntegrity = async () => {
    if (!import.meta.env.PROD) {
      setStatus('warning');
      setDetails([t('integrityCheck.devModeWarning'), t('integrityCheck.devModeDesc')]);
      setShowModal(true);
      return;
    }

    setStatus('checking');
    setDetails([]);
    setShowModal(true);
    const logs: string[] = [];

    try {
      // 1. Fetch Official Checksums from GitHub
      logs.push(t('integrityCheck.fetching', { version: APP_VERSION }));
      const checksumUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${APP_VERSION}/sha256sums.txt`;
      
      let remoteChecksums = '';
      try {
        const response = await fetch(checksumUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        remoteChecksums = await response.text();
        logs.push(t('integrityCheck.log.receivedChecksums'));
      } catch (e) {
        console.warn(e);
        logs.push(t('integrityCheck.log.corsBlocked'));
        logs.push('   ' + t('integrityCheck.log.corsReason1'));
        logs.push('   ' + t('integrityCheck.log.corsReason2'));
        logs.push('   ' + t('integrityCheck.log.corsReason3'));
        // Don't fail the whole check, just warn
        setStatus('warning');
      }

      const checksumMap = new Map<string, string>();
      if (remoteChecksums) {
        remoteChecksums.split('\n').forEach(line => {
          const [hash, file] = line.trim().split(/\s+/);
          if (hash && file) {
            // file usually comes as "assets/index.js" or "./assets/index.js"
            const normalizedFile = file.replace(/^\.\//, '').replace(/^\//, '');
            checksumMap.set(normalizedFile, hash);
          }
        });
      }

      // 2. Identify Local Assets
      const assetsToCheck: string[] = [];
      
      // Main Entry point (HTML)
      assetsToCheck.push('index.html');
      
      // Scripts and Styles
      document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach((el) => {
        const src = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
        if (src) {
           try {
             const url = new URL(src);
             if (url.origin === window.location.origin) {
               // Get path relative to root
               const path = url.pathname.substring(1); // remove leading slash
               if (path && !path.startsWith('vite/')) {
                  assetsToCheck.push(path);
               }
             }
           } catch (e) { /* ignore invalid urls */ }
        }
      });

      // 3. Verify Each Asset
      let allMatch = true;
      let checkedCount = 0;

      for (const path of assetsToCheck) {
        logs.push(t('integrityCheck.verifying', { path }));
        try {
          const res = await fetch('/' + path);
          if (!res.ok) throw new Error(t('integrityCheck.failedToLoad'));
          const blob = await res.blob();
          const hash = await calculateHash(blob);
          
          if (checksumMap.size > 0) {
             const expectedHash = checksumMap.get(path);
             if (expectedHash) {
               if (expectedHash === hash) {
                 logs.push(t('integrityCheck.log.fileVerified', { path }));
               } else {
                 logs.push(t('integrityCheck.log.hashMismatch', { path }));
                 logs.push(`   Expected: ${expectedHash}`);
                 logs.push(`   Calculated: ${hash}`);
                 allMatch = false;
               }
             } else {
               // File exists locally but not in checksums (could be okay if it's dynamic, but suspicious)
               // Or maybe the path mapping is wrong
               logs.push(t('integrityCheck.log.noChecksum', { path }));
               logs.push(`   Calculated: ${hash}`);
             }
          } else {
             // No remote checksums, just show local hash
             logs.push(t('integrityCheck.info', { path }));
             logs.push(t('integrityCheck.hash', { hash }));
          }
          checkedCount++;
        } catch (e) {
          logs.push(t('integrityCheck.couldNotVerify', { path, error: (e as Error).message }));
        }
      }

      setDetails(logs);
      
      if (checksumMap.size === 0) {
        setStatus('warning');
      } else if (allMatch && checkedCount > 0) {
        setStatus('verified');
      } else {
        setStatus('failed');
      }

    } catch (error) {
      console.error(error);
      setStatus('failed');
      setDetails(prev => [...prev, t('integrityCheck.criticalError', { error: (error as Error).message })]);
    }
  };

  return (
    <>
      <button
        onClick={verifyIntegrity}
        className="text-slate-500 hover:text-primary transition-colors flex items-center gap-1 text-xs mx-auto"
        title={t('integrityCheck.title')}
      >
        <ShieldCheck size={14} />
        {t('integrityCheck.buttonLabel')}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className={
                  status === 'verified' ? 'text-green-500' :
                  status === 'failed' ? 'text-red-500' :
                  status === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                } />
                {t('integrityCheck.modalTitle')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto font-mono text-xs space-y-2 bg-black/50">
              {details.map((log, i) => (
                <div key={i} className={`
                  ${log.includes('✅') ? 'text-green-400' : ''}
                  ${log.includes('❌') ? 'text-red-500 font-bold' : ''}
                  ${log.includes('⚠️') || log.includes('❓') ? 'text-yellow-400' : ''}
                  ${!log.match(/[✅❌⚠️❓]/) ? 'text-slate-400' : ''}
                  break-all
                `}>
                  {log}
                </div>
              ))}
              
              {status === 'checking' && (
                <div className="flex items-center gap-2 text-blue-400 mt-4">
                  <Loader2 className="animate-spin" size={16} />
                  {t('integrityCheck.calculating')}
                </div>
              )}

              {status === 'warning' && details.length === 0 && (
                 <div className="text-yellow-400">
                    {t('integrityCheck.connectionError')}
                 </div>
              )}

              {/* Manual Verification Guide */}
              {status === 'warning' && (
                <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700 text-xs text-slate-300">
                  <p className="font-bold text-white mb-1">{t('integrityCheck.manual.title')}</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li dangerouslySetInnerHTML={{ __html: t('integrityCheck.manual.step1') }} />
                    <li dangerouslySetInnerHTML={{ __html: t('integrityCheck.manual.step2') }} />
                    <li>{t('integrityCheck.manual.step3')}</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center">
               <a
                 href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
               >
                 {t('integrityCheck.viewRelease')} <ExternalLink size={12} />
               </a>
               <Button onClick={() => setShowModal(false)} size="sm">
                 {t('common.close')}
               </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
