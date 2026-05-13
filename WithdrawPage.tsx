import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, WithdrawRequest } from '@/store/useStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';

export default function WithdrawPage() {
  const { user, addWithdrawal, withdrawals, setCurrentPage } = useStore();
  const { convertSARtoBDT, rate } = useExchangeRate();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'bank' | ''>('');
  const [accountDetails, setAccountDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const bdtAmount = convertSARtoBDT(amountNum);

  const handleSubmit = async () => {
    if (!amount || amountNum < 50) { toast.error('Minimum withdrawal is 50 SAR'); return; }
    if (amountNum > (user?.balance || 0)) { toast.error('Insufficient balance'); return; }
    if (!method) { toast.error('Select a payment method'); return; }
    if (!accountDetails || accountDetails.length < 5) { toast.error('Enter valid account details'); return; }
    if (!user) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const withdrawal: WithdrawRequest = {
      id: Math.random().toString(36).substring(2, 15),
      userId: user.id,
      userName: user.name,
      amountSAR: amountNum,
      amountBDT: bdtAmount,
      method: method as 'bkash' | 'nagad' | 'bank',
      accountDetails,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    addWithdrawal(withdrawal);
    setLoading(false);
    toast.success('Withdrawal request submitted!');
    setAmount('');
    setMethod('');
    setAccountDetails('');
  };

  const userWithdrawals = withdrawals.filter(w => w.userId === user?.id);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrentPage('dashboard')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">←</button>
        <h2 className="text-lg font-bold font-display">💸 Withdraw</h2>
      </div>

      {/* Balance */}
      <GlassCard animate={false} glow className="text-center">
        <p className="text-sm text-white/40">Available Balance</p>
        <p className="text-3xl font-bold gradient-gold-text font-display">{user?.balance.toFixed(2)} SAR</p>
        <p className="text-sm text-white/30">≈ ৳{convertSARtoBDT(user?.balance || 0).toFixed(2)} BDT</p>
      </GlassCard>

      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowHistory(false)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${!showHistory ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/40'}`}
        >
          New Request
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${showHistory ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/40'}`}
        >
          History ({userWithdrawals.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!showHistory ? (
          <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <Input
              label="Amount (SAR)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              type="number"
              icon={<span>💰</span>}
            />

            {amountNum > 0 && (
              <div className="p-3 rounded-xl bg-gold/[0.05] border border-gold/10 text-center">
                <p className="text-xs text-white/40">You will receive approximately</p>
                <p className="text-lg font-bold text-gold">৳{bdtAmount.toFixed(2)} BDT</p>
                <p className="text-[10px] text-white/20">Rate: 1 SAR = {rate.toFixed(2)} BDT</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bkash' as const, name: 'bKash', icon: '💜' },
                  { id: 'nagad' as const, name: 'Nagad', icon: '🧡' },
                  { id: 'bank' as const, name: 'Bank', icon: '🏦' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                      method === m.id
                        ? 'gradient-gold text-black glow-gold'
                        : 'glass-card hover:border-white/10'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-xs font-medium">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={method === 'bank' ? 'Bank Account Details' : `${method || 'Payment'} Account Number`}
              value={accountDetails}
              onChange={e => setAccountDetails(e.target.value)}
              placeholder={method === 'bank' ? 'Account name, number, bank name' : 'Enter account number'}
              multiline={method === 'bank'}
              rows={2}
            />

            <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
              Submit Withdrawal Request
            </Button>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
            {userWithdrawals.length === 0 ? (
              <GlassCard className="text-center py-8" animate={false}>
                <span className="text-3xl">📭</span>
                <p className="text-white/40 text-sm mt-2">No withdrawals yet</p>
              </GlassCard>
            ) : (
              userWithdrawals.map(w => (
                <GlassCard key={w.id} animate={false} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg">💸</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{w.amountSAR} SAR</p>
                      <StatusBadge status={w.status} />
                    </div>
                    <p className="text-[10px] text-white/30">{w.method} • {new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                </GlassCard>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
