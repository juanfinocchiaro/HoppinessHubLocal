import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/services/apiClient';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface EmployeeConsumption {
  id: string;
  branch_id: string;
  user_id: string;
  amount: number;
  consumption_date: string;
  description: string | null;
  source: string;
  created_by: string | null;
  created_at: string;
}

/**
 * Fetch consumptions for a branch in a given month, grouped by user_id.
 */
export function useEmployeeConsumptionsByMonth(branchId: string, year: number, month: number) {
  const monthStart = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['employee-consumptions', branchId, year, month],
    queryFn: async () => {
      return apiGet<EmployeeConsumption[]>(`/hr/consumptions/${branchId}`, {
        startDate: monthStart,
        endDate: monthEnd,
      });
    },
    enabled: !!branchId,
    staleTime: 60_000,
  });
}

/**
 * Fetch salary advances for a branch in a given month, grouped by user_id.
 */
export function useSalaryAdvancesByMonth(branchId: string, year: number, month: number) {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));

  return useQuery({
    queryKey: ['salary-advances-month', branchId, year, month],
    queryFn: async () => {
      const all: { id: string; user_id: string; amount: number; status: string; reason: string | null; created_at: string }[] =
        await apiGet('/hr/advances/' + branchId);
      return all.filter(
        (a) =>
          a.status !== 'cancelled' &&
          a.created_at >= monthStart.toISOString() &&
          a.created_at <= monthEnd.toISOString(),
      );
    },
    enabled: !!branchId,
    staleTime: 60_000,
  });
}

/**
 * Mutation helpers for employee consumptions.
 */
export function useEmployeeConsumptionMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (params: {
      branchId: string;
      userId: string;
      amount: number;
      consumptionDate: string;
      description?: string;
    }) => {
      await apiPost(`/hr/consumptions/${params.branchId}`, {
        userId: params.userId,
        amount: params.amount,
        consumptionDate: params.consumptionDate,
        description: params.description || null,
        source: 'manual',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-consumptions'] });
      toast.success('Consumo registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`/hr/consumptions/entry/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-consumptions'] });
      toast.success('Consumo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, softDelete };
}

/**
 * Aggregate consumptions and advances by user_id into a map.
 */
export function aggregateByUser(
  consumptions: EmployeeConsumption[],
  advances: { user_id: string; amount: number }[],
): Map<string, { consumos: number; adelantos: number }> {
  const map = new Map<string, { consumos: number; adelantos: number }>();

  for (const c of consumptions) {
    const entry = map.get(c.user_id) || { consumos: 0, adelantos: 0 };
    entry.consumos += Number(c.amount);
    map.set(c.user_id, entry);
  }

  for (const a of advances) {
    const entry = map.get(a.user_id) || { consumos: 0, adelantos: 0 };
    entry.adelantos += Number(a.amount);
    map.set(a.user_id, entry);
  }

  return map;
}
