import { useQuery } from '@tanstack/react-query';
import { fetchRdoCategories } from '@/services/rdoService';
import { useAuth } from './useAuth';
import type { RdoCategory } from '@/types/rdo';

export interface RdoCategoryFilters {
  itemType?: string;
  section?: string;
  level?: number;
}

export function useRdoCategories(filters?: RdoCategoryFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rdo-categories', filters],
    queryFn: () => fetchRdoCategories(filters),
    enabled: !!user,
  });
}

/** Returns only level-3 categories suitable for selectors, optionally filtered by item type */
export function useRdoCategoryOptions(itemType?: string) {
  return useRdoCategories({ level: 3, itemType });
}
