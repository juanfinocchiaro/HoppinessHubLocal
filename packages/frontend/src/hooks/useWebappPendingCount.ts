/**
 * useWebappPendingCount â€” Hook con Realtime para contar pedidos webapp pendientes.
 *
 * Usa React Query + Supabase Realtime para estar sincronizado con WebappOrdersPanel.
 * Cuando se acepta/rechaza un pedido, invalidateAll() actualiza el conteo al instante.
 * Reproduce un beep cuando el conteo sube (nuevo pedido).
 */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPendingWebappCount,
  subscribeToPedidosChanges,
  unsubscribeChannel,
} from '@/services/webappOrderService';

export const WEBAPP_PENDING_COUNT_QUERY_KEY = ['webapp-pending-count'] as const;

interface UseWebappPendingCountOptions {
  branchId: string | undefined;
  enabled?: boolean;
}

let audioCtx: AudioContext | null = null;
function playBeep() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Audio not available â€” silently ignore
  }
}

export function useWebappPendingCount({ branchId, enabled = true }: UseWebappPendingCountOptions) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);

  const { data: count = 0, isLoading } = useQuery({
    queryKey: [...WEBAPP_PENDING_COUNT_QUERY_KEY, branchId],
    queryFn: () => fetchPendingWebappCount(branchId!),
    enabled: !!branchId && enabled,
  });

  // Beep cuando el conteo sube (nuevo pedido entrante)
  useEffect(() => {
    if (!enabled || count === undefined) return;
    if (count > prevCountRef.current) {
      playBeep();
    }
    prevCountRef.current = count;
  }, [count, enabled]);

  // Realtime: invalidar en cambios de pedidos (INSERT/UPDATE) para mantener sincronía
  useEffect(() => {
    if (!branchId || !enabled) return;
    const channel = subscribeToPedidosChanges(
      branchId,
      `webapp-pending-${branchId}`,
      () => {
        queryClient.invalidateQueries({
          queryKey: [...WEBAPP_PENDING_COUNT_QUERY_KEY, branchId],
        });
      },
    );

    return () => {
      unsubscribeChannel(channel);
    };
  }, [branchId, enabled, queryClient]);

  // Cuando no hay branchId o no está enabled, devolver 0
  const displayCount = branchId && enabled ? count : 0;

  return { count: displayCount, isLoading };
}
