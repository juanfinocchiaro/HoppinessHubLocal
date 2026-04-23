import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchPromoDiscountItems } from '@/services/promoService';

export interface PromoDiscountSummary {
  ventaTeorica: number;
  ventaReal: number;
  descuentoTotal: number;
  pedidosConPromo: number;
  pedidosTotales: number;
  descuentoPromedio: number;
}

/**
 * Calcula el descuento de promociones (precio_referencia > precio_unitario)
 * para un branch y período dado, desde pedido_items.
 */
export function usePromoDiscountData(branchId: string, periodo: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promo-discount', branchId, periodo],
    queryFn: async () => {
      const [year, month] = periodo.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      const allItems = await fetchPromoDiscountItems(branchId, startDate, endDate);

      let ventaTeorica = 0;
      let ventaReal = 0;
      let descuentoTotal = 0;
      const pedidoIdsConPromo = new Set<string>();
      const pedidoIds = new Set<string>();

      for (const item of allItems) {
        const qty = Number((item as Record<string, unknown>).cantidad) || 0;
        const precioUnit = Number((item as Record<string, unknown>).precio_unitario) || 0;
        const precioRef = Number((item as Record<string, unknown>).reference_price) || 0;
        const sub = Number((item as Record<string, unknown>).subtotal) || 0;
        const pedidoId = (item as Record<string, unknown>).pedido_id as string;

        pedidoIds.add(pedidoId);

        if (precioRef > precioUnit) {
          ventaTeorica += precioRef * qty;
          ventaReal += sub;
          descuentoTotal += (precioRef - precioUnit) * qty;
          pedidoIdsConPromo.add(pedidoId);
        } else {
          ventaTeorica += sub;
          ventaReal += sub;
        }
      }

      const pedidosConPromo = pedidoIdsConPromo.size;
      const pedidosTotales = pedidoIds.size;

      return {
        ventaTeorica,
        ventaReal,
        descuentoTotal,
        pedidosConPromo,
        pedidosTotales,
        descuentoPromedio: pedidosConPromo > 0 ? descuentoTotal / pedidosConPromo : 0,
      } as PromoDiscountSummary;
    },
    enabled: !!user && !!branchId && !!periodo,
  });
}
