import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateMnemonic, mnemonicToIndices, encodeIndexToBookCipher, generateMnemonic, textToIndices } from '../../utils/mnemonic';
import { AlertCircle, CheckCircle2, Dices, Upload, Settings2, BookOpen, Trash2, Plus, Clipboard, Lock, Info } from 'lucide-react';
import { useSecureMemory } from '../../hooks/useSecureMemory';
import { parseGutenbergTxt } from '../../utils/txtParser';
import { fetchGutenbergContent } from '../../utils/urlFetcher';
import { PRESET_BOOKS } from '../../utils/publicBooks';
import { 
  indicesToOffset,
  indicesToChapterIndices,
  indicesToVirtualLineIndices,
  indicesToIndex
} from '../../utils/gutenbergIndex';
import { sanitizeUrl } from '../../utils/sanitize';
import { useTranslation } from 'react-i18next';
import { useLicense } from '../../contexts/LicenseContext';
import { Tooltip } from '../ui/Tooltip'; // Assuming Tooltip exists or we'll create a simple one inline if not

interface InputStepProps {
  mode: 'general' | 'mnemonic' | 'file' | 'url';
  intent?: 'crypto' | 'password';
  initialValue?: string;
  onNext: (data: string[], originalMnemonic?: string) => void;
  onBack: () => void;
}

