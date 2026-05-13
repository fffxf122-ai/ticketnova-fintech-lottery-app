import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/dateUtils';
import { generateBetReceipt, downloadReceipt, printReceipt, BetReceipt } from '@/lib/receiptGenerator';
import toast from 'react-hot-toast';

export default function BetHistoryPage() {
  const { bets, user, setCurrentPage } = useStore();
  const [filter, setFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<BetReceipt | null>(null);

  // Only show user's bets
  const userBets = bets.filter(b => b.userId === user?.id);

  const filtered = useMemo(() => {
    return userBets
      .filter(b => filter === 'all' || b.status === filter)
      .filter(b => gameFilter === 'all' || b.gameType === gameFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userBets, filter, gameFilter]);

  const gameTypes = ['all', 'thailand-2d', 'thailand-3up', 'kalyan-single', 'kalyan-jodi', 'kalyan-patti'];
  const statusTypes = ['all', 'pending', 'won', 'lost', 'cancelled'];

  // Stats
  const stats = useMemo(() => {
    const totalBets = userBets.length;
    const totalWon = userBets.filter(b => b.status === 'won').length;
    const totalSpent = userBets.reduce((a, b) => a + b.amount, 0);
    const totalWinnings = userBets.filter(b => b.status === 'won').reduce((a, b) => a + b.potentialWin, 0);
    const winRate = totalBets > 0 ? (totalWon / totalBets) * 100 : 0;
    const biggestWin = Math.max(...userBets.filter(b => b.status === 'won').map(b => b.potentialWin), 0);
    const averageBet = totalBets > 0 ? totalSpent / totalBets : 0;
    return { totalBets, totalWon, totalSpent, totalWinnings, winRate, profit: totalWinnings - totalSpent, biggestWin, averageBet };
  }, [userBets]);

  const handleViewReceipt = (betId: string) => {
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      const receipt = generateBetReceipt(bet);
      setReceiptModal(receipt);
    }
  };

  const handleDownloadReceipt = () => {
    if (receiptModal) {
      downloadReceipt(receiptModal);
      toast.success('Receipt downloaded!');
    }
  };

  const handlePrintReceipt = () => {
    if (receiptModal) {
      printReceipt(receiptModal);
    }
  };

  const handleShareReceipt = async () => {
    if (receiptModal && navigator.share) {
      try {
        await navigator.share({
          title: `TicketNova Bet Receipt - ${receiptModal.receiptId}`,
          text: `My bet on ${receiptModal.gameType} - Number: ${receiptModal.number}`,
          url: window.location.href,
        });
      } catch {
        toast.error('Sharing cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      const text = `TicketNova Bet Receipt\n${receiptModal?.receiptId}\nGame: ${receiptModal?.gameType}\nNumber: ${receiptModal?.number}\nAmount: ${receiptModal?.amount} SAR`;
      navigator.clipboard.writeText(text);
      toast.success('Receipt copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('dashboard')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm hover:bg-white/10 transition-colors">←</button>
          <h2 className="text-lg font-bold font-display">🎫 Bet History</h2>
        </div>
        <button 
          onClick={() => setCurrentPage('lottery')}
          className="text-xs text-gold/60 hover:text-gold px-3 py-1.5 rounded-xl bg-gold/5"
        >
          + New Bet
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <GlassCard animate={false} className="text-center py-3">
          <p className="text-lg font-bold gradient-gold-text">{stats.totalBets}</p>
          <p className="text-[10px] text-white/40">Total Bets</p>
        </GlassCard>
        <GlassCard animate={false} className="text-center py-3">
          <p className="text-lg font-bold text-green-400">{stats.totalWon}</p>
          <p className="text-[10px] text-white/40">Wins</p>
        </GlassCard>
        <GlassCard animate={false} className="text-center py-3">
          <p className="text-lg font-bold text-purple-400">{stats.winRate.toFixed(0)}%</p>
          <p className="text-[10px] text-white/40">Win Rate</p>
        </GlassCard>
      </div>

      {/* Extended Stats */}
      <GlassCard animate={false}>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-xl bg-white/[0.02]">
            <p className="text-xs text-white/40">Total Spent</p>
            <p className="text-sm font-bold">{stats.totalSpent.toFixed(0)} SAR</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/[0.02]">
            <p className="text-xs text-white/40">Total Winnings</p>
            <p className="text-sm font-bold text-gold">{stats.totalWinnings.toFixed(0)} SAR</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/[0.02]">
            <p className="text-xs text-white/40">Net Profit</p>
            <p className={`text-sm font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.profit >= 0 ? '+' : ''}{stats.profit.toFixed(0)} SAR
            </p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/[0.02]">
            <p className="text-xs text-white/40">Biggest Win</p>
            <p className="text-sm font-bold text-gold">{stats.biggestWin.toFixed(0)} SAR</p>
          </div>
        </div>
      </GlassCard>

      {/* Game Filter */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {gameTypes.map(g => (
          <button
            key={g}
            onClick={() => setGameFilter(g)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              gameFilter === g ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/40 hover:text-white/60'
            }`}
          >
            {g === 'all' ? 'All Games' : g.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {statusTypes.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === s ? 'bg-white/10 text-white' : 'bg-white/[0.02] text-white/30 hover:text-white/50'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/30">{filtered.length} bet{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Bet List */}
      <AnimatePresence>
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard className="text-center py-8" animate={false}>
              <span className="text-4xl">🎫</span>
              <p className="text-white/40 mt-2 text-sm">No bets found</p>
              <button 
                onClick={() => setCurrentPage('lottery')}
                className="mt-4 text-sm text-gold hover:underline"
              >
                Place your first bet →
              </button>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filtered.map((bet, i) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => setSelectedBet(selectedBet === bet.id ? null : bet.id)}
              >
                <GlassCard 
                  animate={false} 
                  className={`cursor-pointer transition-all duration-300 ${
                    bet.status === 'won' ? 'border-green-500/30 bg-green-500/[0.02]' : 
                    bet.status === 'lost' ? 'border-red-500/10' : 
                    selectedBet === bet.id ? 'border-gold/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {bet.gameType.includes('thailand') ? '🇹🇭' : '🎲'}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {bet.gameType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-[10px] text-white/30">{formatRelativeTime(bet.createdAt)}</p>
                      </div>
                    </div>
                    <StatusBadge status={bet.status} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-white/30">Number</p>
                        <p className={`text-xl font-bold font-display ${bet.status === 'won' ? 'text-green-400' : 'gradient-gold-text'}`}>
                          {bet.number}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30">Bet</p>
                        <p className="text-sm font-semibold">{bet.amount} SAR</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/30">{bet.status === 'won' ? 'Won' : 'Potential Win'}</p>
                      <p className={`text-lg font-bold ${
                        bet.status === 'won' ? 'text-green-400' : 
                        bet.status === 'lost' ? 'text-white/30 line-through' : 
                        'text-gold'
                      }`}>
                        {bet.potentialWin.toLocaleString()} SAR
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedBet === bet.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-white/[0.04] space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/40">Draw Date</span>
                            <span>{bet.drawDate}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-white/40">Bet ID</span>
                            <span className="font-mono">{bet.id.substring(0, 12)}...</span>
                          </div>
                          {bet.result && (
                            <div className="flex justify-between text-xs">
                              <span className="text-white/40">Draw Result</span>
                              <span className="text-gold font-bold">{bet.result}</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              fullWidth
                              onClick={() => handleViewReceipt(bet.id)}
                            >
                              🧾 Receipt
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <Modal
        isOpen={!!receiptModal}
        onClose={() => setReceiptModal(null)}
        title="Bet Receipt"
      >
        {receiptModal && (
          <div className="space-y-4">
            {/* Receipt Header */}
            <div className="text-center py-4 border-b border-white/[0.06]">
              <div className="w-14 h-14 rounded-2xl gradient-gold mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">🎰</span>
              </div>
              <h3 className="text-lg font-bold font-display gradient-gold-text">TicketNova</h3>
              <p className="text-xs text-white/40 mt-1">{receiptModal.receiptId}</p>
            </div>

            {/* Number Display */}
            <div className="text-center py-6 rounded-2xl bg-gradient-to-br from-gold/10 to-orange/5 border border-gold/20">
              <p className="text-xs text-white/40 mb-2">Your Number</p>
              <p className="text-4xl font-bold font-display gradient-gold-text tracking-widest">
                {receiptModal.number}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-white/50">Game</span>
                <span className="font-medium">{receiptModal.gameType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-white/50">Bet Amount</span>
                <span className="font-medium">{receiptModal.amount.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-white/50">Odds</span>
                <span className="font-medium text-gold">{receiptModal.odds}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-white/50">{receiptModal.status === 'won' ? 'Won' : 'Potential Win'}</span>
                <span className={`font-bold ${receiptModal.status === 'won' ? 'text-green-400' : 'text-gold'}`}>
                  {receiptModal.potentialWin.toFixed(2)} SAR
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-white/50">Draw Date</span>
                <span className="font-medium">{receiptModal.drawDate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-white/50">Status</span>
                <StatusBadge status={receiptModal.status} />
              </div>
              {receiptModal.result && (
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-white/50">Result</span>
                  <span className="font-bold text-gold">{receiptModal.result}</span>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <p className="text-center text-[10px] text-white/30">
              {new Date(receiptModal.createdAt).toLocaleString()}
            </p>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={handleDownloadReceipt}>
                📥 Save
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintReceipt}>
                🖨️ Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleShareReceipt}>
                📤 Share
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
