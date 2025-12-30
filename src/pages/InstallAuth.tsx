import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const InstallAuth = () => {
  const { t } = useTranslation();
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

    const params = new URLSearchParams(window.location.search);
    const app = params.get('app'); // 'google' or 'microsoft'

    let url = "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"; // Default

    if (app === 'microsoft') {
        if (isAndroid) url = "https://play.google.com/store/apps/details?id=com.azure.authenticator";
        else if (isIOS) url = "https://apps.apple.com/us/app/microsoft-authenticator/id983156458";
        else url = "https://www.microsoft.com/en-us/security/mobile-authenticator-app";
    } else {
        // Default to Google
        if (isAndroid) url = "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2";
        else if (isIOS) url = "https://apps.apple.com/us/app/google-authenticator/id388497605";
        else url = "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2";
    }

    window.location.href = url;
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-bold mb-2">{t('installAuth.redirecting')}</h2>
        <p className="text-slate-400">{t('installAuth.detecting')}</p>
      </div>
    </div>
  );
};
