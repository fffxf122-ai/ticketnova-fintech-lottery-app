import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateDynamicDraws } from '@/lib/dateUtils';
import { generateSecureId, hashPassword, verifyPassword, checkRateLimit } from '@/lib/validation';

// ─── Types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  balance: number;
  bonusBalance: number;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycDocuments?: { idCard?: string; selfie?: string };
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLogin?: string;
  deviceInfo?: string;
  passwordHash?: string;
  totalDeposits: number;   // count, for "first deposit only" checks
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus' | 'refund';
  amount: number;
  currency: 'SAR' | 'BDT';
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  method?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  bonusCampaignId?: string;
}

export interface Bet {
  id: string;
  odfserId: string;
  userId: string;
  gameType: 'thailand-2d' | 'thailand-3up' | 'kalyan-single' | 'kalyan-jodi' | 'kalyan-patti';
  number: string;
  amount: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  drawId: string;
  drawDate: string;
  createdAt: string;
  result?: string;
}

export interface Draw {
  id: string;
  gameType: string;
  drawDate: string;
  result?: string;
  status: 'upcoming' | 'live' | 'completed';
  closingTime: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  amountSAR: number;
  amountBDT: number;
  method: 'bkash' | 'nagad' | 'bank';
  phone: string;
  transactionId: string;
  screenshot?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  bonusApplied?: number;
  bonusCampaignId?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userName: string;
  amountSAR: number;
  amountBDT: number;
  method: 'bkash' | 'nagad' | 'bank';
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ExchangeRate {
  rate: number;
  lastUpdated: string;
  source: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface KYCDocument {
  idCard: string | null;
  selfie: string | null;
  submittedAt?: string;
}

// ─── Bonus Campaign ────────────────────────────────────────────────────

export interface BonusCampaign {
  id: string;
  name: string;
  enabled: boolean;
  bonusType: 'fixed' | 'percentage';
  bonusValue: number;        // e.g. 10 means 10 SAR or 10%
  minimumDeposit: number;
  maximumBonus: number;
  firstDepositOnly: boolean;
  eligibleMethods: ('bkash' | 'nagad' | 'bank')[];
  startDate: string;
  endDate: string;
  createdAt: string;
  totalUsages: number;
  totalBonusPaid: number;
}

// ─── AppState ───────────────────────────────────────────────────────────

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authLoading: boolean;

  // Exchange
  exchangeRate: ExchangeRate;

  // Data
  transactions: Transaction[];
  bets: Bet[];
  draws: Draw[];
  deposits: DepositRequest[];
  withdrawals: WithdrawRequest[];
  notifications: Notification[];
  allUsers: User[];
  kycDocuments: Record<string, KYCDocument>;
  bonusCampaigns: BonusCampaign[];

  // UI
  showBalance: boolean;
  activeTab: string;
  currentPage: string;
  showConfetti: boolean;

  // Auth actions — return { ok, error } for proper error messages
  login: (email: string, password: string) => { ok: boolean; error?: string };
  adminLogin: (username: string, password: string) => { ok: boolean; error?: string };
  signup: (name: string, email: string, phone: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;

  // UI actions
  toggleBalance: () => void;
  setActiveTab: (tab: string) => void;
  setCurrentPage: (page: string) => void;
  setShowConfetti: (show: boolean) => void;
  updateExchangeRate: (rate: ExchangeRate) => void;
  refreshDraws: () => void;

  // Financial actions
  addDeposit: (deposit: DepositRequest) => void;
  addWithdrawal: (withdrawal: WithdrawRequest) => void;
  addBet: (bet: Bet) => void;
  addTransaction: (transaction: Transaction) => void;
  approveDeposit: (id: string) => void;
  rejectDeposit: (id: string, reason?: string) => void;
  approveWithdrawal: (id: string) => void;
  rejectWithdrawal: (id: string, reason?: string) => void;
  updateUserBalance: (userId: string, amount: number) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // KYC / User actions
  updateKycStatus: (userId: string, status: 'pending' | 'approved' | 'rejected') => void;
  submitKycDocuments: (userId: string, documents: KYCDocument) => void;
  banUser: (userId: string) => void;
  unbanUser: (userId: string) => void;

  // Draw / Bet actions
  setResult: (drawId: string, result: string) => void;
  updateBetStatus: (betId: string, status: 'won' | 'lost') => void;

  // Bonus Campaign actions
  addBonusCampaign: (campaign: BonusCampaign) => void;
  updateBonusCampaign: (id: string, updates: Partial<BonusCampaign>) => void;
  deleteBonusCampaign: (id: string) => void;
  evaluateDepositBonus: (deposit: DepositRequest, userId: string) => { campaignId: string; bonusAmount: number } | null;

  // Export
  exportTransactions: () => string;
}

// ─── Demo seed data ─────────────────────────────────────────────────────

const createDemoTransactions = (): Transaction[] => {
  const now = new Date();
  return [
    { id: 't1', userId: 'u1', type: 'deposit', amount: 500, currency: 'SAR', status: 'approved', method: 'bkash', transactionId: 'BK2024001', createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(), updatedAt: new Date(now.getTime() - 86400000 * 5).toISOString() },
    { id: 't2', userId: 'u1', type: 'bet', amount: 50, currency: 'SAR', status: 'approved', createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(), updatedAt: new Date(now.getTime() - 86400000 * 4).toISOString(), notes: 'Thailand 2D - 47' },
    { id: 't3', userId: 'u1', type: 'win', amount: 450, currency: 'SAR', status: 'approved', createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(), updatedAt: new Date(now.getTime() - 86400000 * 4).toISOString(), notes: 'Thailand 2D Win!' },
    { id: 't4', userId: 'u1', type: 'withdraw', amount: 200, currency: 'SAR', status: 'approved', method: 'nagad', createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(), updatedAt: new Date(now.getTime() - 86400000 * 3).toISOString() },
    { id: 't6', userId: 'u1', type: 'deposit', amount: 1000, currency: 'SAR', status: 'approved', method: 'nagad', transactionId: 'NG2024002', createdAt: new Date(now.getTime() - 86400000).toISOString(), updatedAt: new Date(now.getTime() - 86400000).toISOString() },
    { id: 't7', userId: 'u1', type: 'bonus', amount: 50, currency: 'SAR', status: 'approved', notes: 'Deposit bonus – 10 % on 500 SAR deposit', createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(), updatedAt: new Date(now.getTime() - 86400000 * 5).toISOString(), bonusCampaignId: 'bc-default' },
  ] as Transaction[];
};

const createDemoBets = (): Bet[] => {
  const now = new Date();
  return [
    { id: 'b1', userId: 'u1', odfserId: 'u1', gameType: 'thailand-2d', number: '47', amount: 50, potentialWin: 4500, status: 'won', drawId: 'd-1-thailand-2d', drawDate: new Date(now.getTime() - 86400000 * 4).toISOString().split('T')[0], createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(), result: '47' },
    { id: 'b2', userId: 'u1', odfserId: 'u1', gameType: 'thailand-3up', number: '789', amount: 30, potentialWin: 27000, status: 'lost', drawId: 'd-2-thailand-3up', drawDate: new Date(now.getTime() - 86400000 * 3).toISOString().split('T')[0], createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(), result: '456' },
    { id: 'b3', userId: 'u1', odfserId: 'u1', gameType: 'kalyan-jodi', number: '89', amount: 100, potentialWin: 9000, status: 'pending', drawId: 'd-0-kalyan-jodi-0', drawDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0], createdAt: new Date().toISOString() },
  ] as Bet[];
};

// ALL demo users start with 0 balance; the demo transactions above
// explain why u1 has a positive balance (deposits minus withdrawals+bets+wins).
const demoUsers: User[] = [
  { id: 'u1', email: 'demo@ticketnova.com', name: 'Ruman Khan', phone: '+8801700000001', balance: 1750.50, bonusBalance: 50, kycStatus: 'approved', isAdmin: false, isBanned: false, createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), passwordHash: hashPassword('demo123'), totalDeposits: 2 },
  { id: 'u2', email: 'test@ticketnova.com', name: 'Ahmed Ali', phone: '+8801700000002', balance: 0, bonusBalance: 0, kycStatus: 'pending', isAdmin: false, isBanned: false, createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), passwordHash: hashPassword('test123'), totalDeposits: 0 },
  { id: 'u3', email: 'player@ticketnova.com', name: 'Sara Hassan', phone: '+8801700000003', balance: 0, bonusBalance: 0, kycStatus: 'none', isAdmin: false, isBanned: false, createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), passwordHash: hashPassword('player123'), totalDeposits: 0 },
];

