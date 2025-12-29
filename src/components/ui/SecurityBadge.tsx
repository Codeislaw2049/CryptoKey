import React, { useState } from 'react';
import { Shield, Lock, EyeOff, Server, Smartphone, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const SecurityBadge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
            fixed bottom-4 right-4 z-50 
            flex items-center justify-center gap-2
            w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-2 rounded-full 
            bg-slate-900/90 border border-green-500/30 
            shadow-lg backdrop-blur-sm 
            hover:bg-slate-800 hover:scale-105 hover:shadow-green-500/20
            transition-all duration-300 group
        `}
      >
        <Shield 
            className={`w-6 h-6 md:w-5 md:h-5 text-green-500 transition-all duration-500 ${isHovered ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : ''}`} 
        />
        <span className="hidden md:inline text-xs font-medium text-slate-300">{t('securityBadge.button')}</span>
        
        {/* Pulse Effect Ring */}
        <span className="absolute inset-0 rounded-full border border-green-500/20 animate-ping opacity-75"></span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl custom-scrollbar"
            >
              <div className="sticky top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-blue-500 z-10" />
              <button
                onClick={() => setIsOpen(false)}
                className="fixed top-4 right-4 md:absolute md:top-4 md:right-4 z-50 p-3 bg-slate-900/80 backdrop-blur text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors border border-slate-700/50 md:border-transparent shadow-lg md:shadow-none"
              >
                <X size={24} />
              </button>

              <div className="p-6 md:p-8 pt-12 md:pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <Shield className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{t('securityBadge.title')}</h2>
                    <p className="text-slate-400">{t('securityBadge.subtitle')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <SecurityFeature
                    icon={<Lock className="w-6 h-6 text-blue-400" />}
                    title={t('securityBadge.features.aes.title')}
                    description={t('securityBadge.features.aes.desc')}
                  />
                  <SecurityFeature
                    icon={<BookOpen className="w-6 h-6 text-orange-400" />}
                    title={t('securityBadge.features.steganography.title')}
                    description={t('securityBadge.features.steganography.desc')}
                  />
                  <SecurityFeature
                    icon={<Shield className="w-6 h-6 text-indigo-400" />}
                    title={t('securityBadge.features.dual.title')}
                    description={t('securityBadge.features.dual.desc')}
                  />
                  <SecurityFeature
                    icon={<EyeOff className="w-6 h-6 text-purple-400" />}
                    title={t('securityBadge.features.zk.title')}
                    description={t('securityBadge.features.zk.desc')}
                  />
                  <SecurityFeature
                    icon={<Server className="w-6 h-6 text-red-400" />}
                    title={t('securityBadge.features.noPersistence.title')}
                    description={t('securityBadge.features.noPersistence.desc')}
                  />
                  <SecurityFeature
                    icon={<Smartphone className="w-6 h-6 text-yellow-400" />}
                    title={t('securityBadge.features.antiTheft.title')}
                    description={t('securityBadge.features.antiTheft.desc')}
                  />
                </div>

                <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">{t('securityBadge.audit.title')}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge text={t('securityBadge.audit.badges.pbkdf2')} />
                    <Badge text={t('securityBadge.audit.badges.aes')} />
                    <Badge text={t('securityBadge.audit.badges.client')} />
                    <Badge text={t('securityBadge.audit.badges.noUploads')} />
                    <Badge text={t('securityBadge.audit.badges.noLog')} />
                    <Badge text={t('securityBadge.audit.badges.wipe')} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const SecurityFeature = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
    <div className="shrink-0">{icon}</div>
    <div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  </div>
);

const Badge = ({ text }: { text: string }) => (
  <span className="px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-xs text-slate-300">
    {text}
  </span>
);
