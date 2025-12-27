import React, { useState } from 'react';
import { Shield, Lock, CheckCircle } from 'lucide-react';

export const MilitaryGradeBadge: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all duration-300 cursor-default
          ${isHovered 
            ? 'bg-blue-900/90 border-blue-500 text-blue-100 scale-105 shadow-blue-500/20' 
            : 'bg-slate-900/80 border-slate-700 text-slate-400'}
        `}
      >
        <div className="relative">
          <Shield size={18} className={`transition-colors ${isHovered ? 'text-blue-400' : 'text-slate-500'}`} />
          {isHovered && (
            <div className="absolute inset-0 animate-ping opacity-75">
               <Shield size={18} className="text-blue-400" />
            </div>
          )}
        </div>
        
        <span className={`text-xs font-bold transition-colors ${isHovered ? 'text-white' : ''}`}>
          MILITARY-GRADE SECURITY
        </span>
        
        {isHovered && (
          <CheckCircle size={14} className="text-green-400 animate-in fade-in zoom-in duration-300" />
        )}
      </div>

      {/* Expanded Info on Hover */}
      <div 
        className={`
          mt-2 p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 max-w-[200px] text-right backdrop-blur-md transition-all duration-300 origin-bottom-right
          ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}
        `}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-end gap-2 text-blue-300 font-bold">
            <span>AES-256-GCM</span>
            <Lock size={12} />
          </div>
          <p>Zero-Knowledge Architecture</p>
          <p>Client-Side Processing Only</p>
          <p>No Data Logs Persisted</p>
        </div>
      </div>
    </div>
  );
};
