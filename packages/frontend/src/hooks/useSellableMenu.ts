import { useQuery } from '@tanstack/react-query';
import { fetchSellableMenu } from '@/services/sellableMenuService';
import type { SellableMenuResponse } from '@hoppiness/shared';

/**
 * Fase 1: hook canónico para consumir el menú vendible.
 * POS y WebApp lo usan en lugar de combinar ad-hoc `useItemsCarta` +
 * `useActivePromoItems` + overrides de canal.
 *
 * El `at` se actualiza cada 60s por default para que las promos que se
 * apagan/prenden por hora reflejen en tiempo razonable sin refetch manual.
 */
export function useSellableMenu(params: {
  channel: string | undefined;
  branch?: string | null;
  /** Cada cuánto re-pedir al backend (ms). Default 5 min. */
  refetchIntervalMs?: number;
}) {
  const { channel, branch } = params;
  return useQuery<SellableMenuResponse>({
    queryKey: ['sellable-menu', channel, branch],
    queryFn: () => fetchSellableMenu({ channel: channel!, branch: branch ?? undefined }),
    enabled: !!channel,
    refetchInterval: params.refetchIntervalMs ?? 5 * 60 * 1000,
    staleTime: 30 * 1000,
  });
}
