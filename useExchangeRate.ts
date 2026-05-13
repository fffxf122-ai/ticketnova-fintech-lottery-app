import { useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';

const FALLBACK_RATE = 70.50;
const REFRESH_INTERVAL = 300000; // 5 minutes

export function useExchangeRate() {
  const { exchangeRate, updateExchangeRate } = useStore();

  const fetchRate = useCallback(async () => {
    try {
      // Try primary API
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/SAR');
      if (res.ok) {
        const data = await res.json();
        const bdtRate = data.rates?.BDT;
        if (bdtRate) {
          updateExchangeRate({
            rate: Math.round(bdtRate * 100) / 100,
            lastUpdated: new Date().toISOString(),
            source: 'exchangerate-api',
          });
          return;
        }
      }
    } catch {
      // silent
    }

    try {
      // Fallback API
      const res = await fetch('https://open.er-api.com/v6/latest/SAR');
      if (res.ok) {
        const data = await res.json();
        const bdtRate = data.rates?.BDT;
        if (bdtRate) {
          updateExchangeRate({
            rate: Math.round(bdtRate * 100) / 100,
            lastUpdated: new Date().toISOString(),
            source: 'open.er-api',
          });
          return;
        }
      }
    } catch {
      // Use fallback
    }

    // Safe fallback
    updateExchangeRate({
      rate: FALLBACK_RATE,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    });
  }, [updateExchangeRate]);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const convertSARtoBDT = useCallback((sar: number) => {
    return Math.round(sar * exchangeRate.rate * 100) / 100;
  }, [exchangeRate.rate]);

  const convertBDTtoSAR = useCallback((bdt: number) => {
    return Math.round((bdt / exchangeRate.rate) * 100) / 100;
  }, [exchangeRate.rate]);

  return {
    rate: exchangeRate.rate,
    lastUpdated: exchangeRate.lastUpdated,
    source: exchangeRate.source,
    convertSARtoBDT,
    convertBDTtoSAR,
    refreshRate: fetchRate,
  };
}
