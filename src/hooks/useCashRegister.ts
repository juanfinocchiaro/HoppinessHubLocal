/**
 * useCashRegister - Cajas, turnos y movimientos (Fase 2)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCashRegisters,
  fetchOpenShiftsForRegisters,
  fetchCashMovements,
  fetchCashMovementsByShiftIds,
  insertCashShift,
  closeCashShift,
  insertCashMovement,
  insertExpenseMovement,
  transferBetweenRegisters,
} from '@/services/rdoService';
import { toast } from 'sonner';

export type RegisterType = 'ventas' | 'alivio' | 'fuerte';

export interface CashRegister {
  id: string;
  branch_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  register_type: RegisterType;
}

/* ── Visibility helpers ── */
export function canViewBalance(
  registerType: RegisterType,
  localRole: string | null,
  isSuperadmin: boolean,
): boolean {
  if (isSuperadmin) return true;
  if (registerType === 'ventas') return true;
  return ['franquiciado', 'contador_local'].includes(localRole ?? '');
}

export function canViewMovements(
  registerType: RegisterType,
  localRole: string | null,
  isSuperadmin: boolean,
): boolean {
  if (isSuperadmin) return true;
  if (registerType === 'ventas') return true;
  return ['franquiciado', 'contador_local'].includes(localRole ?? '');
}

export function canViewSection(
  registerType: RegisterType,
  localRole: string | null,
  isSuperadmin: boolean,
): boolean {
  if (isSuperadmin) return true;
  if (registerType === 'ventas') return true;
  if (registerType === 'alivio') return true; // visible but restricted
  return ['franquiciado', 'contador_local'].includes(localRole ?? '');
}

/* ── Hook to get registers by type ── */
export function useCashRegistersByType(branchId: string | undefined) {
  const { data, isLoading } = useCashRegisters(branchId);
  const all = data?.all ?? [];
  return {
    ventas: all.find((r) => r.register_type === 'ventas') ?? null,
    alivio: all.find((r) => r.register_type === 'alivio') ?? null,
    fuerte: all.find((r) => r.register_type === 'fuerte') ?? null,
    isLoading,
  };
}

export interface CashRegisterShift {
  id: string;
  cash_register_id: string;
  branch_id: string;
  opened_by: string;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  notes: string | null;
  status: 'open' | 'closed';
  current_balance?: number | null;
}

export interface CashRegisterMovement {
  id: string;
  shift_id: string;
  branch_id: string;
  type: 'income' | 'expense' | 'withdrawal' | 'deposit';
  payment_method: string;
  amount: number;
  concept: string;
  order_id: string | null;
  recorded_by: string | null;
  created_at: string;
  transfer_id?: string | null;
  source_register_id?: string | null;
}

export const cashRegisterKeys = {
  all: ['cash-registers'] as const,
  registers: (branchId: string) => [...cashRegisterKeys.all, 'registers', branchId] as const,
  shifts: (branchId: string) => [...cashRegisterKeys.all, 'shifts', branchId] as const,
  movements: (shiftId: string) => [...cashRegisterKeys.all, 'movements', shiftId] as const,
};

export function useCashRegisters(branchId: string | undefined) {
  return useQuery({
    queryKey: cashRegisterKeys.registers(branchId ?? ''),
    queryFn: async () => {
      if (!branchId) return { active: [], all: [] };
      const all = await fetchCashRegisters(branchId);
      const active = all.filter((r) => r.is_active);
      return { active, all };
    },
    enabled: !!branchId,
    staleTime: 30000,
  });
}

export function useCashShifts(branchId: string | undefined, registerIds: string[]) {
  return useQuery({
    queryKey: [...cashRegisterKeys.shifts(branchId ?? ''), registerIds.join(',')],
    queryFn: async () => {
      if (!branchId || registerIds.length === 0)
        return {} as Record<string, CashRegisterShift | null>;
      return fetchOpenShiftsForRegisters(registerIds);
    },
    enabled: !!branchId && registerIds.length > 0,
    staleTime: 10000,
  });
}

export function useCashMovements(shiftId: string | undefined) {
  return useQuery({
    queryKey: cashRegisterKeys.movements(shiftId ?? ''),
    queryFn: async () => {
      if (!shiftId) return [];
      return fetchCashMovements(shiftId);
    },
    enabled: !!shiftId,
    staleTime: 5000,
  });
}

