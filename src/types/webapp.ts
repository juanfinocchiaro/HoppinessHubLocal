/**
 * Tipos para la WebApp pública de pedidos
 */

export interface AddressResult {
  formatted_address: string;
  lat: number;
  lng: number;
  neighborhood_name?: string;
}

export type TipoServicioWebapp = 'retiro' | 'delivery';

export interface WebappConfig {
  id: string;
  branch_id: string;
  webapp_activa: boolean;
  estado: 'abierto' | 'pausado' | 'cerrado';
  delivery_habilitado: boolean;
  delivery_radio_km: number;
  delivery_costo: number | null;
  delivery_pedido_minimo: number | null;
  retiro_habilitado: boolean;
  comer_aca_habilitado: boolean;
  recepcion_modo: 'auto' | 'manual';
  auto_accept_orders?: boolean;
  tiempo_estimado_retiro_min: number;
  tiempo_estimado_delivery_min: number;
  estimated_pickup_time_min?: number;
  estimated_delivery_time_min?: number;
  prep_time_retiro?: number | null;
  prep_time_delivery?: number | null;
  prep_time_comer_aca?: number | null;
  horarios: any[];
  mensaje_pausa: string | null;
}

export interface WebappMenuItem {
  id: string;
  source_item_id?: string;
  is_promo_article?: boolean;
  promocion_id?: string | null;
  promocion_item_id?: string | null;
  promo_included_modifiers?: Array<{ name: string; quantity: number }>;
  name: string;
  short_name: string | null;
  description: string | null;
  image_url: string | null;
  base_price: number;
  precio_promo: number | null;
  promo_etiqueta: string | null;
  categoria_carta_id: string | null;
  categoria_nombre: string | null;
  categoria_orden: number | null;
  orden: number | null;
  disponible_delivery: boolean;
  disponible_webapp: boolean;
  tipo: string;
}

export interface CartItemModifier {
  id: string;
  name: string;
  precio: number;
  tipo: 'extra' | 'sin';
  quantity?: number;
}

export interface CartItem {
  cartId: string; // unique per cart entry
  itemId: string;
  sourceItemId?: string;
  isPromoArticle?: boolean;
  promocionId?: string | null;
  promocionItemId?: string | null;
  includedModifiers?: Array<{ name: string; quantity: number }>;
  name: string;
  image_url: string | null;
  precioUnitario: number;
  quantity: number;
  extras: CartItemModifier[];
  removidos: string[];
  notes: string;
}

export interface CartItemGroupSelection {
  grupoId: string;
  grupoNombre: string;
  opcionId: string;
  opcionNombre: string;
  precio: number;
}

export interface WebappCart {
  tipoServicio: TipoServicioWebapp;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  clienteEmail: string;
  customerAddress: string;
  clientePiso: string;
  clienteReferencia: string;
}

export interface DeliveryCalcResult {
  available: boolean;
  cost: number | null;
  distance_km: number | null;
  duration_min: number | null;
  estimated_delivery_min: number | null;
  disclaimer: string | null;
  reason?: string;
  suggested_branch?: { id: string; name: string; slug: string } | null;
}
