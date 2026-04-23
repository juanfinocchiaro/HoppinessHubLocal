import { useQuery } from '@tanstack/react-query';
import { fetchPosConfig } from '@/services/configService';

export function usePosEnabled(branchId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['pos-config', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      return fetchPosConfig(branchId);
    },
    enabled: !!branchId,
  });

  return data?.pos_enabled ?? false;
}