export function useAllCashMovements(
  branchId: string | undefined,
  shifts: Record<string, CashRegisterShift | null>,
) {
  const shiftIds = Object.values(shifts)
    .filter(Boolean)
    .map((s) => s!.id);
  return useQuery({
    queryKey: [...cashRegisterKeys.all, 'all-movements', branchId, shiftIds.join(',')],
    queryFn: async () => {
      if (shiftIds.length === 0) return {} as Record<string, CashRegisterMovement[]>;
      const allMovements = await fetchCashMovementsByShiftIds(shiftIds);
      const movementsMap: Record<string, CashRegisterMovement[]> = {};
      for (const [registerId, shift] of Object.entries(shifts)) {
        movementsMap[registerId] = shift
          ? allMovements.filter((m) => m.shift_id === shift.id)
          : [];
      }
      return movementsMap;
    },
    enabled: shiftIds.length > 0,
    staleTime: 5000,
  });
}

export function useOpenShift(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      registerId,
      userId,
      openingAmount,
    }: {
      registerId: string;
      userId: string;
      openingAmount: number;
    }) => insertCashShift({ registerId, branchId, userId, openingAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.shifts(branchId) });
      toast.success('Caja abierta');
    },
    onError: (e: Error) => {
      const msg = e?.message ?? '';
      if (/row-level security|policy|violates/.test(msg)) {
        toast.error('Para abrir la caja tenés que fichar primero en el local.');
      } else {
        toast.error(msg || 'Error al abrir caja');
      }
    },
  });
}

export function useCloseShift(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shiftId,
      userId,
      closingAmount,
      expectedAmount,
      notes,
    }: {
      shiftId: string;
      userId: string;
      closingAmount: number;
      expectedAmount: number;
      notes?: string;
    }) => closeCashShift({ shiftId, userId, closingAmount, expectedAmount, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.shifts(branchId) });
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
      toast.success('Caja cerrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddMovement(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shiftId,
      type,
      amount,
      concept,
      paymentMethod,
      userId,
      orderId,
    }: {
      shiftId: string;
      type: 'income' | 'expense' | 'withdrawal' | 'deposit';
      amount: number;
      concept: string;
      paymentMethod: string;
      userId: string;
      orderId?: string;
    }) =>
      insertCashMovement({
        shiftId,
        branchId,
        type,
        paymentMethod,
        amount,
        concept,
        userId,
        orderId,
      }),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.movements(v.shiftId) });
      queryClient.invalidateQueries({ queryKey: [...cashRegisterKeys.all, 'all-movements'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Specialized mutation for expense movements with accounting metadata */
export function useAddExpenseMovement(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shiftId,
      amount,
      concept,
      paymentMethod,
      userId,
      categoriaGasto,
      rdoCategoryCode,
      notes,
      estadoAprobacion,
    }: {
      shiftId: string;
      amount: number;
      concept: string;
      paymentMethod: string;
      userId: string;
      categoriaGasto?: string;
      rdoCategoryCode?: string;
      notes?: string;
      estadoAprobacion?: string;
    }) =>
      insertExpenseMovement({
        shiftId,
        branchId,
        amount,
        concept,
        paymentMethod,
        userId,
        categoriaGasto,
        rdoCategoryCode,
        observaciones: notes,
        estadoAprobacion,
      }),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.movements(v.shiftId) });
      queryClient.invalidateQueries({ queryKey: [...cashRegisterKeys.all, 'all-movements'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function calculateExpectedCash(
  shift: CashRegisterShift | null | undefined,
  movements: CashRegisterMovement[],
): number {
  if (!shift) return 0;
  if (shift.current_balance != null) return Number(shift.current_balance);
  let amount = Number(shift.opening_amount);
  for (const mov of movements) {
    const isCash = mov.payment_method?.toLowerCase() === 'cash';
    if (!isCash) continue;
    if (mov.type === 'income' || mov.type === 'deposit') amount += Number(mov.amount);
    else amount -= Number(mov.amount);
  }
  return amount;
}

export function useTransferBetweenRegisters(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceShiftId,
      destShiftId,
      amount,
      concept,
      userId,
    }: {
      sourceShiftId: string;
      destShiftId: string | null;
      amount: number;
      concept: string;
      userId: string;
    }) =>
      transferBetweenRegisters({
        sourceShiftId,
        destShiftId,
        amount,
        concept,
        userId,
        branchId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
