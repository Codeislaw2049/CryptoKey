import { Card } from '../ui/Card';
import { BookOpen, KeyRound, FileText, Globe } from 'lucide-react';

interface ModeSelectionProps {
  onSelect: (mode: 'general' | 'mnemonic' | 'file' | 'url') => void;
}

export const ModeSelection = ({ onSelect }: ModeSelectionProps) => {

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Select Recovery Mode</h2>
        <p className="text-slate-400">Choose how you want to recover your data</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Mnemonic Mode (Virtual Book) */}
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('mnemonic')}
        >
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <KeyRound className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Mnemonic Protection</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                Protect & generate standard BIP39 mnemonics.
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• Standard BIP39 Wordlist Compliance</li>
              <li>• Index-Based Mnemonic Encryption</li>
              <li>• Bank-Grade Security</li>
            </ul>
          </div>
        </Card>

        {/* Physical Book Mode (Manual) */}
        <Card 
          className="cursor-pointer hover:border-warning/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('general')}
        >
          <div className="absolute inset-0 bg-warning/5 group-hover:bg-warning/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-warning/10 text-warning group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Physical / Virtual Book</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                Use a real physical book or a virtual one.
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• Manual Entry</li>
              <li>• Your Own Book</li>
              <li>• Flexible & Deniable</li>
            </ul>
          </div>
        </Card>

        {/* Digital Book (File) Mode */}
        <Card 
          className="cursor-pointer hover:border-blue-500/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('file')}
        >
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Digital Book (TXT)</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                Use a local text file (e.g., Project Gutenberg) as the key.
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• Local Processing</li>
              <li>• No Upload Required</li>
              <li>• Works Offline</li>
            </ul>
          </div>
        </Card>

        {/* Online Book (URL) Mode */}
        <Card 
          className="cursor-pointer hover:border-green-500/50 transition-all group relative overflow-hidden"
          onClick={() => onSelect('url')}
        >
          <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 rounded-full bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Online Book (URL)</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">
                Fetch book content from a public URL.
              </p>
            </div>
            <ul className="text-xs md:text-sm text-slate-500 space-y-1">
              <li>• Remote Content</li>
              <li>• Convenient Access</li>
              <li>• Dynamic Reference</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};
