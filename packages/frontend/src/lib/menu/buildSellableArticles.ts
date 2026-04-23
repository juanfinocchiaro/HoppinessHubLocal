/**
 * Fuente única de verdad para "qué artículos ve un canal".
 *
 * Responsabilidad: dado un conjunto de items base (carta) + promo items activos,
 * devolver los artículos-promo enriquecidos (precio sin promo, extras incluidos,
 * etiqueta visible) siguiendo las reglas del documento de diseño.
 *
 * Esta función es PURA: no hace fetch, no depende de React. Los callers (POS y
 * WebApp) la invocan con los datos ya cargados por sus hooks y mapean el
 * `PromoArticleDescriptor` a su propio shape.
 *
 * La misma lógica vivía duplicada en:
 *   - packages/frontend/src/pages/webapp/PedirPage.tsx (useMemo)
 *   - packages/frontend/src/components/pos/ProductGrid.tsx (useMemo)
 */

import type { PromocionItem } from '@/hooks/usePromociones';

/** Item base mínimo necesario para decidir si una promo aplica. */
export interface SellableBaseItem {
  id: string;
  base_price: number | string | null | undefined;
}

/** Modificador incluido en la promo (extra preconfigurado). */
export interface PromoIncludedModifier {
  name: string;
  quantity: number;
}

/**
 * Descriptor neutral de un artículo-promo. Cada caller mapea esto a su
 * propio shape (WebappMenuItem, PromoArticle de POS, etc.).
 */
export interface PromoArticleDescriptor<TBase extends SellableBaseItem = SellableBaseItem> {
  /** ID compuesto del artículo-promo (`promo:{promocionItemId}`). */
  id: string;
  /** Item base original al que aplica la promo. */
  base: TBase;
  /** Promo item original tal como lo devolvió el hook de promos. */
  promoItem: PromocionItem;
  /**
   * Precio "sin promo" — precio base + suma de extras preconfigurados.
   * Es el precio tachado que se muestra al lado del `precio_promo`.
   */
  precioSinPromo: number;
  /** Precio final con la promo aplicada (= promoItem.precio_promo). */
  precioPromo: number;
  /** Extras preconfigurados con nombre y cantidad. */
  includedModifiers: PromoIncludedModifier[];
  /** Etiqueta "Incluye: X, Y" lista para render (null si no hay extras). */
  includedLabel: string | null;
}

export interface BuildPromoDescriptorsInput<TBase extends SellableBaseItem> {
  baseItems: TBase[];
  promoItems: PromocionItem[];
  /**
   * Filtro opcional de visibilidad por canal (Fase 3).
   * Devolvé `false` para excluir el ítem del menú del canal (ej. canal-
   * exclusivos, o items marcados `is_visible = false` en
   * `price_list_items`). Si no se provee, todos los ítems son visibles.
   */
  isVisibleInChannel?: (itemId: string) => boolean;
  /**
   * Filtro opcional de presencia por location (Sprint 2).
   * Devolvé `false` para excluir el ítem de esta location según el modelo
   * `present_at_all_locations` + `product_location_presence`.
   * Si no se provee, todos los ítems se consideran presentes.
   */
  isVisibleAtLocation?: (itemId: string) => boolean;
}

/**
 * Convierte items de promo activos en descriptors listos para renderizar.
 *
 * Reglas (preservan comportamiento actual):
 *  - Se descarta una promo si el item base no existe en `baseItems`.
 *  - Se descarta si `precio_promo >= base_price + extras` (no hay descuento real).
 *  - `includedLabel` se construye como "Incluye: NxExtra, Extra" cuando hay extras
 *    con nombre; los extras sin nombre se ignoran para la etiqueta pero suman al
 *    `precioSinPromo`.
 */
export function buildPromoArticleDescriptors<TBase extends SellableBaseItem>(
  input: BuildPromoDescriptorsInput<TBase>,
): PromoArticleDescriptor<TBase>[] {
  const { baseItems, promoItems, isVisibleInChannel, isVisibleAtLocation } = input;
  if (!baseItems.length || !promoItems.length) return [];

  const baseById = new Map(baseItems.map((item) => [item.id, item]));
  const descriptors: PromoArticleDescriptor<TBase>[] = [];

  for (const promoItem of promoItems) {
    const base = baseById.get(promoItem.item_carta_id);
    if (!base) continue;
    if (isVisibleInChannel && !isVisibleInChannel(base.id)) continue;
    if (isVisibleAtLocation && !isVisibleAtLocation(base.id)) continue;

    const basePrice = toNumber(base.base_price);
    if (basePrice == null) continue;

    const extras = promoItem.preconfigExtras ?? [];
    const extrasTotal = extras.reduce((sum, ex) => sum + (ex.precio ?? 0) * ex.cantidad, 0);
    const precioSinPromo = basePrice + extrasTotal;
    const precioPromo = Number(promoItem.precio_promo);

    if (!(precioPromo < precioSinPromo)) continue;

    const includedModifiers = extras
      .filter((ex) => !!ex.nombre)
      .map<PromoIncludedModifier>((ex) => ({ name: ex.nombre as string, quantity: ex.cantidad }));

    const includedLabel = includedModifiers.length
      ? `Incluye: ${includedModifiers
          .map((m) => (m.quantity > 1 ? `${m.quantity}x ${m.name}` : m.name))
          .join(', ')}`
      : null;

    descriptors.push({
      id: `promo:${promoItem.id}`,
      base,
      promoItem,
      precioSinPromo,
      precioPromo,
      includedModifiers,
      includedLabel,
    });
  }

  return descriptors;
}

/**
 * Helper genérico: arma el menú vendible final (promos adelante, ítems base
 * después). El mapper convierte cada descriptor en el shape que el caller
 * espera (TBase), permitiendo que WebApp y POS reutilicen la misma función.
 *
 * Diseño: el mapper recibe el descriptor completo. El caller decide qué
 * campos copiar del `base`, cómo etiquetar el nombre, qué flags poner, etc.
 */
export function buildSellableArticles<TBase extends SellableBaseItem>(
  input: BuildPromoDescriptorsInput<TBase> & {
    mapPromoToArticle: (descriptor: PromoArticleDescriptor<TBase>) => TBase;
  },
): { promoArticles: TBase[]; baseArticles: TBase[]; all: TBase[] } {
  const { isVisibleInChannel, isVisibleAtLocation } = input;
  // Only filter when callbacks are provided to preserve reference equality in tests
  const visibleBaseItems = (isVisibleInChannel || isVisibleAtLocation)
    ? input.baseItems.filter((item) => {
        if (isVisibleInChannel && !isVisibleInChannel(item.id)) return false;
        if (isVisibleAtLocation && !isVisibleAtLocation(item.id)) return false;
        return true;
      })
    : input.baseItems;
  const descriptors = buildPromoArticleDescriptors({
    baseItems: input.baseItems,
    promoItems: input.promoItems,
    isVisibleInChannel,
  });
  const promoArticles = descriptors.map(input.mapPromoToArticle);
  return {
    promoArticles,
    baseArticles: visibleBaseItems,
    all: [...promoArticles, ...visibleBaseItems],
  };
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
