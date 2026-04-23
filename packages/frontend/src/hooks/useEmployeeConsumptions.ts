import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fromUntyped } from '@/lib/supabase-helpers';
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
      const { data, error } = await fromUntyped('employee_consumptions')
        .select('id, branch_id, user_id, amount, consumption_date, description, source, created_by, created_at')
        .eq('branch_id', branchId)
        .gte('consumption_date', monthStart)
        .lte('consumption_date', monthEnd)
        .is('deleted_at', null)
        .order('consumption_date', { ascending: false });
      if (error) throw error;
      return (data || []) as EmployeeConsumption[];
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
      const { data, error } = await supabase
        .from('salary_advances')
        .select('id, user_id, amount, status, reason, created_at')
        .eq('branch_id', branchId)
        .neq('status', 'cancelled')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());
      if (error) throw error;
      return data || [];
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await fromUntyped('employee_consumptions')
        .insert({
          branch_id: params.branchId,
          user_id: params.userId,
          amount: params.amount,
          consumption_date: params.consumptionDate,
          description: params.description || null,
          source: 'manual',
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-consumptions'] });
      toast.success('Consumo registrado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromUntyped('employee_consumptions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
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
