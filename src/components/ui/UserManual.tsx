import { useState } from 'react';
import { BookOpen, X, Download, Mail, Printer, AlertTriangle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';

export const UserManual = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'start' | 'dual' | 'security' | 'recover'>('start');
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
            fixed bottom-4 left-4 z-50 
            flex items-center justify-center gap-2
            w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-2 rounded-full 
            bg-slate-900/90 border border-blue-500/30 
            shadow-lg backdrop-blur-sm 
            hover:bg-slate-800 hover:scale-105 hover:shadow-blue-500/20
            transition-all duration-300 group
        `}
      >
        <BookOpen 
            className={`w-6 h-6 md:w-5 md:h-5 text-blue-400 transition-all duration-500 ${isHovered ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : ''}`} 
        />
        <span className="hidden md:inline text-xs font-medium text-slate-300">{t('userManual.button')}</span>
        
        {/* Pulse Effect Ring (Blue) */}
        <span className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping opacity-75"></span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white">{t('userManual.title')}</h2>
                    <p className="text-xs md:text-sm text-slate-400">{t('userManual.subtitle')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-4 -mr-4 md:mr-0 hover:bg-slate-800 rounded-full transition-colors shrink-0 z-50"
                  aria-label={t('userManual.close')}
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar (Desktop) */}
                <div className="w-64 bg-slate-950/50 border-r border-slate-800 p-4 space-y-2 hidden md:block overflow-y-auto">
                  <button 
                    onClick={() => setActiveTab('start')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'start' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    {t('userManual.tabs.start')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('dual')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'dual' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    {t('userManual.tabs.dual')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    {t('userManual.tabs.security')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('recover')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'recover' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    {t('userManual.tabs.recover')}
                  </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-slate-900" id="manual-content">
                  
                  {/* Mobile Navigation - Sticky */}
                  <div className="md:hidden sticky top-0 z-40 bg-slate-900 pb-4 pt-2 -mt-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       <button 
                        onClick={() => { setActiveTab('start'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'start' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        {t('userManual.mobileTabs.start')}
                      </button>
                      <button 
                        onClick={() => { setActiveTab('dual'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'dual' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        {t('userManual.mobileTabs.dual')}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setActiveTab('security'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'security' ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        {t('userManual.mobileTabs.security')}
                      </button>
                      <button 
                        onClick={() => { setActiveTab('recover'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'recover' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        {t('userManual.mobileTabs.recover')}
                      </button>
                    </div>
                  </div>

                  {activeTab === 'start' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          {t('userManual.start.title')}
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <p className="text-slate-400">
                            {t('userManual.start.description')}
                          </p>
                          <ul className="list-disc pl-4 space-y-2 mt-4 text-slate-300">
                            {(t('userManual.start.steps', { returnObjects: true }) as string[]).map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'dual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-indigo-400" />
                          {t('userManual.dual.title')}
                        </h3>
                        
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-6">
                           <h4 className="font-bold text-indigo-300 mb-2">{t('userManual.dual.coreConcept.title')}</h4>
                           <p className="text-sm text-indigo-200/80">
                             <Trans i18nKey="userManual.dual.coreConcept.description" />
                           </p>
                        </div>

                        <div className="space-y-6">
                          <section>
                            <h4 className="text-lg font-semibold text-white mb-2">{t('userManual.dual.encryption.title')}</h4>
                            <ul className="space-y-2 text-sm text-slate-300">
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 1</span>
                                <span>{t('userManual.dual.encryption.step1')}</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 2</span>
                                <span><Trans i18nKey="userManual.dual.encryption.step2" /></span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 3</span>
                                <span>{t('userManual.dual.encryption.step3')}</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 4</span>
                                <span>{t('userManual.dual.encryption.step4')}</span>
                              </li>
                            </ul>
                          </section>

                          <section>
                            <h4 className="text-lg font-semibold text-white mb-2">{t('userManual.dual.decryption.title')}</h4>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                              <h5 className="font-bold text-yellow-400 text-sm mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {t('userManual.dual.decryption.important.title')}
                              </h5>
                              <p className="text-sm text-slate-300 mb-2">
                                <Trans i18nKey="userManual.dual.decryption.important.content" />
                              </p>
                              <p className="text-sm text-slate-400 italic">
                                {t('userManual.dual.decryption.important.note')}
                              </p>
                            </div>
                            
                            <ul className="space-y-2 text-sm text-slate-300 mt-4">
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 1</span>
                                <span>{t('userManual.dual.decryption.step1')}</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 2</span>
                                <span><Trans i18nKey="userManual.dual.decryption.step2" /></span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 3</span>
                                <span>{t('userManual.dual.decryption.step3')}</span>
                              </li>
                            </ul>
                          </section>

                           <section>
                            <h4 className="text-lg font-semibold text-white mb-2">{t('userManual.dual.lost.title')}</h4>
                            <p className="text-sm text-slate-300">
                              {t('userManual.dual.lost.description')}
                            </p>
                            <ol className="list-decimal pl-4 space-y-1 mt-2 text-sm text-slate-400">
                              {(t('userManual.dual.lost.steps', { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </section>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">1</span>
                          {t('userManual.security.mode.title')}
                        </h3>
                        <p className="text-slate-400 leading-relaxed mb-3">
                          {t('userManual.security.mode.description')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-blue-400 block mb-1">{t('userManual.security.mode.book.physical.title')}</strong>
                              <span className="text-slate-400">{t('userManual.security.mode.book.physical.desc')}</span>
                           </div>
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-green-400 block mb-1">{t('userManual.security.mode.book.online.title')}</strong>
                              <span className="text-slate-400">{t('userManual.security.mode.book.online.desc')}</span>
                           </div>
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-purple-400 block mb-1">{t('userManual.security.mode.book.digital.title')}</strong>
                              <span className="text-slate-400">{t('userManual.security.mode.book.digital.desc')}</span>
                           </div>
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-orange-400 block mb-1">{t('userManual.security.mode.book.index.title')}</strong>
                              <span className="text-slate-400">{t('userManual.security.mode.book.index.desc')}</span>
                           </div>
                        </div>
                      </section>
                      
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">2</span>
                          {t('userManual.security.obfuscate.title')}
                        </h3>
                        <p className="text-slate-400 leading-relaxed mb-4">
                          <Trans
                            i18nKey="userManual.security.obfuscate.description"
                            components={[<span className="text-white font-mono" key="0" />]}
                          />
                        </p>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm font-mono text-slate-500">
                          {t('userManual.security.obfuscate.example.fake1')}<br/>
                          <span className="text-green-400">{t('userManual.security.obfuscate.example.real')}</span><br/>
                          {t('userManual.security.obfuscate.example.fake2')}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">3</span>
                          {t('userManual.security.export.title')}
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                          {t('userManual.security.export.description')}
                          <br/><br/>
                          <strong className="text-white">{t('userManual.security.export.ways')}</strong>
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <li className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Mail className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-slate-300">{t('userManual.security.export.email')}</span>
                          </li>
                          <li className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Download className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-300">{t('userManual.security.export.usb')}</span>
                          </li>
                          <li className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Printer className="w-4 h-4 text-orange-400" />
                            <span className="text-sm text-slate-300">{t('userManual.security.export.print')}</span>
                          </li>
                        </ul>
                      </section>

                      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                        <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                          <AlertTriangle size={20} />
                          {t('userManual.security.publicComputer.title')}
                        </h3>
                        <p className="text-sm text-red-200/80">
                          {t('userManual.security.publicComputer.description')}
                        </p>
                        <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-red-200/80">
                          {(t('userManual.security.publicComputer.steps', { returnObjects: true }) as string[]).map((step, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
                          ))}
                        </ul>
                      </div>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t('userManual.security.military.title')}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          <Trans i18nKey="userManual.security.military.description" />
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t('userManual.security.zk.title')}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          <Trans i18nKey="userManual.security.zk.description" />
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t('userManual.security.deniability.title')}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          <Trans i18nKey="userManual.security.deniability.description" />
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t('userManual.security.transparency.title')}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          {t('userManual.security.transparency.description')}
                        </p>
                      </section>
                    </div>
                  )}

                  {activeTab === 'recover' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4">{t('userManual.recover.title')}</h3>
                        <ol className="space-y-4 text-slate-400">
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">01.</span>
                            <div>
                              <p className="font-medium text-slate-200">{t('userManual.recover.steps.step1.title')}</p>
                              <p className="text-sm">{t('userManual.recover.steps.step1.description')}</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">02.</span>
                            <div>
                              <p className="font-medium text-slate-200">{t('userManual.recover.steps.step2.title')}</p>
                              <p className="text-sm">{t('userManual.recover.steps.step2.description')}</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">03.</span>
                            <div>
                              <p className="font-medium text-slate-200">{t('userManual.recover.steps.step3.title')}</p>
                              <p className="text-sm">{t('userManual.recover.steps.step3.description')}</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">04.</span>
                            <div>
                              <p className="font-medium text-slate-200">{t('userManual.recover.steps.step4.title')}</p>
                              <p className="text-sm">{t('userManual.recover.steps.step4.description')}</p>
                            </div>
                          </li>
                        </ol>
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
