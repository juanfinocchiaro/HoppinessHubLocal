import type { ItemFacturaFormData } from '@/types/compra';

export interface ItemFormState extends ItemFacturaFormData {
  tipo_item: 'insumo' | 'servicio';
  concepto_servicio_id?: string;
}
