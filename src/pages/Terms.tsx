import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useGeoLocation } from '../utils/geo';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Terms = () => {
  const { isChina } = useGeoLocation();
  const { t } = useTranslation();
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <div className="flex items-center justify-between">
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white">{t('terms.title')}</h1>
            <p className="text-slate-400">{t('terms.lastUpdated', { date: currentDate })}</p>
          </div>
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-4 py-2 rounded-lg">
             <ArrowLeft size={20} />
             <span className="font-medium">{t('terms.backToHome')}</span>
          </Link>
      </div>

      <div className="prose prose-invert prose-slate max-w-none space-y-8">
        
        {/* Important Disclaimer - Required by User */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-4">
            <ShieldAlert size={24} />
            {t('terms.disclaimer.title')}
          </h3>
          <p className="text-base md:text-lg text-slate-200 font-medium leading-relaxed">
            {!isChina && t('terms.disclaimer.content_non_china')}
            {isChina && t('terms.disclaimer.content_china')}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('terms.sections.acceptance.title')}</h2>
          <p className="text-slate-400">
            {t('terms.sections.acceptance.content')}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('terms.sections.nature.title')}</h2>
          <p className="text-slate-400">
            {t('terms.sections.nature.content')}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('terms.sections.responsibilities.title')}</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            {(t('terms.sections.responsibilities.items', { returnObjects: true }) as string[]).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('terms.sections.ip.title')}</h2>
          <p className="text-slate-400">
            {t('terms.sections.ip.content')}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('terms.sections.liability.title')}</h2>
          <p className="text-slate-400">
            {t('terms.sections.liability.content')}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">{t('terms.sections.refund.title')}</h2>
          <p className="text-slate-400">
            <strong>{t('terms.sections.refund.policy').split(':')[0]}:</strong> {t('terms.sections.refund.policy').split(':')[1]}
          </p>
          {!isChina && (
            <p className="text-slate-400 mt-2">
              <strong>{t('terms.sections.refund.fees').split(':')[0]}:</strong> {t('terms.sections.refund.fees').split(':')[1]}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
