/**
 * useShiftClosures - CRUD hooks for shift closures
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchShiftClosuresByDate,
  fetchShiftClosuresByDateRange,
  fetchShiftClosureSingle,
  fetchAllShiftClosuresInRange,
  fetchAllBranches,
  fetchActiveBranchShifts,
  upsertShiftClosure,
  fetchEnabledBranchShifts,
} from '@/services/schedulesService';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Json } from '@/types/database';
import { getOperationalDate } from '@/lib/operationalDate';
import {
  SHIFT_LABELS as UNIFIED_SHIFT_LABELS,
  getUnifiedShiftLabel,
  type CanonicalShiftType,
} from '@/types/shift';
import type {
  ShiftClosure,
  ShiftClosureInput,
  HamburguesasData,
  VentasLocalData,
  VentasAppsData,
  ArqueoCaja,
  ShiftType,
} from '@/types/shiftClosure';
import * as closureCalcs from '@/types/shiftClosure';

// Helper to parse JSONB fields from DB
function parseShiftClosure(row: any): ShiftClosure {
  return {
    ...row,
    // Map new DB column names to existing TS interface names
    hamburguesas: row.burgers as HamburguesasData,
    ventas_local: row.local_sales as VentasLocalData,
    ventas_apps: row.app_sales as VentasAppsData,
    arqueo_caja: (row.register_reconciliation as ArqueoCaja) || { diferencia_caja: 0 },
    total_facturado: row.total_invoiced,
    total_hamburguesas: row.total_burgers,
    total_vendido: row.total_sold,
    total_efectivo: row.total_cash,
    tiene_alerta_facturacion: row.has_invoicing_alert,
    tiene_alerta_posnet: row.has_posnet_alert,
    tiene_alerta_apps: row.has_apps_alert,
    tiene_alerta_caja: row.has_register_alert,
    diferencia_posnet: row.posnet_difference,
    diferencia_apps: row.apps_difference,
  };
}

/**
 * Get closures for a specific branch on a specific date
 */
export function useDateClosures(branchId: string, date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['shift-closures', branchId, dateStr],
    queryFn: async () => {
      const data = await fetchShiftClosuresByDate(branchId, dateStr);
      return data.map(parseShiftClosure);
    },
    enabled: !!branchId,
  });
}

/**
 * Get closures for today's operational date
 * Uses operational date logic: 00:00-04:59 belongs to previous day
 */
export function useTodayClosures(branchId: string) {
  return useDateClosures(branchId, getOperationalDate());
}

/**
 * Get closures for a date range
 */
export function useClosuresByDateRange(branchId: string, from: Date, to: Date) {
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['shift-closures-range', branchId, fromStr, toStr],
    queryFn: async () => {
      const data = await fetchShiftClosuresByDateRange(branchId, fromStr, toStr);
      return data.map(parseShiftClosure);
    },
    enabled: !!branchId,
  });
}

/**
 * Get a specific closure
 */
export function useShiftClosure(branchId: string, date: string, shift: ShiftType) {
  return useQuery({
    queryKey: ['shift-closure', branchId, date, shift],
    queryFn: async () => {
      const data = await fetchShiftClosureSingle(branchId, date, shift);
      return data ? parseShiftClosure(data) : null;
    },
    enabled: !!branchId && !!date && !!shift,
  });
}

/**
 * Get brand-wide summary for a date range (for Mi Marca dashboard)
 */
export function useBrandClosuresSummary(from: Date, to: Date) {
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['brand-closures-summary', fromStr, toStr],
    queryFn: async () => {
      const closures = await fetchAllShiftClosuresInRange(fromStr, toStr);
      const branches = await fetchAllBranches();
      const branchShifts = await fetchActiveBranchShifts();

      // Build summary per branch
      const summary = (branches || []).map((branch) => {
        const branchClosures = (closures || [])
          .filter((c) => c.branch_id === branch.id)
          .map(parseShiftClosure);

        const activeShifts = (branchShifts || [])
          .filter((s) => s.branch_id === branch.id)
          .map((s) => s.name.toLowerCase());

        // Aggregate totals
        const totals = branchClosures.reduce(
          (acc, c) => ({
            vendido: acc.vendido + Number(c.total_vendido || 0),
            efectivo: acc.efectivo + Number(c.total_efectivo || 0),
            digital: acc.digital + Number(c.total_digital || 0),
            hamburguesas: acc.hamburguesas + Number(c.total_hamburguesas || 0),
            clasicas: acc.clasicas + (c.hamburguesas?.clasicas || 0),
            originales: acc.originales + (c.hamburguesas?.originales || 0),
            mas_sabor: acc.mas_sabor + (c.hamburguesas?.mas_sabor || 0),
            veggies:
              acc.veggies +
              ((c.hamburguesas?.veggies?.not_american || 0) +
                (c.hamburguesas?.veggies?.not_claudio || 0)),
            ultrasmash:
              acc.ultrasmash +
              ((c.hamburguesas?.ultrasmash?.ultra_cheese || 0) +
                (c.hamburguesas?.ultrasmash?.ultra_bacon || 0)),
            extras:
              acc.extras +
              ((c.hamburguesas?.extras?.extra_carne || 0) +
                (c.hamburguesas?.extras?.extra_not_burger || 0) +
                (c.hamburguesas?.extras?.extra_not_chicken || 0)),
            alertas:
              acc.alertas +
              (c.tiene_alerta_facturacion ? 1 : 0) +
              (c.tiene_alerta_posnet ? 1 : 0) +
              (c.tiene_alerta_apps ? 1 : 0) +
              (c.tiene_alerta_caja ? 1 : 0),
          }),
          {
            vendido: 0,
            efectivo: 0,
            digital: 0,
            hamburguesas: 0,
            clasicas: 0,
            originales: 0,
            mas_sabor: 0,
            veggies: 0,
            ultrasmash: 0,
            extras: 0,
            alertas: 0,
          },
        );

        // Map closures by shift for status display
        const closuresByShift = new Map<string, ShiftClosure>();
        branchClosures.forEach((c) => {
          closuresByShift.set(c.shift, c);
        });

        return {
          branch,
          totals,
          closures: branchClosures,
          closuresByShift,
          activeShifts,
        };
      });

      return summary;
    },
  });
}

