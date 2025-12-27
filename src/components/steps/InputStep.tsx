import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateMnemonic, mnemonicToIndices, encodeIndexToBookCipher, generateMnemonic } from '../../utils/mnemonic';
import { AlertCircle, CheckCircle2, Dices, Upload, Settings2, BookOpen, Trash2, Plus, Clipboard } from 'lucide-react';
import { useSecureMemory } from '../../hooks/useSecureMemory';
import { parseGutenbergTxt } from '../../utils/txtParser';
import { fetchGutenbergContent } from '../../utils/urlFetcher';
import { PRESET_BOOKS } from '../../utils/publicBooks';
import { 
  mnemonicToOffset, 
  mnemonicToChapterIndices, 
  mnemonicToVirtualLineIndices, 
  mnemonicToIndex 
} from '../../utils/gutenbergIndex';
import { sanitizeUrl } from '../../utils/sanitize';

interface InputStepProps {
  mode: 'general' | 'mnemonic' | 'file' | 'url';
  initialValue?: string;
  onNext: (data: string[], originalMnemonic?: string) => void;
  onBack: () => void;
}

export const InputStep = ({ mode, initialValue, onNext, onBack }: InputStepProps) => {
  const [mnemonic, setMnemonic] = useSecureMemory(initialValue || '');
  const [error, setError] = React.useState('');

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
      if (mode !== 'general') {
        const validation = validateMnemonic(mnemonic);
        if (!validation.isValid) {
          setError(validation.error || "Invalid mnemonic phrase. Please check your words.");
          return;
        }
      }

      let cipherData: string[] = [];

      if (mode === 'mnemonic') {
        // Standard Book Cipher (Physical Book)
        const indices = mnemonicToIndices(mnemonic);
        cipherData = indices.map(encodeIndexToBookCipher);
      } else if (mode === 'general') {
        // Physical Book: Manual Entry of Ciphertext
        const validRows = physicalRows.filter(r => r.trim());
        if (validRows.length === 0) {
          throw new Error('Please enter the ciphertext data');
        }
        cipherData = validRows;
        onNext(cipherData, validRows.join(' '));
        return; // Early return since we called onNext
      } else if (mode === 'file' && fileInfo) {
        // Project 4: Digital Book (TXT)
        if (fileScheme === 'offset') {
           cipherData = mnemonicToOffset(mnemonic, fileInfo.fullText);
        } else if (fileScheme === 'chapter') {
           cipherData = mnemonicToChapterIndices(mnemonic, fileInfo.chapters);
        } else if (fileScheme === 'virtual') {
           cipherData = mnemonicToVirtualLineIndices(mnemonic, fileInfo.virtualLines);
        }
      } else if (mode === 'url' && urlInfo) {
        // Project 5: Online Book (URL)
        cipherData = mnemonicToIndex(mnemonic, urlInfo.pureText, urlInfo.textHash);
      } else {
        throw new Error('Invalid mode or missing data');
      }

      onNext(cipherData, mnemonic);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Encryption process failed. Please check your input.");
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
      setError(e.message || "Failed to parse the file. Please ensure it is a valid text file.");
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
      if (!cleanUrl) throw new Error('Invalid URL');

      const info = await fetchGutenbergContent(cleanUrl);
      setUrlInfo(info);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMnemonic = () => {
    const newMnemonic = generateMnemonic();
    setMnemonic(newMnemonic);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {mode === 'mnemonic' && "Enter Mnemonic Phrase"}
          {mode === 'file' && "Upload Digital Book"}
          {mode === 'url' && "Enter Book URL"}
          {mode === 'general' && "Enter Ciphertext Data"}
        </h2>
        <p className="text-slate-400">
          {mode === 'mnemonic' && "We will validate the checksum automatically."}
          {mode === 'file' && "Upload a public domain book (TXT) to use as the key."}
          {mode === 'url' && "Use a permanent URL as your key source."}
          {mode === 'general' && "Enter the manually generated Page-Line-Column data."}
        </p>
      </div>

      <div className="space-y-4">
        {/* Input Area */}
        <div className="space-y-6">
          {mode === 'file' && (
            <div className="space-y-4">
               <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-slate-900/50">
                  <input 
                    type="file" 
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden" 
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <Upload className="text-primary w-10 h-10 mb-2" />
                    <span className="text-lg font-medium text-slate-200">
                      {fileInfo ? "File Loaded Successfully" : "Click to Upload TXT"}
                    </span>
                    <span className="text-sm text-slate-500">
                      {fileInfo ? `${(fileInfo.totalChars / 1024).toFixed(1)} KB Loaded` : "Max 10MB"}
                    </span>
                  </label>
               </div>

               {fileInfo && (
                 <div className="bg-slate-800/50 p-4 rounded-lg space-y-3 border border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Settings2 size={16} /> Encryption Scheme
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <button 
                        onClick={() => setFileScheme('offset')}
                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                          fileScheme === 'offset' 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        Offset
                      </button>
                      <button 
                        onClick={() => setFileScheme('chapter')}
                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                          fileScheme === 'chapter' 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        Chapter
                      </button>
                      <button 
                        onClick={() => setFileScheme('virtual')}
                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                          fileScheme === 'virtual' 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        Virtual Line
                      </button>
                    </div>
                 </div>
               )}
            </div>
          )}

          {mode === 'url' && (
            <div className="space-y-4">
              {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && (
                 <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex gap-3 items-start text-xs text-indigo-200/80">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-indigo-400" />
                    <div>
                       <strong className="text-indigo-400 block mb-1">Using Secure Cloud Proxy</strong>
                       You are currently offline/local. Requests are routed through secure cloud proxies (AllOrigins or CryptoKey.im) to bypass CORS restrictions.
                    </div>
                 </div>
              )}

              <div className="flex gap-2 sticky top-0 z-10 bg-slate-900/90 p-2 -mx-2 backdrop-blur-sm border-b border-slate-800/50">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://gutenberg.org/files/..."
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={handleFetchUrl} 
                  disabled={isLoading || !url}
                  variant="secondary"
                  className="whitespace-nowrap min-w-[100px]"
                >
                  {isLoading ? "Fetching..." : "Fetch"}
                </Button>
              </div>

              {urlInfo && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm animate-in fade-in">
                  <CheckCircle2 size={16} />
                  <span>Book loaded successfully ({urlInfo.pureText.length} chars)</span>
                </div>
              )}
              
              {/* Preset Books */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Recommended Books (Stable URLs)</p>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 border border-slate-800/50 rounded-lg p-2 bg-slate-900/30">
                  {PRESET_BOOKS.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => {
                        setUrl(book.url);
                      }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800 transition-colors text-left group hover:border-primary/50"
                    >
                      <BookOpen size={16} className="text-slate-500 group-hover:text-primary transition-colors flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-300 truncate group-hover:text-white transition-colors">{book.title}</div>
                        <div className="text-xs text-slate-500">{book.author}</div>
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        CLICK TO FILL
                      </div>
                    </button>
                  ))}
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
                        placeholder="Page-Line-Column (e.g., 123-10-5)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 font-mono"
                      />
                      <button
                        onClick={() => removePhysicalRow(index)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Remove line"
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
                  Add New Line
                </button>
              </div>

              <button
                onClick={handleGeneratePhysical}
                className="absolute top-[-40px] right-0 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                title="Generate Random Data"
              >
                <Dices size={14} />
                Generate
              </button>
            </div>
          ) : (
            <div className="relative">
              {(mode === 'file' || mode === 'url') && (
                 <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-400">
                    <span>Mnemonic Phrase (Key)</span>
                    <span className="text-xs text-slate-500 font-normal">(Required)</span>
                 </div>
              )}
              <textarea
                value={mnemonic}
                onChange={(e) => {
                  setMnemonic(e.target.value);
                  setError('');
                }}
                placeholder="Enter your 12-24 word mnemonic phrase here..."
                className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono resize-none transition-all"
                spellCheck={false}
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={handlePaste}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                  title="Paste from Clipboard"
                >
                  <Clipboard size={14} />
                  Paste
                </button>
                <button
                  onClick={handleGenerateMnemonic}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors flex items-center gap-1.5"
                  title="Generate Random Mnemonic"
                >
                  <Dices size={14} />
                  Generate
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
            Back
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
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
