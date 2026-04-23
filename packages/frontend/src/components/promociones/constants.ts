import type { PromocionFormData, PromotionChannelConfig } from '@/hooks/usePromociones';

export const TIPO_LABELS: Record<string, string> = {
  descuento_porcentaje: '% Descuento',
  descuento_fijo: '$ Descuento',
  '2x1': '2x1',
  combo: 'Combo',
  precio_especial: 'Precio especial',
};

export const PAGO_LABELS: Record<string, string> = {
  cualquiera: 'Cualquiera',
  solo_efectivo: 'Solo efectivo',
  solo_digital: 'Solo digital',
};

export const CANAL_LABELS: Record<string, string> = {
  dine_in: 'Salón',
  webapp: 'WebApp',
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mp_delivery: 'MP Delivery',
};

export const FUNDED_BY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  channel: 'Canal',
  split: 'Compartido',
};

export const DISPLAY_FORMAT_LABELS: Record<string, string> = {
  final_price: 'Precio final',
  percentage: 'Porcentaje',
  both: 'Ambos',
  banner_only: 'Solo banner',
};

export const ALL_CANALES = ['dine_in', 'webapp', 'rappi', 'pedidos_ya', 'mp_delivery'];
export const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_ACTIVE_CHANNELS = ['webapp', 'dine_in', 'rappi', 'pedidos_ya'];

export function emptyChannelConfig(channel_code: string, is_active = true): PromotionChannelConfig {
  return {
    channel_code,
    is_active_in_channel: is_active,
    custom_final_price: null,
    custom_discount_value: null,
    funded_by: null,
    display_format: null,
    banner_image_url: null,
    promo_text: null,
  };
}

export const EMPTY_FORM: PromocionFormData = {
  name: '',
  descripcion: '',
  tipo: 'descuento_porcentaje',
  valor: 0,
  restriccion_pago: 'cualquiera',
  dias_semana: [0, 1, 2, 3, 4, 5, 6],
  hora_inicio: '00:00',
  hora_fin: '23:59',
  fecha_inicio: null,
  fecha_fin: null,
  aplica_a: 'producto',
  producto_ids: [],
  categoria_ids: [],
  tipo_usuario: 'todos',
  is_active: true,
  branch_ids: [],
  canales: DEFAULT_ACTIVE_CHANNELS,
  channel_configs: DEFAULT_ACTIVE_CHANNELS.map((c) => emptyChannelConfig(c, true)),
  funded_by: 'restaurant',
  display_format: 'final_price',
  show_in_webapp_section: true,
};
