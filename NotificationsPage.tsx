import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/dateUtils';

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, setCurrentPage, user } = useStore();
  
  // Filter to user's notifications
  const userNotifications = notifications.filter(n => n.userId === user?.id);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (id: string, link?: string) => {
    markNotificationRead(id);
    if (link) {
      setCurrentPage(link);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('dashboard')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">←</button>
          <h2 className="text-lg font-bold font-display">🔔 Notifications</h2>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllNotificationsRead}
            className="text-xs text-gold/60 hover:text-gold"
          >
            Mark all read
          </button>
        )}
      </div>

      {unreadCount > 0 && (
        <GlassCard animate={false} glow className="text-center py-3">
          <p className="text-sm text-gold">
            You have <span className="font-bold">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </GlassCard>
      )}

      {userNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="text-center py-12" animate={false}>
            <span className="text-5xl">🔔</span>
            <p className="text-white/40 mt-3 text-sm">No notifications yet</p>
            <p className="text-white/20 text-xs mt-1">You'll be notified about deposits, wins, and more</p>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {userNotifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => handleNotificationClick(n.id, n.link)}
            >
              <GlassCard
                animate={false}
                className={`cursor-pointer transition-all hover:border-gold/10 ${!n.read ? 'border-gold/20 bg-gold/[0.02]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    n.type === 'success' ? 'bg-green-500/10' :
                    n.type === 'error' ? 'bg-red-500/10' :
                    n.type === 'warning' ? 'bg-yellow-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    {n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${!n.read ? 'text-white' : 'text-white/70'}`}>{n.title}</p>
                      {!n.read && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-gold"
                        />
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${!n.read ? 'text-white/50' : 'text-white/30'}`}>{n.message}</p>
                    <p className="text-[10px] text-white/20 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {n.link && (
                    <span className="text-white/20 text-sm">›</span>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {userNotifications.length > 0 && (
        <p className="text-center text-white/20 text-xs mt-4">
          Showing {userNotifications.length} notification{userNotifications.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
