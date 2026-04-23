import { useQuery } from '@tanstack/react-query';
import { fetchUnifiedModifiers } from '@/services/modifiersService';
import type { UnifiedModifierGroup } from '@/services/modifiersService';

export type { UnifiedModifierGroup, UnifiedModifierOption } from '@/services/modifiersService';

/**
 * Fase 7 follow-up: lee el modelo unificado de modifiers via API canónica
 * `GET /api/menu/items/:id/modifiers`. Reemplaza la lectura paralela de
 * extras + removibles + grupos opcionales.
 */
export function useUnifiedModifiers(itemId: string | undefined) {
  return useQuery<UnifiedModifierGroup[]>({
    queryKey: ['unified-modifiers', itemId],
    queryFn: () => fetchUnifiedModifiers(itemId!),
    enabled: !!itemId,
  });
}
