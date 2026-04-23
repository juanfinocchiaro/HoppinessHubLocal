/**
 * useKitchen - Pedidos para cocina con realtime y modificadores
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  fetchKitchenOrders,
  subscribeToPedidosChanges,
  removeSupabaseChannel,
} from '@/services/posService';

export interface KitchenModificador {
  id: string;
  description: string;
  type: string;
  extra_price: number | null;
}

export interface KitchenItem {
  id: string;
  name: string | null;
  quantity: number;
  notes: string | null;
  estacion: string | null;
  status: string;
  order_item_modifiers: KitchenModificador[];
}

export interface KitchenPedido {
  id: string;
  order_number: number;
  service_type: string | null;
  caller_number: number | null;
  canal_venta: string | null;
  customer_name: string | null;
  cliente_user_id: string | null;
  created_at: string;
  status: string;
  ready_at_time: string | null;
  prep_started_at_time: string | null;
  source: string | null;
  order_items: KitchenItem[];
}

export function useKitchen(branchId: string) {
  const qc = useQueryClient();
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const query = useQuery({
    queryKey: ['pos-kitchen', branchId],
    queryFn: async () => {
      const data = await fetchKitchenOrders(branchId);
      return data as unknown as KitchenPedido[];
    },
    enabled: !!branchId,
    refetchInterval: 30000, // fallback polling every 30s
  });

  // Detect new orders for sound alert
  const newOrderDetected = useRef(false);
  useEffect(() => {
    if (!query.data) return;
    const currentIds = new Set(query.data.map((p) => p.id));
    if (initialLoadDone.current) {
      for (const id of currentIds) {
        if (!prevIdsRef.current.has(id)) {
          newOrderDetected.current = true;
          break;
        }
      }
    }
    prevIdsRef.current = currentIds;
    initialLoadDone.current = true;
  }, [query.data]);

  // Realtime subscription
  useEffect(() => {
    if (!branchId) return;
    const channel = subscribeToPedidosChanges(branchId, () => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
    });

    return () => {
      removeSupabaseChannel(channel);
    };
  }, [branchId, qc]);

  return {
    ...query,
    consumeNewOrderAlert: () => {
      if (newOrderDetected.current) {
        newOrderDetected.current = false;
        return true;
      }
      return false;
    },
  };
}
