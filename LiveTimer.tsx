import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LiveTimerProps {
  targetDate: Date | string;
  onExpire?: () => void;
  className?: string;
  showSeconds?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LiveTimer({
  targetDate,
  onExpire,
  className = '',
  showSeconds = true,
  size = 'md',
}: LiveTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const target = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      if (diff === 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        onExpire?.();
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft({ hours, minutes, seconds, expired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  const boxSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (timeLeft.expired) {
    return (
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`text-red-400 font-bold ${sizeClasses[size]} ${className}`}
      >
        Closed
      </motion.div>
    );
  }

  const TimerBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className={`${boxSizes[size]} rounded-xl bg-gradient-to-br from-gold/20 to-orange/10 border border-gold/20 flex items-center justify-center`}
      >
        <span className={`font-bold font-display gradient-gold-text ${sizeClasses[size]}`}>
          {value.toString().padStart(2, '0')}
        </span>
      </motion.div>
      <span className="text-[9px] text-white/30 mt-1">{label}</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {timeLeft.hours > 0 && (
        <>
          <TimerBox value={timeLeft.hours} label="HRS" />
          <span className={`${sizeClasses[size]} text-gold/50`}>:</span>
        </>
      )}
      <TimerBox value={timeLeft.minutes} label="MIN" />
      {showSeconds && (
        <>
          <span className={`${sizeClasses[size]} text-gold/50`}>:</span>
          <TimerBox value={timeLeft.seconds} label="SEC" />
        </>
      )}
    </div>
  );
}
