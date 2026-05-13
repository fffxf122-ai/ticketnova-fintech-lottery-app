import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, BonusCampaign } from '@/store/useStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import {
  createAuditLog, getAuditLogs, exportAuditLogs,
  getFraudAlerts, createFraudAlert, resolveFraudAlert, checkVelocity,
  AuditLogEntry, FraudAlert,
} from '@/lib/auditLog';
import { generateSecureId } from '@/lib/validation';
import toast from 'react-hot-toast';

type AdminTab = 'overview' | 'deposits' | 'withdrawals' | 'users' | 'results' | 'bets' | 'kyc' | 'bonus' | 'audit' | 'fraud';

export default function AdminPage() {
  const {
    logout, allUsers, deposits, withdrawals, transactions, bets, draws,
    approveDeposit, rejectDeposit, approveWithdrawal, rejectWithdrawal,
    updateKycStatus, setResult, updateBetStatus, banUser, unbanUser,
    kycDocuments, setShowConfetti, user: adminUser,
    bonusCampaigns, addBonusCampaign, updateBonusCampaign, deleteBonusCampaign, evaluateDepositBonus,
  } = useStore();
  const { convertSARtoBDT } = useExchangeRate();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [resultInput, setResultInput] = useState('');
  const [selectedDraw, setSelectedDraw] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [kycModal, setKycModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);

  // Bonus campaign form
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BonusCampaign | null>(null);
  const [bcName, setBcName] = useState('');
  const [bcType, setBcType] = useState<'fixed' | 'percentage'>('percentage');
  const [bcValue, setBcValue] = useState('10');
  const [bcMinDeposit, setBcMinDeposit] = useState('100');
  const [bcMaxBonus, setBcMaxBonus] = useState('500');
  const [bcFirstOnly, setBcFirstOnly] = useState(false);
  const [bcMethods, setBcMethods] = useState<string[]>(['bkash', 'nagad', 'bank']);

  useEffect(() => {
    setAuditLogs(getAuditLogs({ limit: 50 }));
    setFraudAlerts(getFraudAlerts(false));
  }, [tab]);

  const totalRevenue = transactions.filter(t => t.type === 'bet').reduce((a, b) => a + b.amount, 0);
  const totalPayout = transactions.filter(t => t.type === 'win').reduce((a, b) => a + b.amount, 0);
  const totalDepositsAmt = deposits.filter(d => d.status === 'approved').reduce((a, b) => a + b.amountSAR, 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const pendingKyc = allUsers.filter(u => u.kycStatus === 'pending');
  const unresolvedFraud = fraudAlerts.filter(a => !a.resolved);

  const tabs: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Home', icon: '📊' },
    { id: 'deposits', label: 'Deposits', icon: '📥', badge: pendingDeposits.length },
    { id: 'withdrawals', label: 'Withdraw', icon: '📤', badge: pendingWithdrawals.length },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'kyc', label: 'KYC', icon: '✅', badge: pendingKyc.length },
    { id: 'results', label: 'Results', icon: '🏆' },
    { id: 'bets', label: 'Bets', icon: '🎫' },
    { id: 'bonus', label: 'Bonus', icon: '🎁' },
    { id: 'audit', label: 'Audit', icon: '📋' },
    { id: 'fraud', label: 'Fraud', icon: '🚨', badge: unresolvedFraud.length },
  ];

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    const q = searchQuery.toLowerCase();
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q));
  }, [allUsers, searchQuery]);

  /* ── Deposit handlers ─────────────────────────────── */

  const handleApproveDeposit = (id: string) => {
    const dep = deposits.find(d => d.id === id);
    if (!dep) return;
    const vc = checkVelocity(`deposit-${dep.userId}`, 5, 3600000);
    if (!vc.allowed) {
      createFraudAlert(dep.userId, dep.userName, 'rapid_deposits', `${vc.count} deposits in 1 hour`, 'warning');
      setFraudAlerts(getFraudAlerts(false));
    }
    // evaluateDepositBonus runs inside approveDeposit automatically
    approveDeposit(id);
    createAuditLog(adminUser?.id || 'admin', adminUser?.name || 'Admin', 'deposit_approved', 'deposit', id, { amount: dep.amountSAR }, 'medium');
    toast.success('Deposit approved!');
    setAuditLogs(getAuditLogs({ limit: 50 }));
  };

  const handleRejectDeposit = (id: string) => {
    const dep = deposits.find(d => d.id === id);
    if (!dep) return;
    rejectDeposit(id, rejectReason || undefined);
    createAuditLog(adminUser?.id || 'admin', adminUser?.name || 'Admin', 'deposit_rejected', 'deposit', id, { amount: dep.amountSAR, reason: rejectReason }, 'medium');
    toast.error('Deposit rejected');
    setRejectReason('');
    setAuditLogs(getAuditLogs({ limit: 50 }));
  };

  const handleApproveWithdrawal = (id: string) => {
    approveWithdrawal(id);
    createAuditLog(adminUser?.id || 'admin', adminUser?.name || 'Admin', 'withdrawal_approved', 'withdrawal', id, {}, 'high');
    toast.success('Withdrawal approved!');
  };

  const handleRejectWithdrawal = (id: string) => {
    rejectWithdrawal(id, rejectReason || undefined);
    createAuditLog(adminUser?.id || 'admin', adminUser?.name || 'Admin', 'withdrawal_rejected', 'withdrawal', id, { reason: rejectReason }, 'medium');
    toast.error('Withdrawal rejected, balance restored');
    setRejectReason('');
  };

  /* ── Result handler ──────────────────────────────── */

  const handleSetResult = () => {
    if (!selectedDraw || !resultInput) { toast.error('Select draw and enter result'); return; }
    setResult(selectedDraw, resultInput);
    const draw = draws.find(d => d.id === selectedDraw);
    if (draw) {
      const matching = bets.filter(b => b.drawId === selectedDraw && b.status === 'pending');
      let winners = 0;
      matching.forEach(bet => { if (bet.number === resultInput) { updateBetStatus(bet.id, 'won'); winners++; } else { updateBetStatus(bet.id, 'lost'); } });
      createAuditLog(adminUser?.id || 'admin', adminUser?.name || 'Admin', 'result_set', 'draw', selectedDraw, { result: resultInput, winners }, 'high');
      if (winners > 0) { setShowConfetti(true); toast.success(`🎉 ${winners} winner(s) found!`); } else { toast.success('Result set. No winners.'); }
    }
    setResultInput(''); setSelectedDraw('');
  };

  /* ── Bonus campaign handlers ─────────────────────── */

  const openNewCampaignModal = () => {
    setEditingCampaign(null);
    setBcName(''); setBcType('percentage'); setBcValue('10'); setBcMinDeposit('100'); setBcMaxBonus('500'); setBcFirstOnly(false); setBcMethods(['bkash', 'nagad', 'bank']);
    setShowBonusModal(true);
  };

  const openEditCampaignModal = (c: BonusCampaign) => {
    setEditingCampaign(c);
    setBcName(c.name); setBcType(c.bonusType); setBcValue(c.bonusValue.toString()); setBcMinDeposit(c.minimumDeposit.toString()); setBcMaxBonus(c.maximumBonus.toString()); setBcFirstOnly(c.firstDepositOnly);
    setBcMethods(c.eligibleMethods as string[]);
    setShowBonusModal(true);
  };

  const saveCampaign = () => {
    if (!bcName.trim()) { toast.error('Campaign name required'); return; }
    const data = {
      name: bcName.trim(),
      bonusType: bcType,
      bonusValue: parseFloat(bcValue) || 0,
      minimumDeposit: parseFloat(bcMinDeposit) || 0,
      maximumBonus: parseFloat(bcMaxBonus) || 0,
      firstDepositOnly: bcFirstOnly,
      eligibleMethods: bcMethods as ('bkash' | 'nagad' | 'bank')[],
    };
    if (editingCampaign) {
      updateBonusCampaign(editingCampaign.id, data);
      toast.success('Campaign updated!');
    } else {
      addBonusCampaign({
        ...data,
        id: generateSecureId(),
        enabled: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 365).toISOString(),
        createdAt: new Date().toISOString(),
        totalUsages: 0,
        totalBonusPaid: 0,
      });
      toast.success('Campaign created!');
    }
    setShowBonusModal(false);
  };

  const previewBonus = (amount: number) => {
    const campaign = bonusCampaigns.find(c => c.enabled);
    if (!campaign) return 0;
    let bonus = campaign.bonusType === 'percentage' ? (amount * campaign.bonusValue) / 100 : campaign.bonusValue;
    return Math.min(bonus, campaign.maximumBonus);
  };

  const kycUser = kycModal ? allUsers.find(u => u.id === kycModal) : null;
  const kycDocs = kycModal ? kycDocuments[kycModal] : null;

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark/90 backdrop-blur-xl border-b border-white/[0.04] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-red/20 flex items-center justify-center"><span className="text-sm">🛡️</span></div>
            <div>
              <h1 className="font-display font-bold text-sm">Admin Panel</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[10px] text-green-400/70">Live Sync</p>
              </div>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={logout}>Logout</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[60px] z-20 bg-dark/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-lg mx-auto flex gap-1 overflow-x-auto hide-scrollbar px-4 py-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${tab === t.id ? 'gradient-gold text-black' : 'text-white/40 hover:text-white/60'}`}>
              {t.icon} {t.label}
              {t.badge ? <span className="w-5 h-5 rounded-full bg-accent-red text-white text-[10px] flex items-center justify-center animate-pulse">{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-8">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ────────────────────────────────────── */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Users', value: allUsers.length, icon: '👥', color: 'text-blue-400' },
                  { label: 'Revenue', value: `${totalRevenue.toFixed(0)} SAR`, icon: '💰', color: 'text-gold' },
                  { label: 'Net Profit', value: `${(totalRevenue - totalPayout).toFixed(0)} SAR`, icon: '📈', color: totalRevenue > totalPayout ? 'text-green-400' : 'text-red-400' },
                  { label: 'Pending', value: pendingDeposits.length + pendingWithdrawals.length + pendingKyc.length, icon: '⏳', color: 'text-yellow-400' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard animate={false} className="text-center py-4">
                      <span className="text-2xl">{s.icon}</span>
                      <p className={`text-lg font-bold font-display mt-1 ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-white/40">{s.label}</p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
              <GlassCard animate={false}>
                <h3 className="text-sm font-semibold mb-3">⚡ Quick Actions</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setTab('deposits')} className="p-3 rounded-xl bg-green-500/10 text-green-400 text-xs font-medium">📥 Deposits ({pendingDeposits.length})</button>
                  <button onClick={() => setTab('withdrawals')} className="p-3 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-medium">📤 Withdrawals ({pendingWithdrawals.length})</button>
                  <button onClick={() => setTab('bonus')} className="p-3 rounded-xl bg-pink-500/10 text-pink-400 text-xs font-medium">🎁 Bonus ({bonusCampaigns.filter(c => c.enabled).length})</button>
                </div>
              </GlassCard>
              <GlassCard animate={false}>
                <h3 className="text-sm font-semibold mb-3">📈 7-Day Activity</h3>
                <div className="h-24 flex items-end gap-1">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${20 + Math.random() * 80}%` }} transition={{ delay: i * 0.03 }} className="flex-1 rounded-t bg-gradient-to-t from-gold/20 to-gold/50" />
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ── DEPOSITS ────────────────────────────────────── */}
          {tab === 'deposits' && (
            <motion.div key="deposits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h3 className="text-sm font-semibold text-white/50">Pending ({pendingDeposits.length})</h3>
              {pendingDeposits.length === 0 ? (
                <GlassCard animate={false} className="text-center py-6"><span className="text-3xl">✅</span><p className="text-white/30 text-sm mt-2">No pending deposits</p></GlassCard>
              ) : pendingDeposits.map(dep => {
                const bonusPreview = evaluateDepositBonus(dep, dep.userId);
                return (
                  <GlassCard key={dep.id} animate={false} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-semibold">{dep.userName}</p><p className="text-xs text-white/30">{new Date(dep.createdAt).toLocaleString()}</p></div>
                      <StatusBadge status={dep.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white/[0.02]"><p className="text-white/30">SAR</p><p className="font-bold text-gold">{dep.amountSAR}</p></div>
                      <div className="p-2 rounded-lg bg-white/[0.02]"><p className="text-white/30">BDT</p><p className="font-bold">৳{dep.amountBDT.toFixed(2)}</p></div>
                      <div className="p-2 rounded-lg bg-white/[0.02]"><p className="text-white/30">Method</p><p className="font-medium capitalize">{dep.method}</p></div>
                      <div className="p-2 rounded-lg bg-white/[0.02]"><p className="text-white/30">TX ID</p><p className="font-medium truncate">{dep.transactionId}</p></div>
                    </div>
                    {dep.screenshot && <img src={dep.screenshot} alt="Proof" className="w-full h-32 object-cover rounded-xl" />}

                    {/* Bonus Preview */}
                    {bonusPreview && (
                      <div className="p-2.5 rounded-xl bg-pink-500/[0.07] border border-pink-500/20 flex items-center gap-2">
                        <span className="text-lg">🎁</span>
                        <div>
                          <p className="text-xs font-medium text-pink-300">Deposit Bonus Eligible</p>
                          <p className="text-sm font-bold text-pink-400">+{bonusPreview.bonusAmount.toFixed(2)} SAR bonus</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="success" size="sm" fullWidth onClick={() => handleApproveDeposit(dep.id)}>✅ Approve</Button>
                      <Button variant="danger" size="sm" fullWidth onClick={() => handleRejectDeposit(dep.id)}>❌ Reject</Button>
                    </div>
                  </GlassCard>
                );
              })}
              <h3 className="text-sm font-semibold text-white/50 mt-6">Completed</h3>
              {deposits.filter(d => d.status !== 'pending').slice(0, 10).map(d => (
                <GlassCard key={d.id} animate={false} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{d.userName} — {d.amountSAR} SAR</p>
                    <p className="text-[10px] text-white/20">{d.method} • {d.transactionId}</p>
                    {d.bonusApplied && d.bonusApplied > 0 && <p className="text-[10px] text-pink-400">+{d.bonusApplied.toFixed(2)} SAR bonus applied</p>}
                  </div>
                  <StatusBadge status={d.status} />
                </GlassCard>
              ))}
            </motion.div>
          )}

          {/* ── WITHDRAWALS ─────────────────────────────────── */}
          {tab === 'withdrawals' && (
            <motion.div key="withdrawals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h3 className="text-sm font-semibold text-white/50">Pending ({pendingWithdrawals.length})</h3>
              {pendingWithdrawals.length === 0 ? (
                <GlassCard animate={false} className="text-center py-6"><span className="text-3xl">✅</span><p className="text-white/30 text-sm mt-2">No pending withdrawals</p></GlassCard>
              ) : pendingWithdrawals.map(w => (
                <GlassCard key={w.id} animate={false} className="space-y-3">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">{w.userName}</p><p className="text-xs text-white/30">{w.method} • {new Date(w.createdAt).toLocaleString()}</p></div><p className="text-lg font-bold text-gold">{w.amountSAR} SAR</p></div>
                  <div className="p-2 rounded-lg bg-white/[0.02]"><p className="text-[10px] text-white/30">Account</p><p className="text-sm">{w.accountDetails}</p></div>
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" fullWidth onClick={() => handleApproveWithdrawal(w.id)}>✅ Approve</Button>
                    <Button variant="danger" size="sm" fullWidth onClick={() => handleRejectWithdrawal(w.id)}>❌ Reject</Button>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}

          {/* ── USERS ───────────────────────────────────────── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">🔍</span><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-gold/20 placeholder-white/20" /></div>
              {filteredUsers.map(u => (
                <GlassCard key={u.id} animate={false} className={u.isBanned ? 'border-red-500/20 opacity-60' : ''}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${u.isBanned ? 'bg-red-500/20' : 'bg-gradient-to-br from-gold/20 to-orange/20'} flex items-center justify-center font-bold`}>{u.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{u.name}{u.isBanned ? <span className="ml-2 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">BANNED</span> : ''}</p><p className="text-[10px] text-white/30 truncate">{u.email}</p></div>
                    <div className="text-right shrink-0"><p className="text-sm font-bold text-gold">{u.balance.toFixed(2)}</p>{u.bonusBalance > 0 && <p className="text-[10px] text-pink-400">+{u.bonusBalance.toFixed(2)} bonus</p>}<StatusBadge status={u.kycStatus} /></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant={u.isBanned ? 'success' : 'danger'} size="sm" fullWidth onClick={() => { if (u.isBanned) { unbanUser(u.id); toast.success('Unbanned'); } else { banUser(u.id); toast.success('Banned'); } }}>{u.isBanned ? '✅ Unban' : '🚫 Ban'}</Button>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}

          {/* ── KYC ─────────────────────────────────────────── */}
          {tab === 'kyc' && (
            <motion.div key="kyc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h3 className="text-sm font-semibold text-white/50">Pending KYC ({pendingKyc.length})</h3>
              {pendingKyc.length === 0 ? <GlassCard animate={false} className="text-center py-6"><span className="text-3xl">✅</span><p className="text-white/30 text-sm mt-2">No pending</p></GlassCard> : pendingKyc.map(u => {
                const docs = kycDocuments[u.id];
                return (<GlassCard key={u.id} animate={false} className="space-y-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-orange/20 flex items-center justify-center font-bold">{u.name.charAt(0)}</div><div><p className="text-sm font-medium">{u.name}</p><p className="text-[10px] text-white/30">{u.email}</p></div></div>
                  {docs && <div className="grid grid-cols-2 gap-2">{docs.idCard && <img src={docs.idCard} alt="ID" className="rounded-xl h-20 w-full object-cover border border-white/10" />}{docs.selfie && <img src={docs.selfie} alt="Selfie" className="rounded-xl h-20 w-full object-cover border border-white/10" />}</div>}
                  <div className="flex gap-2"><Button variant="success" size="sm" fullWidth onClick={() => { updateKycStatus(u.id, 'approved'); toast.success('Approved'); }}>✅ Approve</Button><Button variant="danger" size="sm" fullWidth onClick={() => { updateKycStatus(u.id, 'rejected'); toast.error('Rejected'); }}>❌ Reject</Button></div>
                </GlassCard>);
              })}
            </motion.div>
          )}

          {/* ── RESULTS ─────────────────────────────────────── */}
          {tab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <GlassCard animate={false} className="space-y-3">
                <h3 className="text-sm font-semibold">Set Draw Results</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">{draws.filter(d => d.status === 'upcoming').map(d => (<button key={d.id} onClick={() => setSelectedDraw(d.id)} className={`w-full p-3 rounded-xl text-left transition-all ${selectedDraw === d.id ? 'gradient-gold text-black' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}><p className="text-sm font-medium">{d.gameType.replace(/-/g, ' ').toUpperCase()}</p><p className={`text-xs ${selectedDraw === d.id ? 'text-black/60' : 'text-white/30'}`}>{d.drawDate}</p></button>))}</div>
                <Input label="Result" value={resultInput} onChange={e => setResultInput(e.target.value)} placeholder="Winning number" />
                <Button fullWidth onClick={handleSetResult} disabled={!selectedDraw || !resultInput}>🏆 Set Result</Button>
              </GlassCard>
              <h3 className="text-sm font-semibold text-white/50">Completed</h3>
              {draws.filter(d => d.status === 'completed').slice(0, 10).map(d => (<GlassCard key={d.id} animate={false} className="flex items-center justify-between"><div><p className="text-sm font-medium">{d.gameType.replace(/-/g, ' ').toUpperCase()}</p><p className="text-xs text-white/30">{d.drawDate}</p></div><p className="text-2xl font-bold gradient-gold-text font-display">{d.result}</p></GlassCard>))}
            </motion.div>
          )}

          {/* ── BETS ────────────────────────────────────────── */}
          {tab === 'bets' && (
            <motion.div key="bets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white/50">All Bets ({bets.length})</h3><div className="flex gap-1 text-[10px]"><span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">P:{bets.filter(b => b.status === 'pending').length}</span><span className="px-2 py-1 rounded bg-green-500/10 text-green-400">W:{bets.filter(b => b.status === 'won').length}</span></div></div>
              {bets.slice(0, 20).map(bet => { const bu = allUsers.find(u => u.id === bet.userId); return (<GlassCard key={bet.id} animate={false} className={bet.status === 'won' ? 'border-green-500/20' : ''}><div className="flex items-center justify-between"><div><p className="text-sm font-medium">{bu?.name || '?'}</p><p className="text-xs text-white/30">{bet.gameType.replace(/-/g, ' ').toUpperCase()}</p></div><StatusBadge status={bet.status} /></div><div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]"><div className="flex gap-3"><div><p className="text-[10px] text-white/30">No.</p><p className="text-lg font-bold gradient-gold-text">{bet.number}</p></div><div><p className="text-[10px] text-white/30">Bet</p><p className="text-sm">{bet.amount} SAR</p></div></div><div className="text-right"><p className="text-[10px] text-white/30">Win</p><p className="text-sm font-bold text-gold">{bet.potentialWin} SAR</p></div></div></GlassCard>); })}
            </motion.div>
          )}

          {/* ── BONUS CAMPAIGNS ─────────────────────────────── */}
          {tab === 'bonus' && (
            <motion.div key="bonus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/50">Bonus Campaigns ({bonusCampaigns.length})</h3>
                <Button size="sm" onClick={openNewCampaignModal}>+ New</Button>
              </div>

              {/* Bonus stats */}
              <div className="grid grid-cols-3 gap-2">
                <GlassCard animate={false} className="text-center py-3"><p className="text-lg font-bold text-pink-400">{bonusCampaigns.filter(c => c.enabled).length}</p><p className="text-[10px] text-white/40">Active</p></GlassCard>
                <GlassCard animate={false} className="text-center py-3"><p className="text-lg font-bold text-gold">{bonusCampaigns.reduce((a, c) => a + c.totalUsages, 0)}</p><p className="text-[10px] text-white/40">Total Uses</p></GlassCard>
                <GlassCard animate={false} className="text-center py-3"><p className="text-lg font-bold text-green-400">{bonusCampaigns.reduce((a, c) => a + c.totalBonusPaid, 0).toFixed(0)}</p><p className="text-[10px] text-white/40">SAR Paid</p></GlassCard>
              </div>

              {/* Bonus preview tool */}
              <GlassCard animate={false}>
                <h4 className="text-xs font-semibold text-white/50 mb-2">🔮 Preview Bonus</h4>
                <div className="flex gap-2">
                  {[100, 200, 500, 1000, 5000].map(amt => (
                    <div key={amt} className="flex-1 text-center p-2 rounded-lg bg-white/[0.02]">
                      <p className="text-[10px] text-white/30">{amt} SAR</p>
                      <p className="text-xs font-bold text-pink-400">+{previewBonus(amt).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Campaign list */}
              {bonusCampaigns.map(c => (
                <GlassCard key={c.id} animate={false} className={`${c.enabled ? 'border-pink-500/20' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎁</span>
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-[10px] text-white/30">
                          {c.bonusType === 'percentage' ? `${c.bonusValue}%` : `${c.bonusValue} SAR`} • Min: {c.minimumDeposit} SAR • Max: {c.maximumBonus} SAR
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {c.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/30 mb-3">
                    <span>Uses: {c.totalUsages}</span>
                    <span>Paid: {c.totalBonusPaid.toFixed(2)} SAR</span>
                    {c.firstDepositOnly && <span className="text-yellow-400">First deposit only</span>}
                    <span>Methods: {c.eligibleMethods.join(', ')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" fullWidth onClick={() => openEditCampaignModal(c)}>✏️ Edit</Button>
                    <Button size="sm" variant={c.enabled ? 'danger' : 'success'} fullWidth onClick={() => updateBonusCampaign(c.id, { enabled: !c.enabled })}>
                      {c.enabled ? '⏸ Disable' : '▶ Enable'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { deleteBonusCampaign(c.id); toast.success('Deleted'); }}>🗑</Button>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}

          {/* ── AUDIT ───────────────────────────────────────── */}
          {tab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white/50">Audit Logs</h3><Button size="sm" variant="outline" onClick={() => { const csv = exportAuditLogs(auditLogs); const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'audit.csv'; a.click(); URL.revokeObjectURL(u); toast.success('Exported'); }}>📥 Export</Button></div>
              {auditLogs.length === 0 ? <GlassCard animate={false} className="text-center py-6"><span className="text-3xl">📋</span><p className="text-white/30 text-sm mt-2">No logs</p></GlassCard> : auditLogs.map(l => (
                <GlassCard key={l.id} animate={false} className={l.severity === 'critical' ? 'border-red-500/20' : l.severity === 'high' ? 'border-orange-500/20' : ''}>
                  <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${l.severity === 'critical' ? 'bg-red-500' : l.severity === 'high' ? 'bg-orange-500' : l.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} /><span className="text-xs font-medium uppercase">{l.action.replace(/_/g, ' ')}</span></div><span className="text-[10px] text-white/30">{new Date(l.timestamp).toLocaleString()}</span></div>
                  <p className="text-xs text-white/50">By: {l.userName}</p>
                </GlassCard>
              ))}
            </motion.div>
          )}

          {/* ── FRAUD ───────────────────────────────────────── */}
          {tab === 'fraud' && (
            <motion.div key="fraud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h3 className="text-sm font-semibold text-white/50">Fraud Alerts ({fraudAlerts.length})</h3>
              {fraudAlerts.length === 0 ? <GlassCard animate={false} className="text-center py-6"><span className="text-3xl">✅</span><p className="text-white/30 text-sm mt-2">No alerts</p></GlassCard> : fraudAlerts.map(a => (
                <GlassCard key={a.id} animate={false} className={`${a.resolved ? 'opacity-50' : a.severity === 'critical' ? 'border-red-500/30' : 'border-yellow-500/20'}`}>
                  <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold uppercase text-red-400">{a.severity === 'critical' ? '🚨' : '⚠️'} {a.alertType.replace(/_/g, ' ')}</span>{!a.resolved && <Button size="sm" variant="outline" onClick={() => { resolveFraudAlert(a.id); setFraudAlerts(getFraudAlerts(false)); toast.success('Resolved'); }}>Resolve</Button>}</div>
                  <p className="text-sm">{a.userName}</p><p className="text-xs text-white/40">{a.description}</p>
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bonus Campaign Modal */}
      <Modal isOpen={showBonusModal} onClose={() => setShowBonusModal(false)} title={editingCampaign ? 'Edit Campaign' : 'New Bonus Campaign'}>
        <div className="space-y-4">
          <Input label="Campaign Name" value={bcName} onChange={e => setBcName(e.target.value)} placeholder="e.g. Weekend Deposit Bonus" />

          <div className="space-y-2">
            <label className="text-sm text-white/60 font-medium">Bonus Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['percentage', 'fixed'] as const).map(t => (
                <button key={t} onClick={() => setBcType(t)} className={`py-3 rounded-xl text-sm font-medium transition-all ${bcType === t ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/50'}`}>
                  {t === 'percentage' ? '📊 Percentage' : '💵 Fixed Amount'}
                </button>
              ))}
            </div>
          </div>

          <Input label={bcType === 'percentage' ? 'Bonus Percentage (%)' : 'Bonus Amount (SAR)'} value={bcValue} onChange={e => setBcValue(e.target.value)} type="number" placeholder={bcType === 'percentage' ? '10' : '50'} />
          <Input label="Minimum Deposit (SAR)" value={bcMinDeposit} onChange={e => setBcMinDeposit(e.target.value)} type="number" placeholder="100" />
          <Input label="Maximum Bonus (SAR)" value={bcMaxBonus} onChange={e => setBcMaxBonus(e.target.value)} type="number" placeholder="500" />

          <div className="space-y-2">
            <label className="text-sm text-white/60 font-medium">Eligible Methods</label>
            <div className="flex gap-2">
              {['bkash', 'nagad', 'bank'].map(m => (
                <button key={m} onClick={() => setBcMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${bcMethods.includes(m) ? 'gradient-gold text-black' : 'bg-white/[0.03] text-white/40'}`}>
                  {m === 'bkash' ? '💜 bKash' : m === 'nagad' ? '🧡 Nagad' : '🏦 Bank'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded-md border ${bcFirstOnly ? 'gradient-gold border-transparent' : 'border-white/20'} flex items-center justify-center transition-all`} onClick={() => setBcFirstOnly(!bcFirstOnly)}>
              {bcFirstOnly && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm text-white/60">First deposit only</span>
          </label>

          {/* Preview */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-white/40 mb-2">Preview:</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">500 SAR deposit →</span>
              <span className="text-sm font-bold text-pink-400">
                +{Math.min(bcType === 'percentage' ? (500 * (parseFloat(bcValue) || 0)) / 100 : parseFloat(bcValue) || 0, parseFloat(bcMaxBonus) || 0).toFixed(2)} SAR bonus
              </span>
            </div>
          </div>

          <Button fullWidth size="lg" onClick={saveCampaign}>
            {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </div>
      </Modal>

      {/* KYC Modal */}
      <Modal isOpen={!!kycModal} onClose={() => setKycModal(null)} title={`KYC – ${kycUser?.name}`}>
        {kycUser && kycDocs && (
          <div className="space-y-4">
            {kycDocs.idCard && <div><p className="text-sm text-white/50 mb-2">ID</p><img src={kycDocs.idCard} alt="ID" className="w-full rounded-xl" /></div>}
            {kycDocs.selfie && <div><p className="text-sm text-white/50 mb-2">Selfie</p><img src={kycDocs.selfie} alt="Selfie" className="w-full rounded-xl" /></div>}
            <div className="flex gap-2"><Button variant="success" size="sm" fullWidth onClick={() => { updateKycStatus(kycUser.id, 'approved'); setKycModal(null); toast.success('Approved'); }}>✅ Approve</Button><Button variant="danger" size="sm" fullWidth onClick={() => { updateKycStatus(kycUser.id, 'rejected'); setKycModal(null); toast.error('Rejected'); }}>❌ Reject</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
