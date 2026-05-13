import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import LiveTimer from '@/components/ui/LiveTimer';
import { formatRelativeTime } from '@/lib/dateUtils';

export default function DashboardPage() {
  const { user, showBalance, toggleBalance, transactions, bets, draws, setCurrentPage, setActiveTab, notifications } = useStore();
  const { rate, lastUpdated, convertSARtoBDT } = useExchangeRate();
  const [greeting, setGreeting] = useState('Welcome');

  // Dynamic greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // User-specific data
  const userTransactions = transactions.filter(t => t.userId === user?.id);
  const userBets = bets.filter(b => b.userId === user?.id);
  const unreadNotifications = notifications.filter(n => n.userId === user?.id && !n.read).length;

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalDeposits = userTransactions
      .filter(t => t.type === 'deposit' && t.status === 'approved')
      .reduce((a, b) => a + b.amount, 0);
    const totalWithdraws = userTransactions
      .filter(t => t.type === 'withdraw' && t.status === 'approved')
      .reduce((a, b) => a + b.amount, 0);
    const totalWins = userTransactions
      .filter(t => t.type === 'win')
      .reduce((a, b) => a + b.amount, 0);
    const totalBetAmount = userBets.reduce((a, b) => a + b.amount, 0);
    const wonBets = userBets.filter(b => b.status === 'won');
    const winRate = userBets.length > 0 ? (wonBets.length / userBets.length) * 100 : 0;
    const pendingBets = userBets.filter(b => b.status === 'pending').length;
    const pendingDeposits = userTransactions.filter(t => t.type === 'deposit' && t.status === 'pending').length;

    // Streak calculation
    let currentStreak = 0;
    const sortedBets = [...userBets]
      .filter(b => b.status !== 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const bet of sortedBets) {
      if (bet.status === 'won') currentStreak++;
      else break;
    }

    return {
      totalDeposits,
      totalWithdraws,
      totalWins,
      totalBetAmount,
      totalBets: userBets.length,
      wonBetsCount: wonBets.length,
      winRate,
      pendingBets,
      pendingDeposits,
      currentStreak,
      netProfit: totalWins - totalBetAmount,
    };
  }, [userTransactions, userBets]);

  // Next draw
  const nextDraw = draws.find(d => d.status === 'upcoming');

  const quickActions = [
    { icon: '💳', label: 'Add Money', page: 'add-money', color: 'from-green-500/20 to-emerald-500/20', badge: analytics.pendingDeposits > 0 ? analytics.pendingDeposits : null },
    { icon: '💸', label: 'Withdraw', page: 'withdraw', color: 'from-blue-500/20 to-cyan-500/20' },
    { icon: '🎰', label: 'Play Now', page: 'lottery', tab: 'lottery', color: 'from-gold/20 to-orange/20', highlight: true },
    { icon: '🎫', label: 'My Bets', page: 'bet-history', color: 'from-purple-500/20 to-pink-500/20', badge: analytics.pendingBets > 0 ? analytics.pendingBets : null },
    { icon: '🏆', label: 'Results', page: 'results', color: 'from-red-500/20 to-orange-500/20' },
    { icon: '📊', label: 'History', page: 'transactions', tab: 'history', color: 'from-indigo-500/20 to-blue-500/20' },
    { icon: '✅', label: 'KYC', page: 'kyc', color: 'from-teal-500/20 to-green-500/20', badge: user?.kycStatus === 'none' ? '!' : null },
    { icon: '⚙️', label: 'Profile', page: 'profile', tab: 'profile', color: 'from-gray-500/20 to-slate-500/20' },
  ];

  const recentTx = userTransactions.slice(0, 4);

  const navigate = (page: string, tab?: string) => {
    setCurrentPage(page);
    if (tab) setActiveTab(tab);
  };

  // Get performance trend (simplified)
  const performanceData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayBets = userBets.filter(b => {
        const betDate = new Date(b.createdAt);
        return betDate.toDateString() === date.toDateString();
      });
      const dayWins = dayBets.filter(b => b.status === 'won').reduce((a, b) => a + b.potentialWin, 0);
      const dayLosses = dayBets.filter(b => b.status === 'lost').reduce((a, b) => a + b.amount, 0);
      return { date: date.toLocaleDateString('en-US', { weekday: 'short' }), value: dayWins - dayLosses };
    });
    return last7Days;
  }, [userBets]);

  const maxPerformance = Math.max(...performanceData.map(d => Math.abs(d.value)), 100);

  return (
    <div className="space-y-5 pb-4">
      {/* Welcome & Rate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-white/40 text-sm">{greeting},</p>
          <h2 className="text-xl font-bold font-display">{user?.name?.split(' ')[0] || 'User'}</h2>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-green-400">Live</span>
          </div>
          <p className="text-xs text-gold font-medium">1 SAR = {rate.toFixed(2)} BDT</p>
          <p className="text-[9px] text-white/20">{new Date(lastUpdated).toLocaleTimeString()}</p>
        </div>
      </motion.div>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.08) 50%, rgba(255,215,0,0.04) 100%)',
          border: '1px solid rgba(255,215,0,0.2)',
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gold/[0.06] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange/[0.04] rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-4 w-20 h-20 bg-gold/[0.03] rounded-full blur-xl animate-float" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center text-black text-xs font-bold">
                TN
              </div>
              <p className="text-white/50 text-sm">Total Balance</p>
            </div>
            <button onClick={toggleBalance} className="text-white/40 hover:text-white/70 transition-colors text-lg">
              {showBalance ? '👁️' : '🔒'}
            </button>
          </div>

          <div className="mb-1">
            {showBalance ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-display gradient-gold-text">
                  <AnimatedCounter value={(user?.balance || 0) + (user?.bonusBalance || 0)} prefix="" decimals={2} />
                </span>
                <span className="text-gold/60 text-sm font-medium">SAR</span>
              </div>
            ) : (
              <div className="text-4xl font-bold tracking-widest text-white/20">••••••</div>
            )}
          </div>

          {showBalance && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 space-y-0.5"
            >
              <div className="flex items-center gap-3 text-xs">
                <span className="text-white/30">Available: <span className="text-white/60 font-medium">{(user?.balance || 0).toFixed(2)}</span></span>
                {(user?.bonusBalance || 0) > 0 && (
                  <span className="text-pink-400/70">Bonus: <span className="text-pink-400 font-medium">{(user?.bonusBalance || 0).toFixed(2)}</span></span>
                )}
              </div>
              <p className="text-white/25 text-[11px]">
                ≈ ৳{convertSARtoBDT((user?.balance || 0) + (user?.bonusBalance || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT
              </p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('add-money')}
              className="flex-1 py-3 rounded-xl gradient-gold text-black font-semibold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2"
            >
              <span>+</span> Add Money
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('withdraw')}
              className="flex-1 py-3 rounded-xl border border-gold/30 text-gold font-semibold text-sm hover:bg-gold/5 transition-all"
            >
              Withdraw
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Next Draw Timer */}
      {nextDraw && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard glow className="flex items-center justify-between py-4" animate={false}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-orange/10 flex items-center justify-center text-2xl">
                🎰
              </div>
              <div>
                <p className="text-xs text-white/40">Next Draw</p>
                <p className="text-sm font-semibold">{nextDraw.gameType.replace(/-/g, ' ').toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <LiveTimer targetDate={nextDraw.closingTime} size="sm" showSeconds={false} />
              <button 
                onClick={() => navigate('lottery', 'lottery')}
                className="text-xs text-gold hover:underline mt-1"
              >
                Play Now →
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Deposits', value: analytics.totalDeposits, icon: '📥', color: 'text-green-400', format: 'currency' },
          { label: 'Total Wins', value: analytics.totalWins, icon: '🏆', color: 'text-gold', format: 'currency' },
          { label: 'Win Rate', value: analytics.winRate, icon: '📊', suffix: '%', color: 'text-purple-400', format: 'percent' },
          { label: 'Win Streak', value: analytics.currentStreak, icon: '🔥', color: 'text-orange-400', format: 'number' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <GlassCard className="text-center py-4" animate={false}>
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-lg font-bold font-display mt-1 ${stat.color}`}>
                {stat.format === 'currency' 
                  ? stat.value.toFixed(0) + ' SAR'
                  : stat.format === 'percent'
                  ? stat.value.toFixed(0) + '%'
                  : stat.value}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Performance Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <GlassCard animate={false}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">📈 7-Day Performance</h3>
            <span className={`text-xs font-medium ${analytics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {analytics.netProfit >= 0 ? '+' : ''}{analytics.netProfit.toFixed(0)} SAR
            </span>
          </div>
          <div className="h-20 flex items-end gap-1">
            {performanceData.map((day, i) => {
              const height = (Math.abs(day.value) / maxPerformance) * 100;
              const isPositive = day.value >= 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 5)}%` }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }}
                    className={`w-full rounded-t-lg ${
                      isPositive 
                        ? 'bg-gradient-to-t from-green-500/30 to-green-400/60' 
                        : 'bg-gradient-to-t from-red-500/30 to-red-400/60'
                    }`}
                  />
                  <span className="text-[8px] text-white/30">{day.date}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-sm font-semibold text-white/60 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.03 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(action.page, action.tab)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-300 ${
                action.highlight 
                  ? 'bg-gradient-to-br from-gold/10 to-orange/5 border-gold/20 hover:border-gold/40' 
                  : 'bg-white/[0.02] border-white/[0.04] hover:border-gold/20 hover:bg-white/[0.04]'
              }`}
            >
              {action.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-red text-[9px] font-bold flex items-center justify-center">
                  {action.badge}
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-lg`}>
                {action.icon}
              </div>
              <span className="text-[10px] text-white/50 font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/60">Recent Activity</h3>
          <button
            onClick={() => navigate('transactions', 'history')}
            className="text-xs text-gold/60 hover:text-gold"
          >
            See All →
          </button>
        </div>

        <AnimatePresence>
          {recentTx.length === 0 ? (
            <GlassCard className="text-center py-8" animate={false}>
              <span className="text-4xl">📭</span>
              <p className="text-white/40 mt-2 text-sm">No transactions yet</p>
              <button 
                onClick={() => navigate('add-money')}
                className="mt-3 text-xs text-gold hover:underline"
              >
                Make your first deposit →
              </button>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    tx.type === 'deposit' ? 'bg-green-500/10' :
                    tx.type === 'withdraw' ? 'bg-blue-500/10' :
                    tx.type === 'win' ? 'bg-gold/10' :
                    tx.type === 'bet' ? 'bg-purple-500/10' :
                    tx.type === 'bonus' ? 'bg-pink-500/10' :
                    'bg-gray-500/10'
                  }`}>
                    {tx.type === 'deposit' ? '📥' :
                     tx.type === 'withdraw' ? '📤' :
                     tx.type === 'win' ? '🏆' :
                     tx.type === 'bet' ? '🎰' :
                     tx.type === 'bonus' ? '🎁' : '↩️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium capitalize">{tx.type}</p>
                      <StatusBadge status={tx.status} />
                    </div>
                    <p className="text-[10px] text-white/30">{formatRelativeTime(tx.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${
                      ['deposit', 'win', 'bonus', 'refund'].includes(tx.type)
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {['deposit', 'win', 'bonus', 'refund'].includes(tx.type) ? '+' : '-'}{tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-white/30">SAR</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Notifications Badge */}
      {unreadNotifications > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => navigate('notifications')}
          className="cursor-pointer"
        >
          <GlassCard animate={false} className="flex items-center justify-between py-3 border-gold/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-xl animate-pulse">
                🔔
              </div>
              <div>
                <p className="text-sm font-medium">{unreadNotifications} New Notification{unreadNotifications !== 1 ? 's' : ''}</p>
                <p className="text-[10px] text-white/30">Tap to view</p>
              </div>
            </div>
            <span className="text-white/30">›</span>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
