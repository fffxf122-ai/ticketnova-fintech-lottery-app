import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

const tabs = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'lottery', label: 'Lottery', icon: '🎰' },
  { id: 'wallet', label: 'Wallet', icon: '💰' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, setCurrentPage } = useStore();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    const pageMap: Record<string, string> = {
      home: 'dashboard',
      lottery: 'lottery',
      wallet: 'wallet',
      history: 'transactions',
      profile: 'profile',
    };
    setCurrentPage(pageMap[tabId] || 'dashboard');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-dark-secondary/80 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center py-2 px-3 min-w-[60px] transition-all duration-300"
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-8 h-1 rounded-full gradient-gold"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`text-xl transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] mt-0.5 font-medium transition-colors ${activeTab === tab.id ? 'gradient-gold-text' : 'text-white/40'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
        {/* Safe area for mobile */}
        <div className="h-safe-area-inset-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
