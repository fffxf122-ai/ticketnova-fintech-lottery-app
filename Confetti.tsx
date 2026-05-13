import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  onComplete?: () => void;
}

const colors = [
  '#FFD700', // Gold
  '#FF8C00', // Orange
  '#00E676', // Green
  '#2196F3', // Blue
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#FFFFFF', // White
];

export default function Confetti({ active, duration = 3000, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 720 - 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration, onComplete]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                top: '-10%',
                left: `${piece.x}%`,
                rotate: 0,
                scale: piece.scale,
              }}
              animate={{
                top: '110%',
                rotate: piece.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2 + Math.random(),
                delay: piece.delay,
                ease: 'easeIn',
              }}
              className="absolute"
              style={{
                width: 10,
                height: 10,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [active, setActive] = useState(false);

  const trigger = () => {
    setActive(true);
  };

  const onComplete = () => {
    setActive(false);
  };

  return { active, trigger, onComplete };
}
