import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

export default function Header() {
  const { user, notifications, setCurrentPage } = useStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 bg-dark/80 backdrop-blur-xl border-b border-white/[0.04]"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
            <span className="text-black font-black text-sm">TN</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sm gradient-gold-text">TicketNova</h1>
            <p className="text-[10px] text-white/40">Premium Lottery</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage('notifications')}
            className="relative w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-gold text-[10px] text-black font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentPage('profile')}
            className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-gold/20 to-orange/20 flex items-center justify-center text-sm font-bold"
          >
            {user?.name?.charAt(0) || '?'}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