/**
 * Save (upsert) a shift closure
 */
export function useSaveShiftClosure() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ShiftClosureInput) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      // Calculate all totals
      const totalHamburguesas = closureCalcs.calcularTotalesHamburguesas(input.hamburguesas);
      const totalesLocal = closureCalcs.calcularTotalesVentasLocal(input.ventas_local);
      const totalesApps = closureCalcs.calcularTotalesVentasApps(input.ventas_apps);

      const totalVendido = totalesLocal.total + totalesApps.total;
      const totalEfectivo = totalesLocal.efectivo + totalesApps.efectivo;
      const totalDigital = totalesLocal.digital + totalesApps.digital;

      // Invoicing calculations
      const facturacionEsperada = closureCalcs.calcularFacturacionEsperada(
        input.ventas_local,
        input.ventas_apps,
        input.reglas_facturacion,
      );
      const facturacionDiferencia = input.total_facturado - facturacionEsperada;
      const tieneAlertaFacturacion =
        facturacionEsperada > 0 && Math.abs(facturacionDiferencia) > facturacionEsperada * 0.1;

      // Posnet comparison (incl. cobrado_posnet from Más Delivery)
      const posnetDiff = closureCalcs.calcularDiferenciaPosnet(
        input.ventas_local,
        input.ventas_apps,
      );

      // Apps comparison
      const appsDiff = closureCalcs.calcularDiferenciasApps(input.ventas_apps);

      // Cash count
      const tieneAlertaCaja = input.arqueo_caja.diferencia_caja !== 0;

      // Cast JSONB data to Json for Supabase
      const hamburguesasJson = input.hamburguesas as unknown as Json;
      const ventasLocalJson = input.ventas_local as unknown as Json;
      const ventasAppsJson = input.ventas_apps as unknown as Json;
      const arqueoCajaJson = input.arqueo_caja as unknown as Json;

      const closureData = {
        burgers: hamburguesasJson,
        local_sales: ventasLocalJson,
        app_sales: ventasAppsJson,
        register_reconciliation: arqueoCajaJson,
        total_invoiced: input.total_facturado,
        total_burgers: totalHamburguesas,
        total_sold: totalVendido,
        total_cash: totalEfectivo,
        total_digital: totalDigital,
        expected_invoicing: facturacionEsperada,
        invoicing_difference: facturacionDiferencia,
        has_invoicing_alert: tieneAlertaFacturacion,
        posnet_difference: posnetDiff.diferencia,
        apps_difference: appsDiff.diferencia,
        has_posnet_alert: posnetDiff.tieneAlerta,
        has_apps_alert: appsDiff.tieneAlerta,
        has_register_alert: tieneAlertaCaja,
        notes: input.notes || null,
      };

      // Atomic upsert: avoids race condition where two users
      // could create duplicate closures for the same branch+date+shift.
      const data = await upsertShiftClosure({
        branch_id: input.branch_id,
        date: input.date,
        shift: input.shift,
        ...closureData,
        closed_by: user.id,
        updated_by: user.id,
      });

      return parseShiftClosure(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-closures'] });
      queryClient.invalidateQueries({ queryKey: ['shift-closure'] });
      queryClient.invalidateQueries({ queryKey: ['brand-closures-summary'] });
      toast.success(`Cierre guardado â€” Turno ${data.shift}`);
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });
}

// Shift label helpers
export const SHIFT_LABELS: Record<ShiftType, string> = UNIFIED_SHIFT_LABELS as Record<
  CanonicalShiftType,
  string
>;

export function getShiftLabel(shift: string): string {
  return getUnifiedShiftLabel(shift);
}

// Get enabled shifts from branch_shifts table
export function useEnabledShifts(branchId: string) {
  return useQuery({
    queryKey: ['branch-shifts-enabled', branchId],
    queryFn: async () => {
      const data = await fetchEnabledBranchShifts(branchId);

      return data.map((s) => ({
        id: s.id,
        value: s.name.toLowerCase() as ShiftType,
        label: s.name,
        startTime: s.start_time,
        endTime: s.end_time,
      }));
    },
    enabled: !!branchId,
  });
}
