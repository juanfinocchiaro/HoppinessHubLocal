import type { ItemFormState } from '@/components/finanzas/compraTypes';

export function emptyItem(): ItemFormState {
  return {
    tipo_item: 'insumo',
    insumo_id: '',
    quantity: 0,
    unidad: 'kg',
    unit_price: 0,
    subtotal: 0,
    afecta_costo_base: true,
    alicuota_iva: 21,
    iva_monto: 0,
    precio_unitario_bruto: 0,
    precio_bruto: 0,
    descuento_porcentaje: 0,
    descuento_monto: 0,
    precio_neto: 0,
  };
}

/** Recalculate IVA fields based on neto + alicuota */
export function recalcIva(item: ItemFormState): ItemFormState {
  const neto = Number(item.unit_price) || 0;
  const alicuota = item.alicuota_iva != null ? Number(item.alicuota_iva) : 0;
  const ivaMonto = neto * (alicuota / 100);
  const bruto = neto + ivaMonto;
  const qty = item.tipo_item === 'servicio' ? 1 : Number(item.quantity) || 0;
  return {
    ...item,
    iva_monto: Math.round(ivaMonto * 100) / 100,
    precio_unitario_bruto: Math.round(bruto * 100) / 100,
    subtotal: Math.round(neto * qty * 100) / 100,
    precio_neto: neto,
  };
}
