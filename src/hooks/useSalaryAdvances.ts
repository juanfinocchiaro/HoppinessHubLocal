/**
 * useSalaryAdvances - Hook para gestión de adelantos de sueldo
 * V2: Simplificado sin employee_id legacy, sin cash_register_movements
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSalaryAdvances,
  fetchMyAdvances,
  fetchShiftAdvances,
  fetchPendingTransferAdvances,
  createAdvance,
  approveAdvance,
  rejectAdvance,
  markAdvanceTransferred,
  requestAdvance,
  cancelAdvance,
} from '@/services/hrService';
import { toast } from 'sonner';

export const salaryAdvanceKeys = {
  all: ['salary-advances'] as const,
  list: (branchId: string, month?: string) => [...salaryAdvanceKeys.all, 'list', branchId, month ?? 'all'] as const,
  user: (userId: string) => [...salaryAdvanceKeys.all, 'user', userId] as const,
  shift: (shiftId: string) => [...salaryAdvanceKeys.all, 'shift', shiftId] as const,
  pendingTransfers: (branchId: string) =>
    [...salaryAdvanceKeys.all, 'pending-transfers', branchId] as const,
};

export interface SalaryAdvance {
  id: string;
  branch_id: string;
  user_id: string | null;
  amount: number;
  reason: string | null;
  payment_method: 'cash' | 'transfer';
  status: 'pending' | 'paid' | 'pending_transfer' | 'transferred' | 'deducted' | 'cancelled';
  authorized_by: string | null;
  authorized_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  shift_id: string | null;
  transferred_by: string | null;
  transferred_at: string | null;
  transfer_reference: string | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
  user_name?: string;
  authorizer_name?: string;
}

export function useSalaryAdvances(branchId: string | undefined, selectedMonth?: Date) {
  const monthKey = selectedMonth ? `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}` : undefined;
  return useQuery({
    queryKey: salaryAdvanceKeys.list(branchId || '', monthKey),
    queryFn: async () => {
      if (!branchId) return [];
      return (await fetchSalaryAdvances(branchId, selectedMonth)) as SalaryAdvance[];
    },
    enabled: !!branchId,
  });
}

export function useMyAdvances(userId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.user(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return (await fetchMyAdvances(userId)) as SalaryAdvance[];
    },
    enabled: !!userId,
  });
}

export function useShiftAdvances(shiftId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.shift(shiftId || ''),
    queryFn: async () => {
      if (!shiftId) return [];
      return fetchShiftAdvances(shiftId);
    },
    enabled: !!shiftId,
  });
}

export function usePendingTransferAdvances(branchId: string | undefined) {
  return useQuery({
    queryKey: salaryAdvanceKeys.pendingTransfers(branchId || ''),
    queryFn: async () => {
      if (!branchId) return [];
      return (await fetchPendingTransferAdvances(branchId)) as SalaryAdvance[];
    },
    enabled: !!branchId,
  });
}

interface CreateAdvanceParams {
  branchId: string;
  userId: string;
  amount: number;
  reason?: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAdvanceParams) => createAdvance(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.list(variables.branchId) });
      if (variables.shiftId) {
        queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.shift(variables.shiftId) });
      }
      toast.success('Adelanto registrado correctamente');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al crear adelanto:', error);
      toast.error('Error al registrar el adelanto');
    },
  });
}

interface ApproveAdvanceParams {
  advanceId: string;
  paymentMethod: 'cash' | 'transfer';
  shiftId?: string;
}

export function useApproveAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ApproveAdvanceParams) => approveAdvance(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Adelanto aprobado');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al aprobar adelanto:', error);
      toast.error('Error al aprobar el adelanto');
    },
  });
}

export function useRejectAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advanceId: string) => rejectAdvance(advanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Solicitud rechazada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al rechazar:', error);
      toast.error('Error al rechazar la solicitud');
    },
  });
}

export function useMarkAdvanceTransferred() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ advanceId, reference }: { advanceId: string; reference?: string }) =>
      markAdvanceTransferred(advanceId, reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Transferencia marcada como ejecutada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error:', error);
      toast.error('Error al marcar transferencia');
    },
  });
}

interface RequestAdvanceParams {
  branchId: string;
  amount: number;
  reason?: string;
}

export function useRequestAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RequestAdvanceParams) => requestAdvance(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Solicitud de adelanto enviada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error al solicitar adelanto:', error);
      toast.error('Error al enviar la solicitud');
    },
  });
}

export function useCancelAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advanceId: string) => cancelAdvance(advanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.all });
      toast.success('Adelanto cancelado');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error:', error);
      toast.error('Error al cancelar adelanto');
    },
  });
}
