/**
 * SellableItem — contrato único del menú vendible (Fase 1).
 *
 * Este es el shape que devuelve `GET /api/menu/sellable?channel=&branch=&at=`.
 * POS y WebApp consumen SIEMPRE este contrato, nunca leen `menu_items` crudo
 * ni combinan ad-hoc `price_list_items` + `promotions` + `menu_item_components`.
 *
 * Si aparece un campo nuevo que afecta venta, la regla es: que el builder
 * del backend lo proyecte acá. Así se termina el problema de "dead fields"
 * que aparecía cuando cada feature decidía por su cuenta qué exponer.
 */

/** Tipos de ítem de la carta. Alineado con la columna `menu_items.type`. */
export type SellableItemKind = 'simple' | 'combo' | 'extra' | 'modifier' | 'removable' | 'substitution';

/** Canal de venta canónico. Matching `sales_channels.code`. */
export type SellableChannelCode = 'mostrador' | 'webapp' | 'rappi' | 'pedidos_ya' | 'mp_delivery' | string;

/** Componente de un combo (producto que forma parte de otro). */
export interface SellableComboComponent {
  component_id: string;
  quantity: number;
  name: string;
  /** Costo unitario del componente, ya tomado en cuenta en `total_cost` del combo. */
  unit_cost: number | null;
}

/** Modificador preconfigurado "incluido" en una promo. */
export interface SellablePromoIncludedModifier {
  name: string;
  quantity: number;
}

/**
 * Extra preconfigurado completo (para que el carrito pueda emitir el
 * `order_item` con referencia al extra real). Se usa principalmente en POS.
 */
export interface SellablePromoPreconfigExtra {
  extra_item_carta_id: string;
  quantity: number;
  name: string | null;
  unit_price: number;
}

/**
 * Promo activa resuelta para este item y este canal. Ya considera:
 *  - `promotion_channel_config` (activa en el canal, con overrides).
 *  - Días / horas / fechas: si la promo no aplica ahora, esto es null.
 *  - `show_in_webapp_section` es un hint de presentación, no afecta aplicabilidad.
 */
export interface SellableActivePromo {
  /** ID del `promotion_items` (la "fila" de la promo para este item). */
  promotion_item_id: string;
  /** ID de la `promotions`. */
  promotion_id: string;
  promotion_name: string;
  type: string;
  value: number;
  /** Precio final con la promo aplicada. */
  promo_price: number;
  /** Precio "sin promo" = base_price + suma de extras preconfigurados. Para mostrar tachado. */
  original_price: number;
  included_modifiers: SellablePromoIncludedModifier[];
  included_label: string | null;
  /** Extras preconfigurados con `extra_item_carta_id` (para order_item en POS). */
  preconfig_extras: SellablePromoPreconfigExtra[];
  banner_image_url: string | null;
  display_format: 'percentage' | 'final_price' | 'both' | 'banner_only' | null;
  funded_by: 'restaurant' | 'channel' | 'split' | null;
  promo_text: string | null;
  restriccion_pago: 'cualquiera' | 'solo_efectivo' | 'solo_digital';
  /** True si la promo tiene flag para aparecer en la sección "PROMOS DE HOY". */
  show_in_webapp_section: boolean;
}

/** Item vendible resuelto para un canal específico en un momento específico. */
export interface SellableItem {
  id: string;
  menu_item_id: string;
  kind: SellableItemKind;
  /** `custom_name` del canal si existe; sino `menu_items.name`. */
  name: string;
  short_name: string | null;
  description: string | null;
  /** `custom_image_url` del canal si existe; sino `menu_items.image_url`. */
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_order: number | null;
  /** Precio efectivo en este canal (ya aplica reglas de pricing). */
  base_price: number;
  reference_price: number | null;
  total_cost: number | null;
  fc_actual: number | null;
  fc_objetivo: number | null;
  /** Visibilidad resuelta: `is_active` + `is_visible` per canal (Fase 3). */
  is_visible: boolean;
  /** Si el ítem es un combo, la composición. Vacío si no. */
  components: SellableComboComponent[];
  /** Si hay una promo activa para este ítem en este canal + momento, acá. */
  promo: SellableActivePromo | null;
}

/** Respuesta del endpoint `GET /api/menu/sellable`. */
export interface SellableMenuResponse {
  channel_code: SellableChannelCode;
  branch_id: string | null;
  /** ISO timestamp usado para resolver promos activas. */
  at: string;
  items: SellableItem[];
}
