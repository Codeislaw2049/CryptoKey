import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)} // Mobile tap support
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 mt-2 text-xs font-medium text-white bg-slate-800 border border-slate-700 rounded-lg shadow-xl bottom-full left-1/2 transform -translate-x-1/2 mb-2 animate-in fade-in zoom-in-95 duration-200">
          {content}
          <div className="absolute w-2 h-2 bg-slate-800 border-r border-b border-slate-700 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1"></div>
        </div>
      )}
    </div>
  );
};
