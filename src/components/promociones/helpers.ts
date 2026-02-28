import type { PromocionFormData } from '@/hooks/usePromociones';
import type { PromoItemDraft } from './types';
import { ALL_CANALES, CANAL_LABELS } from './constants';

export function formatTimeRange(inicio: string, fin: string): string {
  const h0 = inicio?.slice(0, 5) || '00:00';
  const h1 = fin?.slice(0, 5) || '23:59';
  if (h0 === '00:00' && h1 === '23:59') return 'Todo el día';
  return `${h0} - ${h1}`;
}

export function formatChannels(canales?: string[]): string {
  if (!canales || canales.length === 0) return '';
  if (canales.length >= ALL_CANALES.length && ALL_CANALES.every((c) => canales.includes(c))) {
    return 'Todos los canales';
  }
  return canales.map((c) => CANAL_LABELS[c] || c).join(', ');
}

export function buildItemLabel(item: {
  item_nombre?: string;
  precio_base?: number;
  precio_promo: number;
  preconfigExtras?: { nombre?: string; cantidad: number }[];
}) {
  const parts = [item.item_nombre || ''];
  if (item.preconfigExtras && item.preconfigExtras.length > 0) {
    for (const ex of item.preconfigExtras) {
      const name = ex.nombre || 'extra';
      parts.push(ex.cantidad > 1 ? `${ex.cantidad}x ${name}` : name);
    }
  }
  return parts.join(' + ');
}

export function getDraftSignature(form: PromocionFormData, promoItems: PromoItemDraft[]) {
  const normalized = {
    form: {
      ...form,
      dias_semana: [...form.dias_semana].sort((a, b) => a - b),
      producto_ids: [...form.producto_ids].sort(),
      categoria_ids: [...form.categoria_ids].sort(),
      branch_ids: [...form.branch_ids].sort(),
      canales: [...form.canales].sort(),
    },
    promoItems: [...promoItems]
      .map((item) => ({
        item_carta_id: item.item_carta_id,
        precio_promo: item.precio_promo,
        preconfigExtras: (item.preconfigExtras || [])
          .map((extra) => ({
            extra_item_carta_id: extra.extra_item_carta_id,
            cantidad: extra.cantidad,
          }))
          .sort((a, b) => a.extra_item_carta_id.localeCompare(b.extra_item_carta_id)),
      }))
      .sort((a, b) => a.item_carta_id.localeCompare(b.item_carta_id)),
  };
  return JSON.stringify(normalized);
}

export function buildFormFromPromo(promo: {
  nombre: string; descripcion: string | null; tipo: string; valor: number;
  restriccion_pago: string; dias_semana: number[]; hora_inicio: string; hora_fin: string;
  fecha_inicio: string | null; fecha_fin: string | null; aplica_a: string;
  producto_ids: string[]; categoria_ids: string[]; tipo_usuario: string;
  activa: boolean; branch_ids: string[]; canales: string[] | null;
}): PromocionFormData {
  return {
    nombre: promo.nombre,
    descripcion: promo.descripcion,
    tipo: promo.tipo,
    valor: promo.valor,
    restriccion_pago: promo.restriccion_pago,
    dias_semana: promo.dias_semana,
    hora_inicio: promo.hora_inicio,
    hora_fin: promo.hora_fin,
    fecha_inicio: promo.fecha_inicio,
    fecha_fin: promo.fecha_fin,
    aplica_a: promo.aplica_a,
    producto_ids: promo.producto_ids,
    categoria_ids: promo.categoria_ids,
    tipo_usuario: promo.tipo_usuario,
    activa: promo.activa,
    branch_ids: promo.branch_ids,
    canales: promo.canales || ALL_CANALES,
  };
}
