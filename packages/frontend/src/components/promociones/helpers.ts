import type {
  PromocionFormData,
  PromotionChannelConfig,
  PromotionFundedBy,
  PromotionDisplayFormat,
} from '@/hooks/usePromociones';
import type { PromoItemDraft } from './types';
import { ALL_CANALES, CANAL_LABELS, emptyChannelConfig } from './constants';

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

function normalizeChannelConfig(c: PromotionChannelConfig) {
  return {
    channel_code: c.channel_code,
    is_active_in_channel: c.is_active_in_channel,
    custom_final_price: c.custom_final_price,
    custom_discount_value: c.custom_discount_value,
    funded_by: c.funded_by,
    display_format: c.display_format,
    banner_image_url: c.banner_image_url,
    promo_text: c.promo_text,
  };
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
      channel_configs: [...(form.channel_configs || [])]
        .map(normalizeChannelConfig)
        .sort((a, b) => a.channel_code.localeCompare(b.channel_code)),
    },
    promoItems: [...promoItems]
      .map((item) => ({
        item_carta_id: item.item_carta_id,
        precio_promo: item.precio_promo,
        preconfigExtras: (item.preconfigExtras || [])
          .map((extra) => ({
            extra_item_carta_id: extra.extra_item_carta_id,
            cantidad: extra.quantity,
          }))
          .sort((a, b) => a.extra_item_carta_id.localeCompare(b.extra_item_carta_id)),
      }))
      .sort((a, b) => a.item_carta_id.localeCompare(b.item_carta_id)),
  };
  return JSON.stringify(normalized);
}

/**
 * Sincroniza `canales` (array legacy) con `channel_configs`:
 * - Agrega configs faltantes para cada canal en `canales`.
 * - Marca inactivos (is_active_in_channel=false) los configs de canales que
 *   NO están en `canales`.
 *
 * Esto permite editar la lista de canales con checkboxes (UX vieja) sin
 * perder los overrides por canal ya configurados.
 */
export function syncChannelConfigsWithCanales(
  canales: string[],
  existing: PromotionChannelConfig[] | undefined,
): PromotionChannelConfig[] {
  const byCode = new Map((existing || []).map((c) => [c.channel_code, c] as const));
  const result: PromotionChannelConfig[] = [];

  for (const code of canales) {
    const found = byCode.get(code);
    result.push(found ? { ...found, is_active_in_channel: true } : emptyChannelConfig(code, true));
  }

  for (const cfg of existing || []) {
    if (!canales.includes(cfg.channel_code)) {
      result.push({ ...cfg, is_active_in_channel: false });
    }
  }

  return result;
}

export function buildFormFromPromo(promo: {
  name: string;
  description?: string | null;
  descripcion?: string | null;
  tipo: string;
  valor: number;
  restriccion_pago: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fin: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  aplica_a: string;
  producto_ids: string[];
  categoria_ids: string[];
  tipo_usuario: string;
  /** Backend usa `is_active`; algunos callers legacy usan `activa`. */
  is_active?: boolean;
  activa?: boolean;
  branch_ids: string[];
  canales: string[] | null;
  channel_configs?: PromotionChannelConfig[];
  funded_by?: PromotionFundedBy | null;
  display_format?: PromotionDisplayFormat | null;
  show_in_webapp_section?: boolean;
}): PromocionFormData {
  const canales = promo.canales || ALL_CANALES;
  return {
    name: promo.name,
    descripcion: promo.descripcion ?? promo.description ?? null,
    tipo: promo.tipo as PromocionFormData['tipo'],
    valor: promo.valor,
    restriccion_pago: promo.restriccion_pago as PromocionFormData['restriccion_pago'],
    dias_semana: promo.dias_semana,
    hora_inicio: promo.hora_inicio,
    hora_fin: promo.hora_fin,
    fecha_inicio: promo.fecha_inicio,
    fecha_fin: promo.fecha_fin,
    aplica_a: promo.aplica_a as PromocionFormData['aplica_a'],
    producto_ids: promo.producto_ids,
    categoria_ids: promo.categoria_ids,
    tipo_usuario: promo.tipo_usuario as PromocionFormData['tipo_usuario'],
    is_active: promo.is_active ?? promo.activa ?? true,
    branch_ids: promo.branch_ids,
    canales,
    channel_configs: syncChannelConfigsWithCanales(canales, promo.channel_configs),
    funded_by: promo.funded_by ?? 'restaurant',
    display_format: promo.display_format ?? 'final_price',
    show_in_webapp_section: promo.show_in_webapp_section ?? true,
  };
}
