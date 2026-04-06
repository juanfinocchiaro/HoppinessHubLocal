import type { PromocionFormData } from '@/hooks/usePromociones';

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
};

export const ALL_CANALES = ['dine_in', 'webapp', 'rappi', 'pedidos_ya'];
export const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
  canales: ['webapp', 'dine_in', 'rappi', 'pedidos_ya'],
};
