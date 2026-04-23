import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchCodigosDescuento as fetchCodigosDescuentoService,
  findCodigoDescuento,
  countCodigoUsageByUser,
  registerCodeUsage as registerCodeUsageService,
  createCodigoDescuento as createCodigoDescuentoService,
  updateCodigoDescuento as updateCodigoDescuentoService,
  softDeleteCodigoDescuento,
} from '@/services/promoService';

export interface CodigoDescuento {
  id: string;
  code: string;
  type: 'descuento_porcentaje' | 'descuento_fijo';
  value: number;
  max_uses: number | null;
  current_uses: number;
  single_use_per_user: boolean;
  min_order_amount: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  branch_ids: string[];
  created_at: string;
}

export type CodigoDescuentoFormData = Omit<CodigoDescuento, 'id' | 'current_uses' | 'created_at'>;

export function useCodigosDescuento() {
  return useQuery({
    queryKey: ['codigos-descuento'],
    queryFn: async () => {
      const data = await fetchCodigosDescuentoService();
      return data as CodigoDescuento[];
    },
  });
}

export function useValidateCode(
  branchId: string | undefined,
  context: 'webapp' | 'pos' = 'webapp',
) {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ codigo, subtotal }: { codigo: string; subtotal: number }) => {
      const data = await findCodigoDescuento(codigo);

      if (!data) throw new Error('Código no válido');

      const code = data as CodigoDescuento;
      const today = new Date().toISOString().slice(0, 10);

      if (code.start_date && today < code.start_date)
        throw new Error('Este código aún no está activo');
      if (code.end_date && today > code.end_date) throw new Error('Este código ya expiró');
      if (code.max_uses && code.current_uses >= code.max_uses)
        throw new Error('Este código ya alcanzó el máximo de usos');
      const bids = code.branch_ids ?? [];
      if (bids.length > 0) {
        if (!branchId) throw new Error('No se puede validar el código sin un local seleccionado');
        if (!bids.includes(branchId)) throw new Error('Este código no aplica en este local');
      }
      if (code.min_order_amount && subtotal < code.min_order_amount) {
        throw new Error(`Pedido mínimo: $${code.min_order_amount.toLocaleString('es-AR')}`);
      }

      if (context === 'webapp' && code.single_use_per_user) {
        if (!user) throw new Error('Iniciá sesión para usar este código');
        const count = await countCodigoUsageByUser(code.id, user.id);
        if (count > 0) throw new Error('Ya usaste este código');
      }

      let descuento = 0;
      if (code.type === 'descuento_porcentaje') {
        descuento = Math.round((subtotal * code.value) / 100);
      } else {
        descuento = Math.min(code.value, subtotal);
      }

      return { code, descuento };
    },
  });
}

/** Register usage of a discount code (call after order is confirmed) */
export async function registerCodeUsage(params: {
  codigoId: string;
  userId?: string;
  pedidoId?: string;
  montoDescontado: number;
}) {
  await registerCodeUsageService(params);
}

export function useCodigoDescuentoMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: (data: CodigoDescuentoFormData) =>
      createCodigoDescuentoService(data as unknown as Record<string, unknown>, user?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos-descuento'] });
      toast.success('Código creado');
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CodigoDescuentoFormData> }) =>
      updateCodigoDescuentoService(id, data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos-descuento'] });
      toast.success('Código actualizado');
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => softDeleteCodigoDescuento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['codigos-descuento'] });
      toast.success('Código eliminado');
    },
    onError: (e) => toast.error(e.message),
  });

  return { create, update, remove };
}
