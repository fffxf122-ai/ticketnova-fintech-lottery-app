import { ChangeEvent, ReactNode } from 'react';

interface InputProps {
  label?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  min?: string;
  max?: string;
}

export default function Input({
  label, value, onChange, placeholder, type = 'text', icon,
  error, disabled, className = '', multiline, rows = 3, maxLength, min, max
}: InputProps) {
  const inputStyles = `w-full bg-white/[0.03] border ${error ? 'border-accent-red/40' : 'border-white/[0.08]'} rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all duration-300 ${icon ? 'pl-12' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm text-white/60 font-medium">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            {icon}
          </div>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            disabled={disabled}
            className={`${inputStyles} resize-none`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            min={min}
            max={max}
            className={inputStyles}
          />
        )}
      </div>
      {error && <p className="text-accent-red text-xs">{error}</p>}
    </div>
  );
}
