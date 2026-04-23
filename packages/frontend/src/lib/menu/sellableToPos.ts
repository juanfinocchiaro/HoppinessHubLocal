/**
 * Fase 1 follow-up: adaptador `SellableItem[]` -> shape que el POS espera.
 *
 * POS usa `MenuItemWithCategory` + `PromoArticle` con metadatos `_isPromoArticle`,
 * `_promoData`, etc. Este adapter proyecta el contrato canónico al shape
 * legacy sin forzar rewriting del ProductGrid.
 *
 * Beneficios:
 *  - is_visible por canal se aplica (items hidden no aparecen en POS).
 *  - custom_name / custom_image_url respetados.
 *  - Combos aparecen y se pueden cargar al carrito.
 *  - Promos resueltas server-side (coherente con WebApp).
 */

import type { SellableItem, SellableActivePromo } from '@hoppiness/shared';
import type { PromocionItem, PromocionItemExtra } from '@/hooks/usePromociones';

/** Shape mínimo que usa el POS. Ver [ProductGrid.tsx]. */
export interface PosGridItem {
  id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  image_url: string | null;
  base_price: number;
  reference_price: number | null;
  categoria_carta_id: string | null;
  tipo: string;
  fc_actual: number | null;
  fc_objetivo: number | null;
  total_cost: number | null;
  menu_categories: { id: string; nombre: string; orden: number | null } | null;
  rdo_categories: { code: string; name: string } | null;
}

export interface PosPromoArticle extends PosGridItem {
  _isPromoArticle: true;
  _sourceItemId: string;
  _promoData: PromocionItem;
  _precioSinPromo: number;
  _includedLabel: string | null;
}

function promoToPromocionItem(
  sourceItemId: string,
  promo: SellableActivePromo,
): PromocionItem {
  const preconfigExtras: PromocionItemExtra[] = promo.preconfig_extras.map((ex) => ({
    extra_item_carta_id: ex.extra_item_carta_id,
    cantidad: ex.quantity,
    nombre: ex.name ?? undefined,
    precio: ex.unit_price,
  }));
  return {
    id: promo.promotion_item_id,
    promocion_id: promo.promotion_id,
    item_carta_id: sourceItemId,
    precio_promo: promo.promo_price,
    created_at: '',
    preconfigExtras,
    restriccion_pago: promo.restriccion_pago,
    promocion_nombre: promo.promotion_name,
  };
}

function toPosGridItem(item: SellableItem): PosGridItem {
  return {
    id: item.id,
    name: item.name,
    short_name: item.short_name,
    description: item.description,
    image_url: item.image_url,
    base_price: item.base_price,
    reference_price: item.reference_price,
    categoria_carta_id: item.category_id,
    tipo: item.kind,
    fc_actual: item.fc_actual,
    fc_objetivo: item.fc_objetivo,
    total_cost: item.total_cost,
    menu_categories: item.category_id && item.category_name
      ? { id: item.category_id, nombre: item.category_name, orden: item.category_order }
      : null,
    rdo_categories: null,
  };
}

export function sellableItemsToPos(items: SellableItem[]): {
  baseItems: PosGridItem[];
  promoArticles: PosPromoArticle[];
  all: Array<PosGridItem | PosPromoArticle>;
} {
  const visible = items.filter((it) => it.is_visible && it.kind !== 'extra');
  const baseItems: PosGridItem[] = [];
  const promoArticles: PosPromoArticle[] = [];

  for (const item of visible) {
    const base = toPosGridItem(item);
    baseItems.push(base);

    if (item.promo) {
      const promoData = promoToPromocionItem(item.id, item.promo);
      promoArticles.push({
        ...base,
        id: `promo:${item.promo.promotion_item_id}`,
        name: item.promo.promotion_name || `${base.short_name || base.name} (PROMO)`,
        short_name: item.promo.promotion_name || `${base.short_name || base.name} (PROMO)`,
        base_price: item.promo.original_price,
        _isPromoArticle: true,
        _sourceItemId: item.id,
        _promoData: promoData,
        _precioSinPromo: item.promo.original_price,
        _includedLabel: item.promo.included_label,
      });
    }
  }

  return {
    baseItems,
    promoArticles,
    all: [...baseItems, ...promoArticles],
  };
}
