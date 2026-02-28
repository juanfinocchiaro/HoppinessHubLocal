/**
 * useStock - Stock completo con todos los hooks necesarios
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  fetchStockData,
  fetchInsumoUnit,
  fetchStockActualItem,
  upsertStockActual,
  insertStockMovimiento,
  fetchStockMovimientosHistory,
  insertStockConteo,
  deleteStockConteoItems,
  insertStockConteoItems,
  updateStockConteo,
  updateStockActualFields,
  insertStockActualRecord,
} from '@/services/posService';

// ===== TYPES =====
export type StockEstado = 'ok' | 'bajo' | 'critico' | 'sin_stock';

export interface StockItem {
  insumo_id: string;
  nombre: string;
  unidad: string;
  categoria: string | null;
  cantidad: number;
  stock_minimo: number | null;
  stock_critico: number | null;
  stock_minimo_local: number | null;
  stock_critico_local: number | null;
  estado: StockEstado;
  costo_unitario: number;
  ultimo_movimiento: string | null;
  tiene_stock_actual: boolean;
}

export interface StockResumen {
  total: number;
  ok: number;
  bajo: number;
  critico: number;
  sin_stock: number;
}

function calcularEstado(
  cantidad: number,
  minimo: number | null,
  critico: number | null,
  minimoLocal: number | null,
  criticoLocal: number | null,
): StockEstado {
  const min = minimoLocal ?? minimo;
  const crit = criticoLocal ?? critico;
  if (cantidad <= 0) return 'sin_stock';
  if (crit != null && cantidad <= crit) return 'critico';
  if (min != null && cantidad <= min) return 'bajo';
  return 'ok';
}

// ===== 1. STOCK COMPLETO =====
export function useStockCompleto(branchId: string) {
  return useQuery({
    queryKey: ['stock-completo', branchId],
    queryFn: async () => {
      const { insumos, stockActual, movimientos } = await fetchStockData(branchId);

      const stockMap = new Map(stockActual.map((s) => [s.insumo_id, s]));
      const lastMovMap = new Map<string, string>();
      movimientos.forEach((m) => {
        if (!lastMovMap.has(m.insumo_id)) lastMovMap.set(m.insumo_id, m.created_at ?? '');
      });

      const items: StockItem[] = insumos.map((ins) => {
        const sa = stockMap.get(ins.id);
        const cantidad = sa ? Number(sa.cantidad) : 0;
        const cat = ins.categorias_insumo as { nombre?: string } | null;
        return {
          insumo_id: ins.id,
          nombre: ins.nombre,
          unidad: ins.unidad_base ?? 'un',
          categoria: cat?.nombre ?? null,
          cantidad,
          stock_minimo: sa?.stock_minimo != null ? Number(sa.stock_minimo) : null,
          stock_critico: sa?.stock_critico != null ? Number(sa.stock_critico) : null,
          stock_minimo_local: sa?.stock_minimo_local != null ? Number(sa.stock_minimo_local) : null,
          stock_critico_local: sa?.stock_critico_local != null ? Number(sa.stock_critico_local) : null,
          estado: calcularEstado(
            cantidad,
            sa?.stock_minimo != null ? Number(sa.stock_minimo) : null,
            sa?.stock_critico != null ? Number(sa.stock_critico) : null,
            sa?.stock_minimo_local != null ? Number(sa.stock_minimo_local) : null,
            sa?.stock_critico_local != null ? Number(sa.stock_critico_local) : null,
          ),
          costo_unitario: Number(ins.costo_por_unidad_base ?? 0),
          ultimo_movimiento: lastMovMap.get(ins.id) ?? null,
          tiene_stock_actual: !!sa,
        };
      });

      return items;
    },
    enabled: !!branchId,
  });
}

// ===== 2. STOCK RESUMEN =====
export function useStockResumen(branchId: string) {
  const { data: items } = useStockCompleto(branchId);
  return {
    total: items?.length ?? 0,
    ok: items?.filter((i) => i.estado === 'ok').length ?? 0,
    bajo: items?.filter((i) => i.estado === 'bajo').length ?? 0,
    critico: items?.filter((i) => i.estado === 'critico').length ?? 0,
    sin_stock: items?.filter((i) => i.estado === 'sin_stock').length ?? 0,
  };
}

// ===== 3. STOCK INICIAL MASIVO =====
export type StockInicialItem = { insumo_id: string; cantidad: number };

export function useStockInicialMasivo(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: StockInicialItem[]) => {
      if (!branchId || items.length === 0) return;
      const nonZero = items.filter((i) => i.cantidad > 0);
      if (nonZero.length === 0) return;

      for (const it of nonZero) {
        const unidad = await fetchInsumoUnit(it.insumo_id);
        await upsertStockActual(branchId, it.insumo_id, it.cantidad, unidad);
        await insertStockMovimiento({
          branch_id: branchId,
          insumo_id: it.insumo_id,
          tipo: 'stock_inicial',
          cantidad: it.cantidad,
          cantidad_anterior: 0,
          cantidad_nueva: it.cantidad,
          motivo: 'Carga inicial de stock',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      toast.success('Stock inicial cargado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== 4. AJUSTE INLINE =====
export function useAjusteInline(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { insumo_id: string; cantidad_nueva: number; motivo: string; nota?: string }) => {
      const unidad = await fetchInsumoUnit(p.insumo_id);
      const row = await fetchStockActualItem(branchId, p.insumo_id);
      const cantidadAnterior = Number(row?.cantidad ?? 0);

      await upsertStockActual(branchId, p.insumo_id, p.cantidad_nueva, unidad);
      await insertStockMovimiento({
        branch_id: branchId,
        insumo_id: p.insumo_id,
        tipo: 'ajuste',
        cantidad: Math.abs(p.cantidad_nueva - cantidadAnterior),
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: p.cantidad_nueva,
        motivo: p.motivo || 'Ajuste manual',
        nota: p.nota || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      toast.success('Stock ajustado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== 5. MOVIMIENTOS POR INSUMO =====
export function useStockMovimientos(branchId: string, insumoId: string | null) {
  return useQuery({
    queryKey: ['stock-movimientos', branchId, insumoId],
    queryFn: () => fetchStockMovimientosHistory(branchId, insumoId!),
    enabled: !!branchId && !!insumoId,
  });
}

// ===== 6. CONTEO FISICO =====
export function useStockConteo(branchId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const crearBorrador = useMutation({
    mutationFn: async (params: { fecha: string; periodo?: string; nota_general?: string }) => {
      return insertStockConteo({
        branch_id: branchId, fecha: params.fecha, periodo: params.periodo,
        nota_general: params.nota_general, status: 'borrador', created_by: user?.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-conteos', branchId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const guardarItems = useMutation({
    mutationFn: async (params: {
      conteo_id: string;
      items: Array<{ insumo_id: string; stock_teorico: number; stock_real: number | null; costo_unitario: number }>;
    }) => {
      await deleteStockConteoItems(params.conteo_id);
      await insertStockConteoItems(
        params.items.map((it) => ({
          conteo_id: params.conteo_id, insumo_id: it.insumo_id,
          stock_teorico: it.stock_teorico, stock_real: it.stock_real, costo_unitario: it.costo_unitario,
        })),
      );
    },
    onSuccess: () => toast.success('Progreso guardado'),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmarConteo = useMutation({
    mutationFn: async (params: {
      conteo_id: string;
      items: Array<{ insumo_id: string; stock_teorico: number; stock_real: number; costo_unitario: number }>;
      nota_general?: string;
    }) => {
      await deleteStockConteoItems(params.conteo_id);
      await insertStockConteoItems(
        params.items.map((it) => ({
          conteo_id: params.conteo_id, insumo_id: it.insumo_id,
          stock_teorico: it.stock_teorico, stock_real: it.stock_real, costo_unitario: it.costo_unitario,
        })),
      );

      for (const it of params.items) {
        if (it.stock_real !== it.stock_teorico) {
          const unidad = await fetchInsumoUnit(it.insumo_id);
          await upsertStockActual(branchId, it.insumo_id, it.stock_real, unidad);
          await insertStockMovimiento({
            branch_id: branchId, insumo_id: it.insumo_id, tipo: 'conteo_fisico',
            cantidad: Math.abs(it.stock_real - it.stock_teorico),
            cantidad_anterior: it.stock_teorico, cantidad_nueva: it.stock_real,
            motivo: 'Conteo físico',
          });
        }
      }

      const conDiferencia = params.items.filter((i) => i.stock_real !== i.stock_teorico);
      const valorDiferencias = conDiferencia.reduce(
        (sum, i) => sum + Math.abs((i.stock_real - i.stock_teorico) * i.costo_unitario), 0,
      );

      await updateStockConteo(params.conteo_id, {
        status: 'confirmado', confirmed_at: new Date().toISOString(),
        nota_general: params.nota_general,
        resumen: {
          total_insumos: params.items.length, con_diferencia: conDiferencia.length,
          sin_diferencia: params.items.length - conDiferencia.length, valor_diferencias: valorDiferencias,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      qc.invalidateQueries({ queryKey: ['stock-conteos', branchId] });
      toast.success('Conteo confirmado y stock ajustado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { crearBorrador, guardarItems, confirmarConteo };
}

// ===== 7. ACTUALIZAR UMBRALES =====
export function useUpdateUmbrales(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { insumo_id: string; stock_minimo_local: number | null; stock_critico_local: number | null }) => {
      const existing = await fetchStockActualItem(branchId, p.insumo_id);

      if (existing) {
        await updateStockActualFields(branchId, p.insumo_id, {
          stock_minimo_local: p.stock_minimo_local,
          stock_critico_local: p.stock_critico_local,
        });
      } else {
        const unidad = await fetchInsumoUnit(p.insumo_id);
        await insertStockActualRecord({
          branch_id: branchId, insumo_id: p.insumo_id, cantidad: 0, unidad,
          stock_minimo_local: p.stock_minimo_local, stock_critico_local: p.stock_critico_local,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-completo', branchId] });
      toast.success('Umbrales actualizados');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