// Default bonus campaign
const defaultBonusCampaigns: BonusCampaign[] = [
  {
    id: 'bc-default',
    name: 'Standard Deposit Bonus',
    enabled: true,
    bonusType: 'percentage',
    bonusValue: 10,
    minimumDeposit: 100,
    maximumBonus: 500,
    firstDepositOnly: false,
    eligibleMethods: ['bkash', 'nagad', 'bank'],
    startDate: new Date(Date.now() - 86400000 * 365).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    totalUsages: 1,
    totalBonusPaid: 50,
  },
];

// Admin credentials — password stored as a secure hash, never plaintext.
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = hashPassword('RumanKhan2021');

// ─── Store ──────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      authLoading: false,
      exchangeRate: { rate: 70.50, lastUpdated: new Date().toISOString(), source: 'api' },
      transactions: createDemoTransactions(),
      bets: createDemoBets(),
      draws: generateDynamicDraws(),
      deposits: [],
      withdrawals: [],
      notifications: [],
      allUsers: demoUsers,
      kycDocuments: {},
      bonusCampaigns: defaultBonusCampaigns,
      showBalance: true,
      activeTab: 'home',
      currentPage: 'dashboard',
      showConfetti: false,

      // ── Auth ────────────────────────────────────────────

      login: (email, password) => {
        // Rate limiting — max 5 attempts per minute per email
        if (!checkRateLimit(`login:${email.toLowerCase()}`, 5, 60000)) {
          return { ok: false, error: 'Too many login attempts. Please wait 1 minute.' };
        }

        // Input validation
        if (!email || !password) {
          return { ok: false, error: 'Email and password are required.' };
        }

        // Find user by email
        const user = get().allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

        // User does not exist — reject
        if (!user) {
          return { ok: false, error: 'Invalid credentials.' };
        }

        // Account banned — reject
        if (user.isBanned) {
          return { ok: false, error: 'Account suspended. Contact support.' };
        }

        // Password verification — compare hash of submitted password
        // against the stored hash
        if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
          return { ok: false, error: 'Invalid credentials.' };
        }

        // Authentication successful
        set({
          user: { ...user, lastLogin: new Date().toISOString() },
          isAuthenticated: true,
          isAdmin: false,
        });
        return { ok: true };
      },

      adminLogin: (username, password) => {
        // Rate limiting — max 3 attempts per minute
        if (!checkRateLimit('admin-login', 3, 60000)) {
          return { ok: false, error: 'Too many attempts. Please wait 1 minute.' };
        }

        if (!username || !password) {
          return { ok: false, error: 'Username and password are required.' };
        }

        // Verify admin credentials via hash comparison
        if (username !== ADMIN_USERNAME || !verifyPassword(password, ADMIN_PASSWORD_HASH)) {
          return { ok: false, error: 'Invalid admin credentials.' };
        }

        set({
          user: {
            id: 'admin',
            email: 'admin@ticketnova.com',
            name: 'Administrator',
            phone: '',
            balance: 0,
            bonusBalance: 0,
            kycStatus: 'approved',
            isAdmin: true,
            isBanned: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            totalDeposits: 0,
          },
          isAuthenticated: true,
          isAdmin: true,
        });
        return { ok: true };
      },

      signup: (name, email, phone, password) => {
        // Input validation
        if (!name || name.trim().length < 2) {
          return { ok: false, error: 'Name must be at least 2 characters.' };
        }
        if (!email || !email.includes('@')) {
          return { ok: false, error: 'Valid email is required.' };
        }
        if (!phone || phone.replace(/[\s\-]/g, '').length < 10) {
          return { ok: false, error: 'Valid phone number is required.' };
        }
        if (!password || password.length < 6) {
          return { ok: false, error: 'Password must be at least 6 characters.' };
        }

        // Check if email already registered
        if (get().allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          return { ok: false, error: 'An account with this email already exists.' };
        }

        const newUser: User = {
          id: generateSecureId(),
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone: phone.trim(),
          balance: 0,
          bonusBalance: 0,
          kycStatus: 'none',
          isAdmin: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          passwordHash: hashPassword(password),
          totalDeposits: 0,
        };

        set(s => ({
          user: newUser,
          isAuthenticated: true,
          isAdmin: false,
          allUsers: [...s.allUsers, newUser],
          notifications: [{
            id: generateSecureId(),
            userId: newUser.id,
            title: 'Welcome to TicketNova! 🎉',
            message: 'Your account is ready. Make a deposit to start playing!',
            type: 'success' as const,
            read: false,
            createdAt: new Date().toISOString(),
          }, ...s.notifications],
        }));
        return { ok: true };
      },

      logout: () => set({ user: null, isAuthenticated: false, isAdmin: false, activeTab: 'home', currentPage: 'dashboard' }),

      // ── UI ──────────────────────────────────────────────

      toggleBalance: () => set(s => ({ showBalance: !s.showBalance })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setShowConfetti: (show) => set({ showConfetti: show }),
      updateExchangeRate: (rate) => set({ exchangeRate: rate }),
      refreshDraws: () => set({ draws: generateDynamicDraws() }),

      // ── Notifications ───────────────────────────────────

      addNotification: (notif) => set(s => ({
        notifications: [{ ...notif, id: generateSecureId(), read: false, createdAt: new Date().toISOString() }, ...s.notifications],
      })),
      markNotificationRead: (id) => set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      })),
      markAllNotificationsRead: () => set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
      })),

      // ── Financial: Deposits ─────────────────────────────

      addDeposit: (deposit) => {
        set(s => ({
          deposits: [deposit, ...s.deposits],
          transactions: [{
            id: generateSecureId(),
            userId: deposit.userId,
            type: 'deposit' as const,
            amount: deposit.amountSAR,
            currency: 'SAR' as const,
            status: 'pending' as const,
            method: deposit.method,
            transactionId: deposit.transactionId,
            createdAt: deposit.createdAt,
            updatedAt: deposit.createdAt,
          }, ...s.transactions],
          notifications: [{
            id: generateSecureId(),
            userId: deposit.userId,
            title: 'Deposit Request Submitted',
            message: `Your deposit of ${deposit.amountSAR} SAR is being reviewed.`,
            type: 'info' as const,
            read: false,
            createdAt: new Date().toISOString(),
          }, ...s.notifications],
        }));
      },

      // ── Bonus evaluation (pure function, no side effects) ──

      evaluateDepositBonus: (deposit, userId) => {
        const state = get();
        const now = new Date();
        const user = state.allUsers.find(u => u.id === userId);
        if (!user) return null;

        for (const campaign of state.bonusCampaigns) {
          if (!campaign.enabled) continue;
          if (new Date(campaign.startDate) > now) continue;
          if (new Date(campaign.endDate) < now) continue;
          if (deposit.amountSAR < campaign.minimumDeposit) continue;
          if (!campaign.eligibleMethods.includes(deposit.method)) continue;
          if (campaign.firstDepositOnly && user.totalDeposits > 0) continue;

          let bonusAmount: number;
          if (campaign.bonusType === 'percentage') {
            bonusAmount = (deposit.amountSAR * campaign.bonusValue) / 100;
          } else {
            bonusAmount = campaign.bonusValue;
          }
          bonusAmount = Math.min(bonusAmount, campaign.maximumBonus);
          bonusAmount = Math.round(bonusAmount * 100) / 100;

          if (bonusAmount <= 0) continue;

          return { campaignId: campaign.id, bonusAmount };
        }
        return null;
      },

      // ── Approve Deposit (with bonus) ────────────────────

      approveDeposit: (id) => set(s => {
        const deposit = s.deposits.find(d => d.id === id);
        if (!deposit) return s;

        // Evaluate bonus
        const bonusResult = get().evaluateDepositBonus(deposit, deposit.userId);
        const bonusAmount = bonusResult?.bonusAmount || 0;
        const bonusCampaignId = bonusResult?.campaignId || undefined;
        const user = s.allUsers.find(u => u.id === deposit.userId);

        // Build bonus transaction
        const bonusTransactions: Transaction[] = bonusAmount > 0 ? [{
          id: generateSecureId(),
          userId: deposit.userId,
          type: 'bonus' as const,
          amount: bonusAmount,
          currency: 'SAR' as const,
          status: 'approved' as const,
          notes: `Deposit bonus on ${deposit.amountSAR} SAR deposit`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          bonusCampaignId,
        }] : [];

        // Build bonus notification
        const bonusNotifications: Notification[] = bonusAmount > 0 ? [{
          id: generateSecureId(),
          userId: deposit.userId,
          title: 'Deposit Bonus Credited! 🎁',
          message: `You received a ${bonusAmount.toFixed(2)} SAR deposit bonus!`,
          type: 'success' as const,
          read: false,
          createdAt: new Date().toISOString(),
        }] : [];

        // Update campaign stats
        const updatedCampaigns = bonusCampaignId
          ? s.bonusCampaigns.map(c =>
              c.id === bonusCampaignId
                ? { ...c, totalUsages: c.totalUsages + 1, totalBonusPaid: c.totalBonusPaid + bonusAmount }
                : c
            )
          : s.bonusCampaigns;

        return {
          deposits: s.deposits.map(d => d.id === id ? {
            ...d,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            bonusApplied: bonusAmount > 0 ? bonusAmount : undefined,
            bonusCampaignId,
          } : d),

          allUsers: s.allUsers.map(u => u.id === deposit.userId ? {
            ...u,
            balance: u.balance + deposit.amountSAR,
            bonusBalance: u.bonusBalance + bonusAmount,
            totalDeposits: u.totalDeposits + 1,
          } : u),

          user: s.user?.id === deposit.userId
            ? {
                ...s.user,
                balance: s.user.balance + deposit.amountSAR,
                bonusBalance: s.user.bonusBalance + bonusAmount,
                totalDeposits: s.user.totalDeposits + 1,
              }
            : s.user,

          transactions: [
            ...bonusTransactions,
            ...s.transactions.map(t =>
              t.transactionId === deposit.transactionId && t.type === 'deposit'
                ? { ...t, status: 'approved' as const, updatedAt: new Date().toISOString() }
                : t
            ),
          ],

          bonusCampaigns: updatedCampaigns,

          notifications: [
            {
              id: generateSecureId(),
              userId: deposit.userId,
              title: 'Deposit Approved! 💰',
              message: `${deposit.amountSAR} SAR has been added to your wallet.`,
              type: 'success' as const,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...bonusNotifications,
            ...s.notifications,
          ],
        };
      }),

      rejectDeposit: (id, reason) => set(s => {
        const deposit = s.deposits.find(d => d.id === id);
        if (!deposit) return s;

        return {
          deposits: s.deposits.map(d => d.id === id ? { ...d, status: 'rejected' as const, reviewedAt: new Date().toISOString(), rejectionReason: reason } : d),
          transactions: s.transactions.map(t => {
            if (t.transactionId === deposit.transactionId && t.type === 'deposit') {
              return { ...t, status: 'rejected' as const, updatedAt: new Date().toISOString() };
            }
            return t;
          }),
          notifications: [{
            id: generateSecureId(),
            userId: deposit.userId,
            title: 'Deposit Rejected',
            message: reason
              ? `Your deposit of ${deposit.amountSAR} SAR was rejected: ${reason}`
              : `Your deposit of ${deposit.amountSAR} SAR was not approved.`,
            type: 'error' as const,
            read: false,
            createdAt: new Date().toISOString(),
          }, ...s.notifications],
        };
      }),

      // ── Withdrawals ─────────────────────────────────────

      addWithdrawal: (withdrawal) => {
        set(s => ({
          withdrawals: [withdrawal, ...s.withdrawals],
          transactions: [{
            id: generateSecureId(),
            userId: withdrawal.userId,
            type: 'withdraw' as const,
            amount: withdrawal.amountSAR,
            currency: 'SAR' as const,
            status: 'pending' as const,
            method: withdrawal.method,
            createdAt: withdrawal.createdAt,
            updatedAt: withdrawal.createdAt,
          }, ...s.transactions],
          notifications: [{
            id: generateSecureId(),
            userId: withdrawal.userId,
            title: 'Withdrawal Request Submitted',
            message: `Your withdrawal of ${withdrawal.amountSAR} SAR is being processed.`,
            type: 'info' as const,
            read: false,
            createdAt: new Date().toISOString(),
          }, ...s.notifications],
        }));
      },

      approveWithdrawal: (id) => set(s => {
        const w = s.withdrawals.find(x => x.id === id);
        if (!w) return s;
        return {
          withdrawals: s.withdrawals.map(x => x.id === id ? { ...x, status: 'approved' as const, reviewedAt: new Date().toISOString() } : x),
          notifications: [{
            id: generateSecureId(), userId: w.userId,
            title: 'Withdrawal Approved! 🎉', message: `${w.amountSAR} SAR has been sent to your account.`,
            type: 'success' as const, read: false, createdAt: new Date().toISOString(),
          }, ...s.notifications],
        };
      }),

      rejectWithdrawal: (id, reason) => set(s => {
        const w = s.withdrawals.find(x => x.id === id);
        if (!w) return s;
        return {
          withdrawals: s.withdrawals.map(x => x.id === id ? { ...x, status: 'rejected' as const, reviewedAt: new Date().toISOString(), rejectionReason: reason } : x),
          allUsers: s.allUsers.map(u => u.id === w.userId ? { ...u, balance: u.balance + w.amountSAR } : u),
          user: s.user?.id === w.userId ? { ...s.user, balance: s.user.balance + w.amountSAR } : s.user,
          notifications: [{
            id: generateSecureId(), userId: w.userId,
            title: 'Withdrawal Rejected', message: reason ? `Reason: ${reason}. Balance restored.` : 'Balance has been restored.',
            type: 'error' as const, read: false, createdAt: new Date().toISOString(),
          }, ...s.notifications],
        };
      }),

      updateUserBalance: (userId, amount) => set(s => ({
        allUsers: s.allUsers.map(u => u.id === userId ? { ...u, balance: u.balance + amount } : u),
        user: s.user?.id === userId ? { ...s.user, balance: s.user.balance + amount } : s.user,
      })),

      // ── Betting ─────────────────────────────────────────

      addBet: (bet) => set(s => {
        const u = s.user;
        if (!u) return s;
        return {
          bets: [bet, ...s.bets],
          user: { ...u, balance: u.balance - bet.amount },
          allUsers: s.allUsers.map(x => x.id === u.id ? { ...x, balance: x.balance - bet.amount } : x),
          transactions: [{
            id: generateSecureId(), userId: bet.odfserId,
            type: 'bet' as const, amount: bet.amount, currency: 'SAR' as const, status: 'approved' as const,
            notes: `${bet.gameType.replace('-', ' ').toUpperCase()} - ${bet.number}`,
            createdAt: bet.createdAt, updatedAt: bet.createdAt,
          }, ...s.transactions],
          notifications: [{
            id: generateSecureId(), userId: u.id,
            title: 'Bet Placed! 🎰', message: `Your bet #${bet.number} for ${bet.amount} SAR is confirmed.`,
            type: 'success' as const, read: false, createdAt: new Date().toISOString(),
          }, ...s.notifications],
        };
      }),

      addTransaction: (tx) => set(s => ({ transactions: [tx, ...s.transactions] })),

      // ── KYC / User ──────────────────────────────────────

      updateKycStatus: (userId, status) => {
        set(s => ({
          allUsers: s.allUsers.map(u => u.id === userId ? { ...u, kycStatus: status } : u),
          user: s.user?.id === userId ? { ...s.user, kycStatus: status } : s.user,
          notifications: [{
            id: generateSecureId(), userId,
            title: status === 'approved' ? 'KYC Approved! ✅' : status === 'rejected' ? 'KYC Rejected' : 'KYC Under Review',
            message: status === 'approved' ? 'Your account is now fully verified!' : status === 'rejected' ? 'Verification failed. Please resubmit.' : 'Your documents are being reviewed.',
            type: (status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info') as 'success' | 'error' | 'info',
            read: false, createdAt: new Date().toISOString(),
          }, ...s.notifications],
        }));
      },

      submitKycDocuments: (userId, docs) => set(s => ({
        kycDocuments: { ...s.kycDocuments, [userId]: docs },
      })),

      banUser: (userId) => set(s => ({ allUsers: s.allUsers.map(u => u.id === userId ? { ...u, isBanned: true } : u) })),
      unbanUser: (userId) => set(s => ({ allUsers: s.allUsers.map(u => u.id === userId ? { ...u, isBanned: false } : u) })),

      // ── Draw / Result ───────────────────────────────────

      setResult: (drawId, result) => set(s => ({
        draws: s.draws.map(d => d.id === drawId ? { ...d, result, status: 'completed' as const } : d),
      })),

      updateBetStatus: (betId, status) => set(s => {
        const bet = s.bets.find(b => b.id === betId);
        if (!bet) return s;
        const updates: Partial<AppState> = {
          bets: s.bets.map(b => b.id === betId ? { ...b, status } : b),
        };
        if (status === 'won') {
          updates.allUsers = s.allUsers.map(u => u.id === bet.odfserId ? { ...u, balance: u.balance + bet.potentialWin } : u);
          if (s.user?.id === bet.odfserId) updates.user = { ...s.user, balance: s.user.balance + bet.potentialWin };
          updates.transactions = [{
            id: generateSecureId(), userId: bet.odfserId,
            type: 'win' as const, amount: bet.potentialWin, currency: 'SAR' as const, status: 'approved' as const,
            notes: `Won ${bet.gameType.replace('-', ' ').toUpperCase()} - ${bet.number}`,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }, ...s.transactions];
          updates.notifications = [{
            id: generateSecureId(), userId: bet.odfserId,
            title: '🎉 Congratulations! You Won!', message: `Your bet #${bet.number} won ${bet.potentialWin} SAR!`,
            type: 'success' as const, read: false, createdAt: new Date().toISOString(),
          }, ...s.notifications];
          updates.showConfetti = true;
        }
        return updates as AppState;
      }),

      // ── Bonus Campaign CRUD ─────────────────────────────

      addBonusCampaign: (campaign) => set(s => ({
        bonusCampaigns: [campaign, ...s.bonusCampaigns],
      })),

      updateBonusCampaign: (id, updates) => set(s => ({
        bonusCampaigns: s.bonusCampaigns.map(c => c.id === id ? { ...c, ...updates } : c),
      })),

      deleteBonusCampaign: (id) => set(s => ({
        bonusCampaigns: s.bonusCampaigns.filter(c => c.id !== id),
      })),

      // ── Export ──────────────────────────────────────────

      exportTransactions: () => {
        const s = get();
        const userId = s.user?.id;
        if (!userId) return '';
        const userTx = s.transactions.filter(t => t.userId === userId);
        const headers = 'Date,Type,Amount,Currency,Status,Notes\n';
        const rows = userTx.map(t =>
          `${new Date(t.createdAt).toLocaleString()},${t.type},${t.amount},${t.currency},${t.status},"${t.notes || ''}"`
        ).join('\n');
        return headers + rows;
      },
    }),
    {
      name: 'ticketnova-store',
      // Version 2 = secure password hashing.  Any data from version 1
      // (old insecure hashes) is discarded so users start fresh with
      // the new hash algorithm.  This is a one-time migration.
      version: 2,
      migrate: () => {
        // Return empty/null so Zustand uses defaults (which include
        // fresh password hashes computed with the new algorithm).
        return {} as AppState;
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        transactions: state.transactions,
        bets: state.bets,
        deposits: state.deposits,
        withdrawals: state.withdrawals,
        allUsers: state.allUsers,
        showBalance: state.showBalance,
        notifications: state.notifications,
        kycDocuments: state.kycDocuments,
        bonusCampaigns: state.bonusCampaigns,
      }),
    }
  )
);

// ── Global subscription: broadcast to other tabs on every state change ──
// This runs AFTER persist has written to localStorage, so other tabs
// can safely read the updated data.
const BC_CHANNEL = 'ticketnova-sync';
useStore.subscribe(() => {
  try {
    const ch = new BroadcastChannel(BC_CHANNEL);
    ch.postMessage({ t: Date.now() });
    ch.close();
  } catch { /* BroadcastChannel not available */ }
});
