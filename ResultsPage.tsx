import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LiveTimer from '@/components/ui/LiveTimer';

export default function ResultsPage() {
  const { draws, refreshDraws, setCurrentPage } = useStore();
  
  useEffect(() => {
    refreshDraws();
  }, [refreshDraws]);

  const completed = draws.filter(d => d.status === 'completed').slice(0, 15);
  const upcoming = draws.filter(d => d.status === 'upcoming').slice(0, 5);

  const getGameIcon = (gameType: string) => {
    if (gameType.includes('thailand')) return '🇹🇭';
    return '🎲';
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrentPage('dashboard')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">←</button>
        <h2 className="text-lg font-bold font-display">🏆 Results</h2>
      </div>

      {/* Upcoming Draws */}
      <h3 className="text-sm font-semibold text-white/50">📅 Upcoming Draws</h3>
      {upcoming.length === 0 ? (
        <GlassCard animate={false} className="text-center py-4">
          <p className="text-white/30 text-sm">No upcoming draws</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {upcoming.map((draw, i) => (
            <motion.div
              key={draw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard animate={false} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">
                    {getGameIcon(draw.gameType)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{draw.gameType.replace(/-/g, ' ').toUpperCase()}</p>
                    <p className="text-xs text-white/30">{draw.drawDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <LiveTimer targetDate={draw.closingTime} size="sm" showSeconds={false} onExpire={refreshDraws} />
                  <StatusBadge status={draw.status} className="mt-1" />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Completed Results */}
      <h3 className="text-sm font-semibold text-white/50 mt-6">✅ Recent Results</h3>
      {completed.length === 0 ? (
        <GlassCard animate={false} className="text-center py-4">
          <p className="text-white/30 text-sm">No results yet</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {completed.map((draw, i) => (
            <motion.div
              key={draw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassCard glow={i === 0} animate={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${i === 0 ? 'bg-gold/20' : 'bg-gold/10'} flex items-center justify-center text-xl`}>
                      {getGameIcon(draw.gameType)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{draw.gameType.replace(/-/g, ' ').toUpperCase()}</p>
                      <p className="text-xs text-white/30">{draw.drawDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/30">Result</p>
                    <motion.p
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className={`text-3xl font-bold font-display ${i === 0 ? 'gradient-gold-text' : 'text-gold'}`}
                    >
                      {draw.result}
                    </motion.p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Result Legend */}
      <GlassCard animate={false} className="mt-4">
        <h4 className="text-sm font-semibold mb-2">📊 How Results Work</h4>
        <ul className="space-y-1 text-xs text-white/50">
          <li>• <span className="text-gold">Thailand 2D/3UP:</span> Last 2 or 3 digits of Thai Lottery</li>
          <li>• <span className="text-gold">Kalyan Single:</span> Single digit from Matka result</li>
          <li>• <span className="text-gold">Kalyan Jodi:</span> 2-digit pair from Matka</li>
          <li>• <span className="text-gold">Kalyan Patti:</span> 3-digit pattern from Matka</li>
        </ul>
      </GlassCard>
    </div>
  );
}
