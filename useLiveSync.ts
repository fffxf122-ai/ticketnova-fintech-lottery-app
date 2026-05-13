/**
 * useLiveSync — cross-tab real-time synchronization for TicketNova.
 *
 * ARCHITECTURE:
 * This is a single-file SPA (vite-plugin-singlefile). There is no server.
 * Zustand IS the database. The persist middleware writes to localStorage.
 *
 * SAME-TAB SCENARIO (user logs out → admin logs in):
 *   Zustand's in-memory store already contains the deposit.
 *   No sync needed — React reactivity handles it automatically.
 *
 * CROSS-TAB SCENARIO (two browser tabs):
 *   Tab A (user) writes deposit → persist writes to localStorage.
 *   Tab B (admin) has stale in-memory state.
 *   This hook detects the localStorage change and force-reloads state.
 *
 * MECHANISM:
 *   1. Every 1s, read localStorage and compare the raw JSON string length
 *      with the last known length.  If different, the data changed in
 *      another tab — force-reload everything.
 *   2. Listen for the native 'storage' event (fires instantly when another
 *      tab writes to localStorage).
 *   3. Listen for BroadcastChannel messages.
 *   4. Re-sync on window focus and online events.
 *   5. Show admin toast notifications for new pending items.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'ticketnova-store';
const BC_NAME = 'ticketnova-sync';

// ── Hook ──────────────────────────────────────────────────────

export function useLiveSync() {
  const isAdmin = useStore(s => s.isAdmin);
  const isAuth = useStore(s => s.isAuthenticated);

  // Track the raw localStorage string so we can detect cross-tab changes.
  // We compare raw string length + a hash of the first 200 chars as a fast
  // fingerprint.  This avoids parsing JSON on every poll.
  const lastFingerprint = useRef('');

  // Admin toast baseline
  const prevPending = useRef({ d: -1, w: -1, k: -1 });

  const getFingerprint = useCallback((): string => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return '';
      // Fast fingerprint: length + first and last 100 chars
      return `${raw.length}:${raw.slice(0, 100)}:${raw.slice(-100)}`;
    } catch {
      return '';
    }
  }, []);

  const forceReloadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const persisted = parsed?.state;
      if (!persisted) return;

      const cur = useStore.getState();

      // Build patch: overwrite every data collection
      const patch: Record<string, unknown> = {};
      const keys = [
        'deposits', 'withdrawals', 'transactions', 'bets',
        'notifications', 'allUsers', 'bonusCampaigns', 'kycDocuments',
      ];
      for (const k of keys) {
        if (persisted[k] !== undefined) {
          patch[k] = persisted[k];
        }
      }

      // Sync user balance if same user
      if (persisted.user && cur.user && (persisted.user as {id:string}).id === cur.user.id) {
        patch.user = persisted.user;
      }

      useStore.setState(patch);
    } catch {
      // localStorage read failed — ignore
    }
  }, []);

  const sync = useCallback(() => {
    const fp = getFingerprint();
    if (!fp) return;

    // If fingerprint changed, another tab wrote to localStorage
    if (fp !== lastFingerprint.current) {
      lastFingerprint.current = fp;
      forceReloadFromStorage();
    }

    // Admin toasts
    if (!isAdmin) return;

    const s = useStore.getState();
    const d = s.deposits.filter(x => x.status === 'pending').length;
    const w = s.withdrawals.filter(x => x.status === 'pending').length;
    const k = s.allUsers.filter(x => x.kycStatus === 'pending').length;

    if (prevPending.current.d === -1) {
      prevPending.current = { d, w, k };
      return;
    }

    if (d > prevPending.current.d) {
      const n = d - prevPending.current.d;
      toast(`📥 ${n} new deposit request${n > 1 ? 's' : ''} received`, {
        icon: '🔔', id: `dep-${Date.now()}`,
        style: { background: '#16161E', border: '1px solid rgba(0,230,118,0.4)', color: '#00E676', borderRadius: '16px' },
      });
    }
    if (w > prevPending.current.w) {
      const n = w - prevPending.current.w;
      toast(`📤 ${n} new withdrawal request${n > 1 ? 's' : ''} received`, {
        icon: '🔔', id: `wth-${Date.now()}`,
        style: { background: '#16161E', border: '1px solid rgba(33,150,243,0.4)', color: '#2196F3', borderRadius: '16px' },
      });
    }
    if (k > prevPending.current.k) {
      const n = k - prevPending.current.k;
      toast(`✅ ${n} new KYC submission${n > 1 ? 's' : ''}`, {
        icon: '🔔', id: `kyc-${Date.now()}`,
        style: { background: '#16161E', border: '1px solid rgba(156,39,176,0.4)', color: '#CE93D8', borderRadius: '16px' },
      });
    }

    prevPending.current = { d, w, k };
  }, [isAdmin, getFingerprint, forceReloadFromStorage]);

  // ── 1. Polling every 1s ─────────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    lastFingerprint.current = getFingerprint();
    const id = setInterval(sync, 1_000);
    return () => clearInterval(id);
  }, [isAuth, sync, getFingerprint]);

  // ── 2. storage event (instant cross-tab) ────────────────────
  useEffect(() => {
    if (!isAuth) return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        lastFingerprint.current = ''; // force re-read
        sync();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isAuth, sync]);

  // ── 3. BroadcastChannel ─────────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(BC_NAME);
      ch.onmessage = () => {
        lastFingerprint.current = '';
        sync();
      };
    } catch { /* not supported */ }
    return () => { ch?.close(); };
  }, [isAuth, sync]);

  // ── 4. Window focus / visibility ────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        lastFingerprint.current = '';
        sync();
      }
    };
    window.addEventListener('focus', () => { lastFingerprint.current = ''; sync(); });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuth, sync]);

  // ── 5. Network reconnect ────────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    const handler = () => { lastFingerprint.current = ''; sync(); };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [isAuth, sync]);
}


