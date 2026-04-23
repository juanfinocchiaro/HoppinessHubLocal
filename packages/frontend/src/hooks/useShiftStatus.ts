/**
 * useShiftStatus - Estado del turno de caja para POS (Fase 2)
 * Indica si hay caja abierta y opcionalmente turno operativo (branch_shifts)
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchVentasRegisters, fetchOpenCashShift } from '@/services/schedulesService';
import type { CashRegisterShift } from './useCashRegister';

export interface ShiftStatus {
  activeCashShift: CashRegisterShift | null;
  hasCashOpen: boolean;
  loading: boolean;
  hasChecked: boolean;
  refetch: () => Promise<void>;
}

export function useShiftStatus(branchId: string | undefined): ShiftStatus {
  const [activeCashShift, setActiveCashShift] = useState<CashRegisterShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const fetchData = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!branchId) {
        setLoading(false);
        setHasChecked(true);
        setActiveCashShift(null);
        return;
      }
      try {
        const ventasRegisters = await fetchVentasRegisters(branchId);
        if (signal?.cancelled) return;

        const ventasIds = ventasRegisters.map((r) => r.id);

        let data = null;
        if (ventasIds.length > 0) {
          data = await fetchOpenCashShift(branchId, ventasIds);
          if (signal?.cancelled) return;
        }
        setActiveCashShift(data as CashRegisterShift | null);
      } catch (e) {
        if (signal?.cancelled) return;
        if (import.meta.env.DEV) console.error('useShiftStatus:', e);
        setActiveCashShift(null);
      } finally {
        if (!signal?.cancelled) {
          setLoading(false);
          setHasChecked(true);
        }
      }
    },
    [branchId],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    fetchData(signal);
    const interval = setInterval(() => fetchData(signal), 60000);
    return () => {
      signal.cancelled = true;
      clearInterval(interval);
    };
  }, [fetchData]);

  return {
    activeCashShift,
    hasCashOpen: activeCashShift !== null,
    loading,
    hasChecked,
    refetch: fetchData,
  };
}
