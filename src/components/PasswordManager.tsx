import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPasswords, deletePassword, PasswordItem } from '../utils/passwordStorage';
import { Trash2, Copy, Lock, Calendar, Search, KeyRound } from 'lucide-react';
import { Button } from './ui/Button';

interface PasswordManagerProps {
  onDecrypt: (ciphertext: string) => void;
}

export const PasswordManager = ({ onDecrypt }: PasswordManagerProps) => {
  const { t } = useTranslation();
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setPasswords(getPasswords());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm(t('passwordManager.confirmDelete', 'Are you sure you want to delete this password?'))) {
      deletePassword(id);
      setPasswords(getPasswords());
    }
  };

  const filtered = passwords.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
               <KeyRound className="text-primary" />
               {t('passwordManager.title', 'Password Manager')}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{t('passwordManager.subtitle', 'Manage your encrypted passwords securely')}</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
             <input 
               type="text" 
               value={search}
               onChange={e => setSearch(e.target.value)}
               placeholder={t('common.search', 'Search...')}
               className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm text-white focus:ring-1 focus:ring-primary outline-none"
             />
          </div>
       </div>

       {passwords.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
             <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound size={40} className="text-slate-600" />
             </div>
             <h3 className="text-lg font-medium text-slate-300 mb-2">{t('passwordManager.emptyTitle', 'No passwords saved')}</h3>
             <p className="max-w-xs mx-auto">{t('passwordManager.emptyDesc', 'Use the "Password Book" tool to encrypt and save your passwords here.')}</p>
          </div>
       ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>{t('common.noResults', 'No results found')}</p>
          </div>
       ) : (
          <div className="grid grid-cols-1 gap-3">
             {filtered.map(p => (
                <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                   <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg truncate pr-4">{p.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                         <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(p.createdAt).toLocaleDateString()}
                         </span>
                         <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-slate-500 border border-slate-800">
                            {t('passwordManager.rowLabel', { row: p.realRowIndex + 1 }) || `ROW: ${p.realRowIndex + 1}`}
                         </span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button variant="ghost" onClick={() => {
                        navigator.clipboard.writeText(p.ciphertext);
                        // Optional: Show toast
                      }} title={t('passwordManager.copyCiphertext', 'Copy Ciphertext')} className="text-slate-400 hover:text-white">
                         <Copy size={18} />
                      </Button>
                      <Button variant="primary" onClick={() => onDecrypt(p.ciphertext)} className="bg-primary/10 text-primary hover:bg-primary hover:text-slate-900 border border-primary/20 hover:border-primary">
                         <Lock size={16} className="mr-2" />
                         {t('passwordManager.decrypt', 'Decrypt')}
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete(p.id)} className="text-slate-500 hover:text-red-400 hover:bg-red-900/10">
                         <Trash2 size={18} />
                      </Button>
                   </div>
                </div>
             ))}
          </div>
       )}
    </div>
  );
};
