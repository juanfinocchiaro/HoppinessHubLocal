/**
 * usePrintConfig - Config de salidas de impresión (ticket, delivery, backup)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchPrintConfig, upsertPrintConfig, type PrintConfig } from '@/services/configService';

export type { PrintConfig } from '@/services/configService';

export function usePrintConfig(branchId: string) {
  const qc = useQueryClient();
  const queryKey = ['print-config', branchId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPrintConfig(branchId),
    enabled: !!branchId,
  });

  const upsert = useMutation({
    mutationFn: (config: Partial<PrintConfig>) => upsertPrintConfig(branchId, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Configuración guardada');
    },
    onError: () => toast.error('Error al guardar configuración'),
  });

  return { ...query, upsert };
}
