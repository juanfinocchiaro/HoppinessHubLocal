import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchProductPresence,
  updateProductPresence,
  type ProductPresence,
} from '@/services/productPresenceService';

export function useProductPresence(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-presence', productId],
    queryFn: () => fetchProductPresence(productId!),
    enabled: !!productId,
  });
}

export function useProductPresenceMutation(productId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductPresence) => updateProductPresence(productId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-presence', productId] });
      toast.success('Presencia por local actualizada');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });
}
