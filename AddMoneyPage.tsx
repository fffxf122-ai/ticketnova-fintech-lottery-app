import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, DepositRequest } from '@/store/useStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GlassCard from '@/components/ui/GlassCard';
import FileUpload from '@/components/ui/FileUpload';
import toast from 'react-hot-toast';
import { validatePhone, validateTransactionId, checkRateLimit } from '@/lib/validation';

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 5000;

type PaymentMethod = 'bkash' | 'nagad' | 'bank' | null;
type Step = 1 | 2 | 3 | 4;

export default function AddMoneyPage() {
  const { user, addDeposit, setCurrentPage } = useStore();
  const { rate, convertSARtoBDT } = useExchangeRate();

  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [phone, setPhone] = useState('');
  const [txId, setTxId] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const bdtAmount = convertSARtoBDT(amountNum);

  const paymentMethods = [
    { id: 'bkash' as const, name: 'bKash', icon: '💜', color: 'from-pink-500/20 to-purple-500/20', borderColor: 'border-pink-500/30' },
    { id: 'nagad' as const, name: 'Nagad', icon: '🧡', color: 'from-orange-500/20 to-red-500/20', borderColor: 'border-orange-500/30' },
    { id: 'bank' as const, name: 'Bank Transfer', icon: '🏦', color: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-500/30' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    // Rate limiting
    if (!checkRateLimit(`deposit-${user.id}`, 3, 60000)) {
      toast.error('Too many requests. Please wait a minute.');
      return;
    }
    
    // Validate phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.error || 'Invalid phone');
      return;
    }
    
    // Validate transaction ID
    const txValidation = validateTransactionId(txId, method || 'bkash');
    if (!txValidation.valid) {
      toast.error(txValidation.error || 'Invalid transaction ID');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));

    const deposit: DepositRequest = {
      id: Math.random().toString(36).substring(2, 15),
      userId: user.id,
      userName: user.name,
      amountSAR: amountNum,
      amountBDT: bdtAmount,
      method: method!,
      phone,
      transactionId: txId,
      screenshot: screenshot || undefined,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    addDeposit(deposit);
    setLoading(false);
    toast.success('Deposit request submitted! Awaiting admin approval.');
    setStep(4);
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => { step > 1 && step < 4 ? setStep((step - 1) as Step) : setCurrentPage('dashboard'); }} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">←</button>
        <h2 className="text-lg font-bold font-display">Add Money</h2>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step || step === 4 ? 'gradient-gold' : 'bg-white/10'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 - Amount */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <GlassCard animate={false}>
              <p className="text-sm text-white/50 mb-2">Enter amount in SAR</p>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-4xl font-bold font-display text-center py-4 outline-none gradient-gold-text placeholder-white/10"
                />
                <p className="text-center text-white/30 text-sm">SAR</p>
              </div>

              {amountNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-gold/[0.05] border border-gold/10 text-center"
                >
                  <p className="text-xs text-white/40">You need to send approximately</p>
                  <p className="text-xl font-bold text-gold mt-1">৳{bdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT</p>
                  <p className="text-[10px] text-white/30 mt-1">Live Rate: 1 SAR = {rate.toFixed(2)} BDT</p>
                </motion.div>
              )}
            </GlassCard>

            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map(qa => (
                <button
                  key={qa}
                  onClick={() => setAmount(qa.toString())}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    amountNum === qa
                      ? 'gradient-gold text-black'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:border-gold/20'
                  }`}
                >
                  {qa.toLocaleString()} SAR
                </button>
              ))}
            </div>

            <div className="text-xs text-white/30 text-center">
              Min: {MIN_AMOUNT} SAR • Max: {MAX_AMOUNT.toLocaleString()} SAR
            </div>

            <Button
              fullWidth
              size="lg"
              disabled={amountNum < MIN_AMOUNT || amountNum > MAX_AMOUNT}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* Step 2 - Payment Method */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <GlassCard animate={false} className="text-center">
              <p className="text-sm text-white/40">Amount to deposit</p>
              <p className="text-2xl font-bold gradient-gold-text">{amountNum.toLocaleString()} SAR</p>
              <p className="text-sm text-white/40 mt-1">≈ ৳{bdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT</p>
            </GlassCard>

            <h3 className="text-sm font-semibold text-white/50">Select Payment Method</h3>

            <div className="space-y-3">
              {paymentMethods.map(pm => (
                <motion.button
                  key={pm.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMethod(pm.id)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${
                    method === pm.id
                      ? `bg-gradient-to-r ${pm.color} border ${pm.borderColor} glow-gold`
                      : 'glass-card hover:border-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pm.color} flex items-center justify-center text-2xl`}>
                    {pm.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{pm.name}</p>
                    <p className="text-xs text-white/40">{pm.id === 'bank' ? 'Bank transfer' : `Pay via ${pm.name}`}</p>
                  </div>
                  {method === pm.id && (
                    <div className="ml-auto w-6 h-6 rounded-full gradient-gold flex items-center justify-center text-black text-xs">✓</div>
                  )}
                </motion.button>
              ))}
            </div>

            <Button fullWidth size="lg" disabled={!method} onClick={() => setStep(3)}>
              Continue
            </Button>
          </motion.div>
        )}

        {/* Step 3 - Payment Details & Submission */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {/* Payment Info */}
            <GlassCard glow className="text-center">
              <p className="text-sm text-white/50 mb-2">
                {method === 'bkash' ? 'Send Money via bKash' : method === 'nagad' ? 'Send Money via Nagad' : 'Bank Transfer Details'}
              </p>

              {(method === 'bkash' || method === 'nagad') && (
                <>
                  <div className="flex items-center justify-center gap-3 my-3">
                    <p className="text-2xl font-bold font-display tracking-wider">+8801603373731</p>
                    <button
                      onClick={() => copyToClipboard('+8801603373731')}
                      className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-sm hover:bg-gold/20 transition-colors"
                    >
                      {copied ? '✅' : '📋'}
                    </button>
                  </div>
                  <p className="text-gold font-semibold text-lg">৳{bdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT</p>
                </>
              )}

              {method === 'bank' && (
                <div className="space-y-2 text-left">
                  <div className="flex justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-white/40 text-sm">Account Name</span>
                    <span className="text-sm font-medium">TicketNova</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-white/40 text-sm">Account No.</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">1234567890</span>
                      <button onClick={() => copyToClipboard('1234567890')} className="text-xs">📋</button>
                    </div>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-white/40 text-sm">Bank</span>
                    <span className="text-sm font-medium">DBBL</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-white/40 text-sm">Amount</span>
                    <span className="text-sm font-bold text-gold">৳{bdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Instructions */}
            <GlassCard animate={false}>
              <h4 className="text-sm font-semibold mb-3">📋 Instructions</h4>
              <ol className="space-y-2 text-xs text-white/50">
                <li className="flex gap-2"><span className="text-gold">1.</span> Open your {method === 'bank' ? 'banking' : method} app</li>
                <li className="flex gap-2"><span className="text-gold">2.</span> Send the exact converted amount</li>
                <li className="flex gap-2"><span className="text-gold">3.</span> Complete the payment</li>
                <li className="flex gap-2"><span className="text-gold">4.</span> Copy the transaction ID</li>
                <li className="flex gap-2"><span className="text-gold">5.</span> Submit proof below</li>
              </ol>
            </GlassCard>

            {/* Warning */}
            <div className="p-3 rounded-2xl bg-accent-red/[0.05] border border-accent-red/10">
              <h4 className="text-sm font-semibold text-accent-red mb-2">⚠️ Warning</h4>
              <div className="space-y-1 text-xs text-white/50">
                <p>❌ Wrong number will result in loss</p>
                <p>❌ Wrong amount will be rejected</p>
                <p>❌ Fake screenshot = account ban</p>
                <p>❌ Invalid transaction = rejection</p>
              </div>
            </div>

            {/* Submission Form */}
            <GlassCard animate={false} className="space-y-3">
              <h4 className="text-sm font-semibold">Submit Payment Proof</h4>
              <Input
                label="Your Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+880XXXXXXXXXX"
                type="tel"
              />
              <Input
                label="Amount Sent (BDT)"
                value={bdtAmount.toFixed(2)}
                onChange={() => {}}
                disabled
              />
              <Input
                label="Transaction ID"
                value={txId}
                onChange={e => setTxId(e.target.value)}
                placeholder="Enter transaction ID"
              />
              <Input
                label="Notes (Optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional info..."
                multiline
                rows={2}
              />
              <FileUpload
                label="Upload Payment Screenshot (Optional)"
                icon="📸"
                description="JPG, PNG • Max 5MB"
                value={screenshot}
                onFileSelect={(_, preview) => setScreenshot(preview)}
              />

              <Button fullWidth size="lg" onClick={handleSubmit} loading={loading}>
                Submit Deposit Request
              </Button>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 4 - Success */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-full gradient-gold mx-auto flex items-center justify-center glow-gold-strong"
            >
              <span className="text-5xl">✅</span>
            </motion.div>
            <h3 className="text-xl font-bold font-display">Request Submitted!</h3>
            <p className="text-white/40 text-sm max-w-xs mx-auto">
              Your deposit of <span className="text-gold font-semibold">{amountNum} SAR</span> is being reviewed.
              You'll be notified once approved.
            </p>
            <div className="glass-card p-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-white/40">Status</span>
                <span className="text-yellow-400 font-medium">⏳ Pending</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/40">Amount</span>
                <span className="font-medium">{amountNum} SAR</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/40">BDT Sent</span>
                <span className="font-medium">৳{bdtAmount.toFixed(2)}</span>
              </div>
            </div>
            <Button fullWidth onClick={() => { setCurrentPage('dashboard'); }} variant="outline">
              Back to Dashboard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
