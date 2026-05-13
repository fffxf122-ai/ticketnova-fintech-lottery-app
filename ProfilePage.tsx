import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { canInstallPWA, installPWA, isPWA } from '@/lib/pwa';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout, setCurrentPage, bets, transactions, exportTransactions } = useStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

  const totalWins = bets.filter(b => b.userId === user?.id && b.status === 'won').length;
  const totalBetsCount = bets.filter(b => b.userId === user?.id).length;
  const userTransactions = transactions.filter(t => t.userId === user?.id);

  const menuItems = [
    { icon: '💰', label: 'My Wallet', page: 'wallet', desc: 'Balance & analytics' },
    { icon: '📊', label: 'Transactions', page: 'transactions', desc: 'Full history' },
    { icon: '🎫', label: 'Bet History', page: 'bet-history', desc: 'All your bets' },
    { icon: '✅', label: 'KYC Verification', page: 'kyc', desc: user?.kycStatus === 'approved' ? 'Verified' : user?.kycStatus || 'Not started' },
    { icon: '🏆', label: 'Results', page: 'results', desc: 'Draw results' },
    { icon: '🔔', label: 'Notifications', page: 'notifications', desc: 'Updates & alerts' },
  ];

  const handleExportData = () => {
    const csv = exportTransactions();
    if (!csv) {
      toast.error('No data to export');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticketnova-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  const handleInstallPWA = async () => {
    if (isPWA()) {
      toast.success('App is already installed!');
      return;
    }
    if (canInstallPWA()) {
      const installed = await installPWA();
      if (installed) {
        toast.success('App installed successfully!');
      } else {
        toast('Installation cancelled', { icon: 'ℹ️' });
      }
    } else {
      toast('Add to Home Screen from your browser menu', { icon: 'ℹ️', duration: 5000 });
    }
  };

  const handleSaveProfile = () => {
    // In a real app, this would update the user profile via API
    toast.success('Profile updated!');
    setShowEditModal(false);
  };

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold font-display">👤 Profile</h2>

      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard glow animate={false}>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/30 to-orange/30 flex items-center justify-center text-3xl font-bold font-display border-2 border-gold/20">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{user?.name}</h3>
              <p className="text-sm text-white/40">{user?.email}</p>
              {user?.phone && <p className="text-xs text-white/30">{user.phone}</p>}
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={user?.kycStatus || 'none'} />
                {user?.kycStatus === 'approved' && (
                  <span className="text-[10px] text-green-400">✓ Verified</span>
                )}
              </div>
            </div>
            <button 
              onClick={() => setShowEditModal(true)}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg hover:bg-white/10 transition-colors"
            >
              ✏️
            </button>
          </div>

          {/* Stats */}
          <div className="flex justify-around mt-5 pt-4 border-t border-white/[0.06]">
            <div className="text-center">
              <p className="text-xl font-bold gradient-gold-text">{totalBetsCount}</p>
              <p className="text-[10px] text-white/30">Total Bets</p>
            </div>
            <div className="w-px bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{totalWins}</p>
              <p className="text-[10px] text-white/30">Wins</p>
            </div>
            <div className="w-px bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-xl font-bold text-gold">{((user?.balance || 0) + (user?.bonusBalance || 0)).toFixed(2)}</p>
              <p className="text-[10px] text-white/30">SAR</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setCurrentPage('add-money')}
          className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 text-left hover:border-green-500/40 transition-all"
        >
          <span className="text-2xl">💳</span>
          <p className="text-sm font-semibold mt-2">Add Money</p>
          <p className="text-[10px] text-white/30">Deposit funds</p>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setCurrentPage('withdraw')}
          className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 text-left hover:border-blue-500/40 transition-all"
        >
          <span className="text-2xl">💸</span>
          <p className="text-sm font-semibold mt-2">Withdraw</p>
          <p className="text-[10px] text-white/30">Cash out</p>
        </motion.button>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <GlassCard
              onClick={() => setCurrentPage(item.page)}
              className="flex items-center gap-3 hover:border-gold/10 py-3.5"
              animate={false}
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[10px] text-white/30">{item.desc}</p>
              </div>
              <span className="text-white/20">›</span>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Additional Options */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-semibold text-white/50">More Options</h3>

        {/* Install App */}
        {!isPWA() && (
          <GlassCard animate={false} onClick={handleInstallPWA} className="flex items-center gap-3 py-3.5 cursor-pointer hover:border-gold/20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/10 to-orange/10 flex items-center justify-center text-lg">
              📱
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Install App</p>
              <p className="text-[10px] text-white/30">Add to home screen</p>
            </div>
            <span className="text-white/20">›</span>
          </GlassCard>
        )}

        {/* Export Data */}
        <GlassCard animate={false} onClick={handleExportData} className="flex items-center gap-3 py-3.5 cursor-pointer hover:border-gold/20">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg">
            📥
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Export Data</p>
            <p className="text-[10px] text-white/30">Download your transaction history</p>
          </div>
          <span className="text-white/20">›</span>
        </GlassCard>

        {/* Support */}
        <GlassCard animate={false} className="flex items-center gap-3 py-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg">
            💬
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Support</p>
            <p className="text-[10px] text-white/30">Get help</p>
          </div>
          <span className="text-white/20">›</span>
        </GlassCard>
      </motion.div>

      {/* Member Info */}
      <GlassCard animate={false} className="text-center py-4">
        <p className="text-xs text-white/30">Member since</p>
        <p className="text-sm text-white/50">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
        {user?.lastLogin && (
          <>
            <p className="text-xs text-white/30 mt-2">Last login</p>
            <p className="text-sm text-white/50">{new Date(user.lastLogin).toLocaleString()}</p>
          </>
        )}
      </GlassCard>

      {/* Logout */}
      <Button fullWidth variant="danger" onClick={logout}>
        Logout
      </Button>

      {/* App Version */}
      <p className="text-center text-white/20 text-[10px]">
        TicketNova v1.0.0 • {isPWA() ? 'Installed' : 'Web'}
      </p>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Phone Number"
            value={editPhone}
            onChange={e => setEditPhone(e.target.value)}
            placeholder="+880XXXXXXXXXX"
            type="tel"
          />
          <div className="pt-2">
            <Button fullWidth onClick={handleSaveProfile}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
