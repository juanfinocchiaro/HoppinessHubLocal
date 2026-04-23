/**
 * Fase 1: adaptador `SellableItem[]` -> `WebappMenuItem[]`.
 *
 * La WebApp está construida alrededor del shape legacy `WebappMenuItem`
 * (con campos en español: `precio_promo`, `categoria_nombre`, etc.). Mientras
 * esa transición dure, este adapter traduce el nuevo contrato canónico para
 * que las pages existentes no necesiten rewriting invasivo.
 *
 * El objetivo final es que `WebappMenuItem` sea sólo un alias de `SellableItem`,
 * pero la migración se hace incremental página por página.
 */

import type { SellableItem } from '@hoppiness/shared';
import type { WebappMenuItem } from '@/types/webapp';

/**
 * Convierte un array de `SellableItem` al array que la WebApp espera.
 * Para cada item con promo activa, emite DOS entradas: primero el artículo
 * promo sintético (como hacía `buildSellableArticles`), después el base.
 * Los items con `is_visible = false` se filtran (no se muestran en webapp).
 */
export function sellableItemsToWebapp(items: SellableItem[]): WebappMenuItem[] {
  const visible = items.filter((it) => it.is_visible && it.kind !== 'extra');
  const out: WebappMenuItem[] = [];

  for (const item of visible) {
    const base: WebappMenuItem = {
      id: item.id,
      name: item.name,
      short_name: item.short_name,
      description: item.description,
      image_url: item.image_url,
      base_price: item.base_price,
      precio_promo: null,
      promo_etiqueta: null,
      categoria_carta_id: item.category_id,
      categoria_nombre: item.category_name,
      categoria_orden: item.category_order,
      orden: null,
      disponible_delivery: true,
      disponible_webapp: true,
      tipo: item.kind,
    };

    if (item.promo) {
      const promoArticle: WebappMenuItem = {
        ...base,
        id: `promo:${item.promo.promotion_item_id}`,
        source_item_id: item.id,
        is_promo_article: true,
        promocion_id: item.promo.promotion_id,
        promocion_item_id: item.promo.promotion_item_id,
        promo_included_modifiers: item.promo.included_modifiers,
        name: item.promo.promotion_name || `${item.name} (PROMO)`,
        short_name: item.short_name || item.name,
        description: item.promo.included_label || item.description,
        base_price: item.promo.original_price,
        precio_promo: item.promo.promo_price,
        promo_etiqueta: 'PROMO',
      };
      out.push(promoArticle);
    }

    out.push(base);
  }

  return out;
}
