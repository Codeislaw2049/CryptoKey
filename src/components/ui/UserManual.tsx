import { useState } from 'react';
import { BookOpen, X, Download, Mail, Printer, AlertTriangle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const UserManual = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'start' | 'dual' | 'security' | 'recover'>('start');
  const [isHovered, setIsHovered] = useState(false);

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
        <span className="hidden md:inline text-xs font-medium text-slate-300">User Manual</span>
        
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
                    <h2 className="text-lg md:text-xl font-bold text-white">CryptoKey User Manual</h2>
                    <p className="text-xs md:text-sm text-slate-400">Secure Data Encryption & Recovery Guide</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-4 -mr-4 md:mr-0 hover:bg-slate-800 rounded-full transition-colors shrink-0 z-50"
                  aria-label="Close"
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
                    Quick Start Guide
                  </button>
                  <button 
                    onClick={() => setActiveTab('dual')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'dual' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    Dual Authenticator
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    Security & Privacy
                  </button>
                  <button 
                    onClick={() => setActiveTab('recover')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeTab === 'recover' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-900 border border-transparent'}`}
                  >
                    Recovery Process
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
                        Quick Start
                      </button>
                      <button 
                        onClick={() => { setActiveTab('dual'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'dual' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        Dual Auth
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setActiveTab('security'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'security' ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        Security
                      </button>
                      <button 
                        onClick={() => { setActiveTab('recover'); document.getElementById('manual-content')?.scrollTo(0,0); }}
                        className={`text-center py-2 px-1 rounded-lg text-xs font-bold transition-all border ${activeTab === 'recover' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'text-slate-400 border-slate-800 bg-slate-800/50'}`}
                      >
                        Recovery
                      </button>
                    </div>
                  </div>

                  {activeTab === 'start' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          Getting Started
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <p className="text-slate-400">
                            CryptoKey allows you to hide sensitive data (like mnemonics) within decoy data using standard encryption or dual-authenticator protection.
                          </p>
                          <ul className="list-disc pl-4 space-y-2 mt-4 text-slate-300">
                            <li>Select a mode (Standard or Dual Authenticator).</li>
                            <li>Input your secret data.</li>
                            <li>Generate encrypted shards or blocks.</li>
                            <li>Save the output safely (QR codes or text).</li>
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
                          Dual Authenticator Mode
                        </h3>
                        
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-6">
                           <h4 className="font-bold text-indigo-300 mb-2">Core Concept</h4>
                           <p className="text-sm text-indigo-200/80">
                             Unlike standard encryption, this mode requires <strong>Two Separate Keys</strong> (Key A & Key B) to decrypt. 
                             It splits trust between two different authenticator tokens/devices.
                           </p>
                        </div>

                        <div className="space-y-6">
                          <section>
                            <h4 className="text-lg font-semibold text-white mb-2">1. Encryption (Generation)</h4>
                            <ul className="space-y-2 text-sm text-slate-300">
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 1</span>
                                <span>Input your Mnemonic and Password/Context.</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 2</span>
                                <span>Scan the two generated QR codes (Key A & Key B) with your Google Authenticator app. <strong>Save these QR images!</strong> They are your permanent keys.</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 3</span>
                                <span>Enter the 6-digit codes from your app to verify and lock the encryption.</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 4</span>
                                <span>Download the generated Shard Images (QR Sharding).</span>
                              </li>
                            </ul>
                          </section>

                          <section>
                            <h4 className="text-lg font-semibold text-white mb-2">2. Decryption (Recovery)</h4>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                              <h5 className="font-bold text-yellow-400 text-sm mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Important: Keys vs Codes
                              </h5>
                              <p className="text-sm text-slate-300 mb-2">
                                <strong>Key (QR/Secret):</strong> The permanent "Key" you scanned. Required for decryption.
                                <br/>
                                <strong>Code (6-digits):</strong> The temporary "Token" generated every 30s. Used only for verification.
                              </p>
                              <p className="text-sm text-slate-400 italic">
                                * You CANNOT decrypt with just the 6-digit code. You MUST upload the Key QR or input the Secret string.
                              </p>
                            </div>
                            
                            <ul className="space-y-2 text-sm text-slate-300 mt-4">
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 1</span>
                                <span>Upload all your Shard Images.</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 2</span>
                                <span><strong>REQUIRED:</strong> Upload Key A & Key B QR images (or paste the Secret strings).</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Step 3</span>
                                <span>(Optional) Enter current 6-digit codes to verify correctness.</span>
                              </li>
                            </ul>
                          </section>

                           <section>
                            <h4 className="text-lg font-semibold text-white mb-2">3. Lost your QR Images?</h4>
                            <p className="text-sm text-slate-300">
                              If you still have the Authenticator App on your phone:
                            </p>
                            <ol className="list-decimal pl-4 space-y-1 mt-2 text-sm text-slate-400">
                              <li>Open Google Authenticator.</li>
                              <li>Use the "Export Accounts" or "Transfer" feature.</li>
                              <li>This will show a QR code containing your Secrets.</li>
                              <li>Scan/Decode that export QR to get your Secret string back.</li>
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
                          Choose Protection Mode
                        </h3>
                        <p className="text-slate-400 leading-relaxed mb-3">
                          Select the best way to secure your mnemonic phrase or data:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-blue-400 block mb-1">Physical / Virtual Book</strong>
                              <span className="text-slate-400">Hide your key in a real book on your shelf. (Page-Line-Word)</span>
                           </div>
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-green-400 block mb-1">Online Book (URL)</strong>
                              <span className="text-slate-400">Use a permanent Gutenberg URL as your key source. No files needed.</span>
                           </div>
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-purple-400 block mb-1">Digital Book (File)</strong>
                              <span className="text-slate-400">Upload a Gutenberg TXT file. Processed locally, never uploaded.</span>
                           </div>
                           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              <strong className="text-orange-400 block mb-1">General Index</strong>
                              <span className="text-slate-400">Encrypt arbitrary data structures (e.g., Bank Info, Passwords).</span>
                           </div>
                        </div>
                      </section>
                      
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">2</span>
                          Enter & Obfuscate
                        </h3>
                        <p className="text-slate-400 leading-relaxed mb-4">
                          Input your sensitive data. We will then ask you to set a <span className="text-white font-mono">Row Density</span> (e.g., 100 rows).
                          Your real data will be hidden in one random row among 99 fake rows.
                        </p>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm font-mono text-slate-500">
                          Row 34: 832-19-22 (Fake)<br/>
                          <span className="text-green-400">Row 35: 123-45-67 (Real Data)</span><br/>
                          Row 36: 992-11-02 (Fake)
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs">3</span>
                          Export & Save
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                          Once encrypted, you will receive a ciphertext block. You must save this block!
                          <br/><br/>
                          <strong className="text-white">Ways to save:</strong>
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <li className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Mail className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-slate-300">Email (Personal Device)</span>
                          </li>
                          <li className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Download className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-300">USB Download (Safest)</span>
                          </li>
                          <li className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Printer className="w-4 h-4 text-orange-400" />
                            <span className="text-sm text-slate-300">Print Paper (Offline)</span>
                          </li>
                        </ul>
                      </section>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                        <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                          <AlertTriangle size={20} />
                          Public Computer Safety
                        </h3>
                        <p className="text-sm text-red-200/80">
                          If you are using a public computer (internet cafe, library, friend's PC):
                        </p>
                        <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-red-200/80">
                          <li>Do NOT log in to your personal email.</li>
                          <li>Do NOT use the clipboard (copy/paste) if possible.</li>
                          <li>Use the <strong>"Public Computer Mode"</strong> toggle on the result page.</li>
                          <li>Download the file to a USB drive or scan the QR code with your phone.</li>
                          <li>Click <strong>"Clear All Data"</strong> before leaving.</li>
                        </ul>
                      </div>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">Military-Grade Encryption</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          We use <strong>AES-256-GCM</strong> encryption. This is the same standard used by governments and banks.
                          Your password is salted and hashed using <strong>PBKDF2-HMAC-SHA256</strong> with 100,000 iterations, making brute-force attacks nearly impossible.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">Zero-Knowledge Architecture</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          Everything happens in your browser. We have <strong>no servers</strong>, no database, and no logs.
                          If you close this tab, your data is gone forever unless you saved the backup.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">Plausible Deniability</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          We generate <strong>fake decoy rows</strong> indistinguishable from your real data. 
                          Even if someone forces you to decrypt the file, you can claim any of the fake rows is the "real" one, 
                          or that the file contains no meaningful data at all. The encryption math hides which row is real.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">Code Transparency</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          CryptoKey is a pure client-side application. You can inspect the source code in your browser's developer tools.
                          We encourage security audits. No external scripts or analytics are loaded.
                        </p>
                      </section>
                    </div>
                  )}

                  {activeTab === 'recover' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-4">How to Decrypt</h3>
                        <ol className="space-y-4 text-slate-400">
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">01.</span>
                            <div>
                              <p className="font-medium text-slate-200">Select Mode</p>
                              <p className="text-sm">Choose the same mode used for encryption (Physical, File, or URL). If using File or URL, you must provide the exact same source book.</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">02.</span>
                            <div>
                              <p className="font-medium text-slate-200">Paste Ciphertext</p>
                              <p className="text-sm">Copy the entire ciphertext block (including the random characters) from your email or file.</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">03.</span>
                            <div>
                              <p className="font-medium text-slate-200">Enter Password</p>
                              <p className="text-sm">Input the password you set during encryption.</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-purple-400">04.</span>
                            <div>
                              <p className="font-medium text-slate-200">Identify Your Row</p>
                              <p className="text-sm">The system will decrypt ALL rows (real + fake). You must remember which row number was yours (e.g., Row 35) to find your data.</p>
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