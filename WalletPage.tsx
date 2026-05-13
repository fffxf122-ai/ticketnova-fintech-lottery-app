import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

export default function WalletPage() {
  const { user, showBalance, toggleBalance, transactions, bets, setCurrentPage } = useStore();
  const { rate, convertSARtoBDT, refreshRate, source } = useExchangeRate();

  // Filter to user's data
  const userTransactions = transactions.filter(t => t.userId === user?.id);
  const userBets = bets.filter(b => b.userId === user?.id);

  // Analytics
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
    const totalBets = userBets.reduce((a, b) => a + b.amount, 0);
    const totalBonuses = userTransactions
      .filter(t => t.type === 'bonus')
      .reduce((a, b) => a + b.amount, 0);
    
    const pendingDeposits = userTransactions
      .filter(t => t.type === 'deposit' && t.status === 'pending')
      .reduce((a, b) => a + b.amount, 0);
    const pendingWithdrawals = userTransactions
      .filter(t => t.type === 'withdraw' && t.status === 'pending')
      .reduce((a, b) => a + b.amount, 0);

    return {
      totalDeposits,
      totalWithdraws,
      totalWins,
      totalBets,
      totalBonuses,
      pendingDeposits,
      pendingWithdrawals,
      netFlow: totalDeposits - totalWithdraws,
      profit: totalWins - totalBets,
    };
  }, [userTransactions, userBets]);

  const totalBalance = (user?.balance || 0) + (user?.bonusBalance || 0);
  const bdtBalance = convertSARtoBDT(totalBalance);

  // Generate performance data
  const performanceData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayTransactions = userTransactions.filter(t => {
        const txDate = new Date(t.createdAt);
        return txDate.toDateString() === date.toDateString();
      });
      const income = dayTransactions
        .filter(t => ['deposit', 'win', 'bonus'].includes(t.type) && t.status === 'approved')
        .reduce((a, b) => a + b.amount, 0);
      const expense = dayTransactions
        .filter(t => ['withdraw', 'bet'].includes(t.type) && t.status === 'approved')
        .reduce((a, b) => a + b.amount, 0);
      return { 
        date: date.toLocaleDateString('en-US', { weekday: 'short' }), 
        income, 
        expense,
        net: income - expense 
      };
    });
    return last7Days;
  }, [userTransactions]);

  const maxAmount = Math.max(...performanceData.map(d => Math.max(d.income, d.expense)), 100);

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold font-display">💰 Wallet</h2>

      {/* Main Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.08) 50%, rgba(255,215,0,0.05) 100%)',
          border: '1px solid rgba(255,215,0,0.2)',
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gold/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange/[0.05] rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-sm">Total Balance</p>
            <button onClick={toggleBalance} className="text-lg">{showBalance ? '👁️' : '🔒'}</button>
          </div>

          {showBalance ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-display gradient-gold-text">
                  <AnimatedCounter value={totalBalance} decimals={2} />
                </span>
                <span className="text-gold/50 font-medium">SAR</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-[10px] text-white/30">Available</p>
                  <p className="text-sm font-semibold text-white/80">{(user?.balance || 0).toFixed(2)} SAR</p>
                </div>
                <div className="w-px h-6 bg-white/[0.06]" />
                <div>
                  <p className="text-[10px] text-pink-400/70">Bonus</p>
                  <p className="text-sm font-semibold text-pink-400">{(user?.bonusBalance || 0).toFixed(2)} SAR</p>
                </div>
              </div>
              <p className="text-white/25 text-xs mt-1">≈ ৳{bdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT</p>
            </>
          ) : (
            <p className="text-4xl font-bold tracking-widest text-white/20">••••••</p>
          )}

          <div className="flex gap-3 mt-5">
            <Button onClick={() => setCurrentPage('add-money')} fullWidth>+ Add Money</Button>
            <Button onClick={() => setCurrentPage('withdraw')} variant="outline" fullWidth>Withdraw</Button>
          </div>
        </div>
      </motion.div>

      {/* Live Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard animate={false} className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <p className="text-sm font-medium">Live Exchange Rate</p>
              <p className="text-xs text-white/30">Source: {source}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gold">1 SAR = {rate.toFixed(2)} BDT</p>
            <div className="flex items-center gap-1 justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400">Live</span>
              <button onClick={refreshRate} className="ml-2 text-[10px] text-white/30 hover:text-white/50">
                ↻
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Pending Amounts */}
      {(analytics.pendingDeposits > 0 || analytics.pendingWithdrawals > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard animate={false} className="border-yellow-500/20">
            <h4 className="text-sm font-semibold mb-3 text-yellow-400">⏳ Pending</h4>
            <div className="grid grid-cols-2 gap-3">
              {analytics.pendingDeposits > 0 && (
                <div className="p-2 rounded-xl bg-yellow-500/5">
                  <p className="text-xs text-white/40">Pending Deposits</p>
                  <p className="text-sm font-bold text-yellow-400">{analytics.pendingDeposits.toFixed(2)} SAR</p>
                </div>
              )}
              {analytics.pendingWithdrawals > 0 && (
                <div className="p-2 rounded-xl bg-yellow-500/5">
                  <p className="text-xs text-white/40">Pending Withdrawals</p>
                  <p className="text-sm font-bold text-yellow-400">{analytics.pendingWithdrawals.toFixed(2)} SAR</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Wallet Analytics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-semibold text-white/50 mb-3">📊 Analytics</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Deposits', value: analytics.totalDeposits, icon: '📥', color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Total Withdrawals', value: analytics.totalWithdraws, icon: '📤', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Total Winnings', value: analytics.totalWins, icon: '🏆', color: 'text-gold', bg: 'bg-gold/10' },
            { label: 'Total Bets', value: analytics.totalBets, icon: '🎰', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
            >
              <GlassCard animate={false} className="text-center py-4">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} mx-auto flex items-center justify-center text-xl mb-2`}>
                  {stat.icon}
                </div>
                <p className={`text-lg font-bold font-display ${stat.color}`}>{stat.value.toFixed(2)}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{stat.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Profit/Loss Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard animate={false}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Betting Performance</p>
              <p className={`text-xl font-bold font-display ${analytics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.profit >= 0 ? '+' : ''}{analytics.profit.toFixed(2)} SAR
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Bonuses Earned</p>
              <p className="text-xl font-bold text-pink-400">{analytics.totalBonuses.toFixed(2)} SAR</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* 7-Day Performance Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <GlassCard animate={false}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">📈 7-Day Activity</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" /> Income
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Expense
              </span>
            </div>
          </div>
          <div className="h-32 flex items-end gap-2">
            {performanceData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '100px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.income / maxAmount) * 100}%` }}
                    transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-green-500/30 to-green-400/60"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.expense / maxAmount) * 100}%` }}
                    transition={{ delay: 0.55 + i * 0.05, duration: 0.5 }}
                    className="w-full rounded-b-lg bg-gradient-to-b from-red-500/30 to-red-400/60"
                  />
                </div>
                <span className="text-[8px] text-white/30">{day.date}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => setCurrentPage('transactions')}>
          📋 Transaction History
        </Button>
        <Button variant="outline" onClick={() => setCurrentPage('bet-history')}>
          🎫 Bet History
        </Button>
      </div>
    </div>
  );
}
