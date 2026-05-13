import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useStore } from '@/store/useStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useLiveSync } from '@/hooks/useLiveSync';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Confetti from '@/components/ui/Confetti';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import AddMoneyPage from '@/pages/AddMoneyPage';
import WithdrawPage from '@/pages/WithdrawPage';
import LotteryPage from '@/pages/LotteryPage';
import WalletPage from '@/pages/WalletPage';
import TransactionsPage from '@/pages/TransactionsPage';
import ProfilePage from '@/pages/ProfilePage';
import BetHistoryPage from '@/pages/BetHistoryPage';
import ResultsPage from '@/pages/ResultsPage';
import KYCPage from '@/pages/KYCPage';
import NotificationsPage from '@/pages/NotificationsPage';
import AdminPage from '@/pages/AdminPage';

function AppContent() {
  const { isAuthenticated, isAdmin, currentPage, showConfetti, setShowConfetti, refreshDraws } = useStore();

  useExchangeRate();
  useLiveSync(); // cross-tab sync + admin toast alerts

  useEffect(() => {
    refreshDraws();
    const interval = setInterval(refreshDraws, 60000);
    return () => clearInterval(interval);
  }, [refreshDraws]);

  if (!isAuthenticated) return <AuthPage />;

  if (isAdmin) {
    return (
      <>
        <AdminPage />
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'add-money': return <AddMoneyPage />;
      case 'withdraw': return <WithdrawPage />;
      case 'lottery': return <LotteryPage />;
      case 'wallet': return <WalletPage />;
      case 'transactions': return <TransactionsPage />;
      case 'profile': return <ProfilePage />;
      case 'bet-history': return <BetHistoryPage />;
      case 'results': return <ResultsPage />;
      case 'kyc': return <KYCPage />;
      case 'notifications': return <NotificationsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-dark relative">
      <ParticleBackground />
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <Header />
      <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#16161E',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#FFD700', secondary: '#000' } },
          error: { iconTheme: { primary: '#FF3D57', secondary: '#fff' } },
        }}
      />
      <AppContent />
    </>
  );
}
