import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'gold' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  icon?: ReactNode;
}

export default function Button({
  children, onClick, variant = 'gold', size = 'md', fullWidth = false,
  disabled = false, loading = false, className = '', type = 'button', icon
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden';

  const variants = {
    gold: 'gradient-gold text-black hover:shadow-lg hover:shadow-yellow-500/20',
    outline: 'border border-gold/30 text-gold hover:bg-gold/10',
    ghost: 'text-white/70 hover:text-white hover:bg-white/5',
    danger: 'bg-accent-red/20 text-accent-red border border-accent-red/20 hover:bg-accent-red/30',
    success: 'bg-accent-green/20 text-accent-green border border-accent-green/20 hover:bg-accent-green/30',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
}
