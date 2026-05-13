import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import StatusBadge from '@/components/ui/StatusBadge';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '@/lib/dateUtils';

const typeFilters = ['all', 'deposit', 'withdraw', 'bet', 'win', 'bonus', 'refund'];
const statusFilters = ['all', 'pending', 'approved', 'rejected', 'processing'];

export default function TransactionsPage() {
  const { transactions, user, exportTransactions } = useStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Only show user's transactions
  const userTransactions = transactions.filter(t => t.userId === user?.id);

  const filtered = useMemo(() => {
    return userTransactions
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => statusFilter === 'all' || t.status === statusFilter)
      .filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.type.includes(q) ||
          t.transactionId?.toLowerCase().includes(q) ||
          t.amount.toString().includes(q) ||
          t.notes?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userTransactions, typeFilter, statusFilter, search]);

  const paginated = filtered.slice(0, page * perPage);
  const hasMore = paginated.length < filtered.length;

  const iconMap: Record<string, string> = {
    deposit: '📥', withdraw: '📤', bet: '🎰', win: '🏆', bonus: '🎁', refund: '↩️',
  };

  const handleExport = () => {
    const csv = exportTransactions();
    if (!csv) {
      toast.error('No transactions to export');
      return;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticketnova-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transactions exported!');
  };

  // Stats
  const stats = useMemo(() => {
    const totalIn = userTransactions
      .filter(t => ['deposit', 'win', 'bonus', 'refund'].includes(t.type) && t.status === 'approved')
      .reduce((a, b) => a + b.amount, 0);
    const totalOut = userTransactions
      .filter(t => ['withdraw', 'bet'].includes(t.type) && t.status === 'approved')
      .reduce((a, b) => a + b.amount, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [userTransactions]);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-display">📊 Transactions</h2>
        <button 
          onClick={handleExport}
          className="text-xs text-gold/60 hover:text-gold px-3 py-1.5 rounded-xl bg-gold/5 flex items-center gap-1"
        >
          📥 Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <GlassCard animate={false} className="text-center py-3">
          <p className="text-xs text-white/40">Total In</p>
          <p className="text-sm font-bold text-green-400">+{stats.totalIn.toFixed(0)}</p>
        </GlassCard>
        <GlassCard animate={false} className="text-center py-3">
          <p className="text-xs text-white/40">Total Out</p>
          <p className="text-sm font-bold text-red-400">-{stats.totalOut.toFixed(0)}</p>
        </GlassCard>
        <GlassCard animate={false} className="text-center py-3">
          <p className="text-xs text-white/40">Net</p>
          <p className={`text-sm font-bold ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.net >= 0 ? '+' : ''}{stats.net.toFixed(0)}
          </p>
        </GlassCard>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-gold/20 placeholder-white/20"
        />
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {typeFilters.map(f => (
          <button
            key={f}
            onClick={() => { setTypeFilter(f); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              typeFilter === f ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/40 hover:text-white/60'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {statusFilters.map(f => (
          <button
            key={f}
            onClick={() => { setStatusFilter(f); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === f ? 'bg-white/10 text-white' : 'bg-white/[0.02] text-white/30 hover:text-white/50'
            }`}
          >
            {f === 'all' ? 'All Status' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-white/30">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>

      {/* Transaction List */}
      <AnimatePresence>
        {paginated.length === 0 ? (
          <GlassCard className="text-center py-8" animate={false}>
            <span className="text-4xl">📭</span>
            <p className="text-white/40 mt-2 text-sm">No transactions found</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {paginated.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="glass-card p-3.5 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  tx.type === 'deposit' ? 'bg-green-500/10' :
                  tx.type === 'withdraw' ? 'bg-blue-500/10' :
                  tx.type === 'win' ? 'bg-gold/10' :
                  tx.type === 'bet' ? 'bg-purple-500/10' :
                  tx.type === 'bonus' ? 'bg-pink-500/10' :
                  'bg-gray-500/10'
                }`}>
                  {iconMap[tx.type] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium capitalize">{tx.type}</p>
                    <StatusBadge status={tx.status} />
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {formatRelativeTime(tx.createdAt)}
                  </p>
                  {tx.transactionId && (
                    <p className="text-[10px] text-white/20 truncate">ID: {tx.transactionId}</p>
                  )}
                  {tx.notes && (
                    <p className="text-[10px] text-white/20 truncate">{tx.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${
                    ['deposit', 'win', 'bonus', 'refund'].includes(tx.type) ? 'text-green-400' : 'text-red-400'
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

      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full py-3 rounded-2xl bg-white/[0.03] text-white/40 text-sm font-medium hover:bg-white/[0.06] transition-colors"
        >
          Load More ({filtered.length - paginated.length} remaining)
        </button>
      )}
    </div>
  );
}
