import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-sm font-medium text-slate-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-surface border border-slate-700 rounded-lg px-4 py-3 text-base md:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
          autoComplete={props.autoComplete || "off"}
          spellCheck={props.spellCheck || false}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
