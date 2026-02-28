/**
 * useStockCierre - Cierre mensual de stock: cálculo esperado y guardado
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchStockMovimientosPeriod,
  fetchCierreAnterior,
  fetchStockActualWithNames,
  fetchInsumosById,
  fetchPrevCierreForInsumo,
  fetchStockMovimientosForInsumo,
  upsertCierreMensual,
  fetchStockActualRow,
  upsertStockActual,
  insertStockMovimiento,
  fetchInsumoCostInfo,
  insertConsumoManual,
} from '@/services/posService';

function periodToRange(periodo: string) {
  const [y, m] = periodo.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export type CierreInsumoRow = {
  insumo_id: string;
  insumo_nombre: string;
  unidad: string;
  stock_apertura: number;
  compras: number;
  consumo_ventas: number;
  stock_esperado: number;
  stock_cierre_fisico?: number;
  merma?: number;
};

/** Obtiene por insumo: apertura (cierre anterior), compras y ventas del mes, y stock esperado */
export function useStockCierrePeriod(branchId: string, periodo: string | null) {
  return useQuery({
    queryKey: ['pos-stock-cierre', branchId, periodo],
    queryFn: async (): Promise<CierreInsumoRow[]> => {
      if (!branchId || !periodo) return [];
      const { start, end } = periodToRange(periodo);
      const [y, m] = periodo.split('-').map(Number);

      const movimientos = await fetchStockMovimientosPeriod(branchId, start, end);

      const cierreAnterior = await fetchCierreAnterior(
        branchId,
        new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10),
      );

      const prevMap = new Map(
        cierreAnterior.map((r) => [r.insumo_id, Number(r.stock_cierre_fisico)]),
      );
      const insumoIds = new Set<string>(movimientos.map((m) => m.insumo_id));
      prevMap.forEach((_, id) => insumoIds.add(id));

      const comprasByInsumo = new Map<string, number>();
      const ventasByInsumo = new Map<string, number>();
      for (const m of movimientos) {
        const id = m.insumo_id;
        const q = Number(m.cantidad ?? 0);
        if (m.tipo === 'compra') comprasByInsumo.set(id, (comprasByInsumo.get(id) ?? 0) + q);
        if (m.tipo === 'venta') ventasByInsumo.set(id, (ventasByInsumo.get(id) ?? 0) + q);
      }

      if (insumoIds.size === 0) {
        const stockActual = await fetchStockActualWithNames(branchId);
        return stockActual.map(
          (r: {
            insumo_id: string;
            cantidad: number;
            unidad: string;
            insumos?: { nombre?: string };
          }) => ({
            insumo_id: r.insumo_id,
            insumo_nombre: (r.insumos as { nombre?: string })?.nombre ?? r.insumo_id,
            unidad: r.unidad,
            stock_apertura: 0,
            compras: 0,
            consumo_ventas: 0,
            stock_esperado: Number(r.cantidad ?? 0),
          }),
        );
      }

      const insumos = await fetchInsumosById(Array.from(insumoIds));

      const insumoInfo = new Map(
        insumos.map((i: { id: string; nombre?: string; unidad_base?: string }) => [
          i.id,
          { nombre: i.nombre ?? i.id, unidad: i.unidad_base ?? 'un' },
        ]),
      );

      return Array.from(insumoIds).map((id) => {
        const apertura = prevMap.get(id) ?? 0;
        const compras = comprasByInsumo.get(id) ?? 0;
        const consumo_ventas = ventasByInsumo.get(id) ?? 0;
        const stock_esperado = apertura + compras - consumo_ventas;
        const info = insumoInfo.get(id) ?? { nombre: id, unidad: 'un' };
        return {
          insumo_id: id,
          insumo_nombre: info.nombre,
          unidad: info.unidad,
          stock_apertura: apertura,
          compras,
          consumo_ventas,
          stock_esperado,
        };
      });
    },
    enabled: !!branchId && !!periodo,
  });
}

export function useSaveCierreMensual(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      periodo: string;
      items: { insumo_id: string; stock_cierre_fisico: number }[];
    }) => {
      const [y, m] = p.periodo.split('-').map(Number);
      const periodDate = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      const periodEnd = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      const prevMonthDate = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
      for (const it of p.items) {
        const prevCierre = await fetchPrevCierreForInsumo(branchId, it.insumo_id, prevMonthDate);
        const stock_apertura = Number(prevCierre?.stock_cierre_fisico ?? 0);
        const movs = await fetchStockMovimientosForInsumo(
          branchId,
          it.insumo_id,
          periodDate,
          periodEnd,
        );
        let compras = 0;
        let consumo_ventas = 0;
        for (const mov of movs) {
          if (mov.tipo === 'compra') compras += Number(mov.cantidad);
          if (mov.tipo === 'venta') consumo_ventas += Number(mov.cantidad);
        }
        const stock_esperado = stock_apertura + compras - consumo_ventas;
        const merma = Math.max(0, stock_esperado - it.stock_cierre_fisico);
        await upsertCierreMensual({
          branch_id: branchId,
          insumo_id: it.insumo_id,
          periodo: periodDate,
          stock_apertura,
          compras,
          consumo_ventas,
          stock_esperado,
          stock_cierre_fisico: it.stock_cierre_fisico,
          merma,
        });
        const actualRow = await fetchStockActualRow(branchId, it.insumo_id);
        const cantidadAnterior = Number(actualRow?.cantidad ?? 0);
        await upsertStockActual(
          branchId,
          it.insumo_id,
          it.stock_cierre_fisico,
          actualRow?.unidad ?? 'un',
        );
        if (merma > 0) {
          await insertStockMovimiento({
            branch_id: branchId,
            insumo_id: it.insumo_id,
            tipo: 'merma',
            cantidad: merma,
            cantidad_anterior: cantidadAnterior,
            cantidad_nueva: it.stock_cierre_fisico,
            motivo: `Cierre mensual ${p.periodo}`,
          });
          const insumo = await fetchInsumoCostInfo(it.insumo_id);
          const costo = Number(insumo?.costo_por_unidad_base ?? 0);
          const montoConsumo = merma * costo;
          const catPl =
            insumo?.categoria_pl &&
            [
              'materia_prima',
              'descartables',
              'limpieza',
              'mantenimiento',
              'marketing',
              'varios',
            ].includes(insumo.categoria_pl)
              ? insumo.categoria_pl
              : 'materia_prima';
          if (montoConsumo > 0) {
            await insertConsumoManual({
              branch_id: branchId,
              periodo: p.periodo,
              categoria_pl: catPl,
              monto_consumido: Math.round(montoConsumo * 100) / 100,
              tipo: 'calculado',
              observaciones: `Cierre stock ${p.periodo}: ${insumo?.nombre ?? it.insumo_id}`,
            });
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['pos-stock-cierre', branchId, variables.periodo] });
      qc.invalidateQueries({ queryKey: ['pos-stock', branchId] });
      qc.invalidateQueries({ queryKey: ['consumos_manuales'] });
      toast.success('Cierre de stock guardado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
