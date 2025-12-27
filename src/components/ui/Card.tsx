import React from 'react';
import { cn } from './Button';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 md:p-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