export const InputStep = ({ mode, intent = 'crypto', initialValue, onNext, onBack }: InputStepProps) => {
  const { t } = useTranslation();
  const { isPro, triggerUpgrade } = useLicense();
  const [mnemonic, setMnemonic] = useSecureMemory(initialValue || '');
  const [error, setError] = React.useState('');

  const handleSchemeChange = (scheme: 'offset' | 'chapter' | 'virtual') => {
    if (scheme === 'offset') {
      setFileScheme(scheme);
      return;
    }
    
    if (isPro) {
      setFileScheme(scheme);
    } else {
      triggerUpgrade();
    }
  };

  useEffect(() => {
    if (initialValue) {
      setMnemonic(initialValue);
    }
  }, [initialValue, setMnemonic]);

  useEffect(() => {
    return () => {
      // Clear sensitive data on unmount
      setMnemonic('');
      setError('');
    };
  }, [setMnemonic]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonic(text);
      setError('');
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };
  
  // New States for File/URL
  const [fileInfo, setFileInfo] = useState<{
    fullText: string;
    totalChars: number;
    chapters: Array<{ id: number; start: number; end: number; text: string }>;
    virtualLines: string[];
  } | null>(null);
  
  const [urlInfo, setUrlInfo] = useState<{
    pureText: string;
    textHash: string;
    fixedCharSegment: string;
    chapterHash: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [fileScheme, setFileScheme] = useState<'offset' | 'chapter' | 'virtual'>('offset');
  
  // Physical Book Mode State
  const [physicalRows, setPhysicalRows] = useState<string[]>(['', '', '', '']);

  const handlePhysicalChange = (index: number, value: string) => {
    const newRows = [...physicalRows];
    newRows[index] = value;
    setPhysicalRows(newRows);
    setError('');
  };

  const addPhysicalRow = () => {
    setPhysicalRows([...physicalRows, '']);
  };

  const removePhysicalRow = (index: number) => {
    const newRows = physicalRows.filter((_, i) => i !== index);
    setPhysicalRows(newRows.length ? newRows : ['']);
  };

  const handleGeneratePhysical = () => {
    // Generate 12 random Page-Line-Column entries
    const newRows = Array.from({ length: 12 }, () => {
      const p = Math.floor(Math.random() * 500) + 1;
      const l = Math.floor(Math.random() * 40) + 1;
      const c = Math.floor(Math.random() * 10) + 1;
      return `${p}-${l}-${c}`;
    });
    setPhysicalRows(newRows);
    setError('');
  };

  const handleMnemonicSubmit = () => {
    try {
      let indices: number[] = [];

      if (mode !== 'general') {
        const validation = validateMnemonic(mnemonic);
        if (validation.isValid) {
          indices = mnemonicToIndices(mnemonic);
        } else {
          // If invalid mnemonic, treat as arbitrary text
          // But ensure it's not empty
          if (!mnemonic.trim()) {
             setError(t('inputStep.error.invalidMnemonic'));
             return;
          }
          indices = textToIndices(mnemonic);
        }
      }

      let cipherData: string[] = [];

      if (mode === 'mnemonic') {
        // Standard Book Cipher (Physical Book)
        cipherData = indices.map(encodeIndexToBookCipher);
      } else if (mode === 'general') {
        // Physical Book: Manual Entry of Ciphertext
        const validRows = physicalRows.filter(r => r.trim());
        if (validRows.length === 0) {
          throw new Error(t('inputStep.error.enterCiphertext'));
        }
        cipherData = validRows;
        onNext(cipherData, validRows.join(' '));
        return; // Early return since we called onNext
      } else if (mode === 'file' && fileInfo) {
        // Project 4: Digital Book (TXT)
        if (fileScheme === 'offset') {
           cipherData = indicesToOffset(indices, fileInfo.fullText);
        } else if (fileScheme === 'chapter') {
           cipherData = indicesToChapterIndices(indices, fileInfo.chapters);
        } else if (fileScheme === 'virtual') {
           cipherData = indicesToVirtualLineIndices(indices, fileInfo.virtualLines);
        }
      } else if (mode === 'url' && urlInfo) {
        // Project 5: Online Book (URL)
        cipherData = indicesToIndex(indices, urlInfo.pureText, urlInfo.textHash);
      } else {
        throw new Error(t('inputStep.error.invalidMode'));
      }

      onNext(cipherData, mnemonic);
    } catch (e: any) {
      console.error(e);
      setError(e.message || t('inputStep.error.encryptionFailed'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError('');
    try {
      const info = await parseGutenbergTxt(file);
      setFileInfo(info);
    } catch (e: any) {
      setError(e.message || t('inputStep.error.parseFileFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchUrl = async () => {
    if (!url) return;
    setIsLoading(true);
    setError('');
    try {
      // Validate URL first
      const cleanUrl = sanitizeUrl(url);
      if (!cleanUrl) throw new Error(t('inputStep.error.invalidUrl'));

      const info = await fetchGutenbergContent(cleanUrl);
      setUrlInfo(info);
    } catch (e: any) {
      setError(e.message || t('inputStep.error.fetchUrlFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMnemonic = () => {
    const newMnemonic = generateMnemonic();
    setMnemonic(newMnemonic);
    setError('');
  };

  const getTitle = () => {
    if (intent === 'password') return t('wizard.inputStep.title.password', 'Secure Passwords & Notes');
    if (mode === 'mnemonic') return t('wizard.inputStep.title.mnemonic');
    if (mode === 'file') return t('wizard.inputStep.title.file');
    if (mode === 'url') return t('wizard.inputStep.title.url');
    if (mode === 'general') return t('wizard.inputStep.title.general');
    return '';
  };

  const getSubtitle = () => {
    if (intent === 'password') return t('wizard.inputStep.subtitle.password', 'Enter the text, password, or secret note you want to encrypt.');
    if (mode === 'mnemonic') return t('wizard.inputStep.subtitle.mnemonic');
    if (mode === 'file') return t('wizard.inputStep.subtitle.file');
    if (mode === 'url') return t('wizard.inputStep.subtitle.url');
    if (mode === 'general') return t('wizard.inputStep.subtitle.general');
    return '';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {getTitle()}
        </h2>
        <p className="text-slate-400">
          {getSubtitle()}
        </p>
      </div>

      <div className="space-y-4">
        {/* Input Area */}
        <div className="space-y-6">
          {mode === 'file' && (
            <div className="space-y-4">
               {/* Safe Box / Vault Style Upload UI */}
               <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative bg-slate-900 rounded-xl p-8 text-center border border-slate-700 hover:border-slate-500 transition-colors shadow-2xl">
                      {/* Decorative elements */}
                      <div className="absolute top-4 right-4 flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500/50 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                          <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                      </div>
                      
                      <input 
                        type="file" 
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4 py-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-inner group-hover:scale-105 transition-transform duration-300">
                            {fileInfo ? (
                                <BookOpen className="text-primary w-10 h-10" />
                            ) : (
                                <Upload className="text-slate-400 w-10 h-10 group-hover:text-white transition-colors" />
                            )}
                        </div>
                        
                        <div className="space-y-1">
                            <span className="text-xl font-bold text-slate-200 block tracking-wide">
                              {fileInfo ? t('wizard.inputStep.file.loaded') : t('wizard.inputStep.file.upload')}
                            </span>
                            <span className="text-sm text-slate-500 font-mono block">
                              {fileInfo ? `${(fileInfo.totalChars / 1024).toFixed(1)} KB ${t('wizard.inputStep.file.sizeLoaded')}` : t('wizard.inputStep.file.maxSize')}
                            </span>
                        </div>
                        
                        {!fileInfo && (
                            <div className="mt-4 px-4 py-1.5 bg-slate-800 rounded-full text-xs text-slate-400 border border-slate-700 group-hover:border-primary/50 transition-colors">
                                {t('wizard.inputStep.file.dragDrop', 'Click to Open Vault')}
                            </div>
                        )}
                      </label>
                  </div>
               </div>

               {fileInfo && (
                 <div className="bg-slate-800/50 p-4 rounded-lg space-y-3 border border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Settings2 size={16} /> {t('wizard.inputStep.file.scheme')}
                      <Tooltip content={t('wizard.inputStep.file.schemeTooltip', 'Different ways to reference data in the book. Character Offset is standard. Chapter Index and Virtual Line are Pro features that provide better obfuscation.')}>
                        <Info size={14} className="text-slate-500 hover:text-primary cursor-help" />
                      </Tooltip>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <button 
                        onClick={() => handleSchemeChange('offset')}
                        className={`p-3 rounded-lg text-left border transition-all ${
                          fileScheme === 'offset' 
                          ? 'bg-primary/20 border-primary' 
                          : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className={`text-xs font-medium ${fileScheme === 'offset' ? 'text-primary' : 'text-slate-300'}`}>
                           {t('wizard.inputStep.file.schemes.offset')}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                           {t('wizard.inputStep.file.schemes.offsetDesc')}
                        </div>
                      </button>

                      <button 
                        onClick={() => handleSchemeChange('chapter')}
                        className={`p-3 rounded-lg text-left border transition-all relative overflow-hidden ${
                          fileScheme === 'chapter' 
                          ? 'bg-primary/20 border-primary' 
                          : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                        } ${!isPro ? 'opacity-90' : ''}`}
                      >
                         {!isPro && (
                           <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-bold z-20">PRO</div>
                         )}
                        <div className={`text-xs font-medium flex items-center gap-1.5 ${fileScheme === 'chapter' ? 'text-primary' : 'text-slate-300'}`}>
                           <span className={!isPro ? 'blur-[2px] select-none' : ''}>{t('wizard.inputStep.file.schemes.chapter')}</span>
                           {!isPro && <Lock size={12} className="text-amber-500" />}
                        </div>
                        <div className={`text-[10px] text-slate-500 mt-1 leading-tight ${!isPro ? 'blur-[2px] select-none' : ''}`}>
                           {t('wizard.inputStep.file.schemes.chapterDesc')}
                        </div>
                      </button>

                      <button 
                        onClick={() => handleSchemeChange('virtual')}
                        className={`p-3 rounded-lg text-left border transition-all relative overflow-hidden ${
                          fileScheme === 'virtual' 
                          ? 'bg-primary/20 border-primary' 
                          : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                        } ${!isPro ? 'opacity-90' : ''}`}
                      >
                         {!isPro && (
                           <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-bold z-20">PRO</div>
                         )}
                        <div className={`text-xs font-medium flex items-center gap-1.5 ${fileScheme === 'virtual' ? 'text-primary' : 'text-slate-300'}`}>
                           <span className={!isPro ? 'blur-[2px] select-none' : ''}>{t('wizard.inputStep.file.schemes.virtual')}</span>
                           {!isPro && <Lock size={12} className="text-amber-500" />}
                        </div>
                        <div className={`text-[10px] text-slate-500 mt-1 leading-tight ${!isPro ? 'blur-[2px] select-none' : ''}`}>
                           {t('wizard.inputStep.file.schemes.virtualDesc')}
                        </div>
                      </button>
                    </div>
                 </div>
               )}
            </div>
          )}

          {mode === 'url' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-400 flex gap-2">
                 <Info size={14} className="shrink-0 mt-0.5 text-primary" />
                 <p>{t('wizard.inputStep.url.guide', 'Paste a Gutenberg eBook URL or select from our recommended classics. This URL becomes your permanent key.')}</p>
              </div>

              {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && (
                 <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex gap-3 items-start text-xs text-indigo-200/80">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-indigo-400" />
                    <div>
                       <strong className="text-indigo-400 block mb-1">{t('wizard.inputStep.url.proxy.title')}</strong>
                       {t('wizard.inputStep.url.proxy.desc')}
                    </div>
                 </div>
              )}

              <div className="flex gap-2 sticky top-0 z-10 bg-slate-900/90 p-2 -mx-2 backdrop-blur-sm border-b border-slate-800/50">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t('inputStep.placeholder.bookUrl')}
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={handleFetchUrl} 
                  disabled={isLoading || !url}
                  variant="secondary"
                  className="whitespace-nowrap min-w-[100px]"
                >
                  {isLoading ? t('common.loading') : t('wizard.inputStep.url.fetch')}
                </Button>
              </div>

              {urlInfo && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm animate-in fade-in">
                  <CheckCircle2 size={16} />
                  <span>{t('wizard.inputStep.url.success', { count: urlInfo.pureText.length })}</span>
                </div>
              )}
              
              {/* Preset Books */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t('wizard.inputStep.url.recommended')}</p>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 border border-slate-800/50 rounded-lg p-2 bg-slate-900/30">
                  {PRESET_BOOKS.map((book, index) => {
                    const isLocked = !isPro && index > 0;
                    return (
                      <button
                        key={book.id}
                        onClick={() => {
                          if (isLocked) {
                            triggerUpgrade();
                            return;
                          }
                          setUrl(book.url);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg text-left group transition-all ${
                          isLocked 
                            ? 'bg-slate-900/20 border border-slate-800 opacity-60 cursor-not-allowed' 
                            : 'bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800 hover:border-primary/50'
                        }`}
                      >
                        <BookOpen size={16} className={`flex-shrink-0 transition-colors ${isLocked ? 'text-slate-600' : 'text-slate-500 group-hover:text-primary'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate transition-colors ${isLocked ? 'text-slate-500' : 'text-slate-300 group-hover:text-white'}`}>{book.title}</div>
                          <div className="text-xs text-slate-500">{book.author}</div>
                        </div>
                        {isLocked ? (
                          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded text-[10px] text-amber-500 font-bold border border-amber-500/20">
                            <Lock size={10} />
                            PRO
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {t('wizard.inputStep.url.clickToFill')}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {mode === 'general' ? (
            <div className="relative space-y-3">
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {physicalRows.map((row, index) => (
                    <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="text-slate-500 text-xs w-6 text-right font-mono">{index + 1}.</span>
                      <input
                        type="text"
                        value={row}
                        onChange={(e) => handlePhysicalChange(index, e.target.value)}
                        placeholder={t('wizard.inputStep.general.placeholder')}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 font-mono"
                      />
                      <button
                        onClick={() => removePhysicalRow(index)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title={t('inputStep.tooltip.removeLine')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={addPhysicalRow}
                  className="mt-4 w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  {t('wizard.inputStep.general.addLine')}
                </button>
              </div>

              <button
                onClick={handleGeneratePhysical}
                className="absolute top-[-40px] right-0 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                title={t('inputStep.tooltip.generateRandom')}
              >
                <Dices size={14} />
                {t('wizard.inputStep.general.generate')}
              </button>
            </div>
          ) : (
            <div className="relative">
              {(mode === 'file' || mode === 'url') && (
                 <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-400">
                    <span>{t('wizard.inputStep.mnemonic.label')}</span>
                    <span className="text-xs text-slate-500 font-normal">{t('wizard.inputStep.mnemonic.required')}</span>
                 </div>
              )}
              {mode === 'mnemonic' && (
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      {intent === 'password' ? t('inputStep.label.password', 'Password / Secret Note') : t('wizard.inputStep.mnemonic.label')}
                      <Tooltip content={t('wizard.inputStep.mnemonic.tooltip', 'Enter your 12 or 24 word recovery phrase. Or switch to "Any Text" mode to encrypt arbitrary passwords or notes.')}>
                        <Info size={14} className="text-slate-500 hover:text-primary cursor-help" />
                      </Tooltip>
                    </label>
                 </div>
              )}
              <textarea
                value={mnemonic}
                onChange={(e) => {
                  setMnemonic(e.target.value);
                  setError('');
                }}
                placeholder={t('wizard.inputStep.mnemonic.placeholder')}
                className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono resize-none transition-all"
                spellCheck={false}
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={handlePaste}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                  title={t('inputStep.tooltip.pasteClipboard')}
                >
                  <Clipboard size={14} />
                  {t('wizard.inputStep.mnemonic.paste')}
                </button>
                <button
                  onClick={handleGenerateMnemonic}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                  title={t('inputStep.tooltip.generateMnemonic')}
                >
                  <Dices size={14} />
                  {t('wizard.inputStep.mnemonic.generate')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex-1"
          >
            {t('common.back')}
          </Button>
          <Button 
            onClick={handleMnemonicSubmit}
            className="flex-[2]"
            disabled={
              (mode === 'file' && (!fileInfo || !mnemonic)) || 
              (mode === 'url' && (!urlInfo || !mnemonic)) ||
              (mode === 'mnemonic' && !mnemonic) ||
              (mode === 'general' && !physicalRows.some(r => r.trim()))
            }
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};
