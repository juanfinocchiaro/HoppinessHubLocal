import { describe, it, expect } from 'vitest';
import {
  buildPromoArticleDescriptors,
  buildSellableArticles,
  type PromoArticleDescriptor,
  type SellableBaseItem,
} from './buildSellableArticles';
import type { PromocionItem, PromocionItemExtra } from '@/hooks/usePromociones';

interface TestBaseItem extends SellableBaseItem {
  name: string;
  short_name?: string | null;
}

function makeBase(overrides: Partial<TestBaseItem> & { id: string }): TestBaseItem {
  return {
    id: overrides.id,
    name: overrides.name ?? `Base ${overrides.id}`,
    short_name: overrides.short_name ?? null,
    base_price: 'base_price' in overrides ? overrides.base_price : 1000,
  };
}

function makeExtra(overrides: Partial<PromocionItemExtra> = {}): PromocionItemExtra {
  return {
    extra_item_carta_id: overrides.extra_item_carta_id ?? 'extra-x',
    cantidad: overrides.cantidad ?? 1,
    nombre: overrides.nombre,
    precio: overrides.precio,
  };
}

function makePromoItem(overrides: Partial<PromocionItem> & { id: string; item_carta_id: string }): PromocionItem {
  return {
    id: overrides.id,
    promocion_id: overrides.promocion_id ?? 'promo-1',
    item_carta_id: overrides.item_carta_id,
    precio_promo: overrides.precio_promo ?? 500,
    created_at: overrides.created_at ?? '2026-04-01T00:00:00Z',
    preconfigExtras: overrides.preconfigExtras,
    restriccion_pago: overrides.restriccion_pago,
    promocion_nombre: overrides.promocion_nombre,
    item_nombre: overrides.item_nombre,
    item_imagen: overrides.item_imagen,
    precio_base: overrides.precio_base,
  };
}

describe('buildPromoArticleDescriptors', () => {
  it('returns empty when there are no base items', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [],
      promoItems: [makePromoItem({ id: 'pi-1', item_carta_id: 'a' })],
    });
    expect(result).toEqual([]);
  });

  it('returns empty when there are no promo items', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a' })],
      promoItems: [],
    });
    expect(result).toEqual([]);
  });

  it('skips promos whose base item does not exist', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a' })],
      promoItems: [makePromoItem({ id: 'pi-1', item_carta_id: 'missing', precio_promo: 500 })],
    });
    expect(result).toEqual([]);
  });

  it('skips promos when precio_promo is not strictly less than precioSinPromo', () => {
    // Case 1: precio_promo == base_price → not a discount, skip.
    const equal = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a', base_price: 1000 })],
      promoItems: [makePromoItem({ id: 'pi-1', item_carta_id: 'a', precio_promo: 1000 })],
    });
    expect(equal).toEqual([]);

    // Case 2: precio_promo > base_price → skip.
    const higher = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a', base_price: 1000 })],
      promoItems: [makePromoItem({ id: 'pi-1', item_carta_id: 'a', precio_promo: 1200 })],
    });
    expect(higher).toEqual([]);
  });

  it('accepts promos when base_price comes as a string (number coercion)', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a', base_price: '1000' as unknown as number })],
      promoItems: [makePromoItem({ id: 'pi-1', item_carta_id: 'a', precio_promo: 800 })],
    });
    expect(result).toHaveLength(1);
    expect(result[0].precioSinPromo).toBe(1000);
    expect(result[0].precioPromo).toBe(800);
  });

  it('adds extras to precioSinPromo and emits includedLabel', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a', base_price: 1000 })],
      promoItems: [
        makePromoItem({
          id: 'pi-1',
          item_carta_id: 'a',
          precio_promo: 900,
          preconfigExtras: [
            makeExtra({ nombre: 'Cheddar', precio: 200, cantidad: 1 }),
            makeExtra({ nombre: 'Papas', precio: 300, cantidad: 2 }),
          ],
        }),
      ],
    });

    expect(result).toHaveLength(1);
    const d = result[0];
    expect(d.id).toBe('promo:pi-1');
    expect(d.precioSinPromo).toBe(1000 + 200 * 1 + 300 * 2);
    expect(d.precioPromo).toBe(900);
    expect(d.includedModifiers).toEqual([
      { name: 'Cheddar', quantity: 1 },
      { name: 'Papas', quantity: 2 },
    ]);
    expect(d.includedLabel).toBe('Incluye: Cheddar, 2x Papas');
  });

  it('ignores extras without name when building the label but still sums their price', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a', base_price: 1000 })],
      promoItems: [
        makePromoItem({
          id: 'pi-1',
          item_carta_id: 'a',
          precio_promo: 900,
          preconfigExtras: [
            makeExtra({ nombre: undefined, precio: 100, cantidad: 1 }),
            makeExtra({ nombre: 'Cheddar', precio: 200, cantidad: 1 }),
          ],
        }),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].precioSinPromo).toBe(1000 + 100 + 200);
    expect(result[0].includedLabel).toBe('Incluye: Cheddar');
  });

  it('returns null includedLabel when there are no named extras', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [makeBase({ id: 'a', base_price: 1000 })],
      promoItems: [
        makePromoItem({ id: 'pi-1', item_carta_id: 'a', precio_promo: 500 }),
      ],
    });
    expect(result[0].includedLabel).toBeNull();
  });

  it('handles multiple promos across multiple base items and preserves input order', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [
        makeBase({ id: 'a', base_price: 1000 }),
        makeBase({ id: 'b', base_price: 2000 }),
      ],
      promoItems: [
        makePromoItem({ id: 'pi-b', item_carta_id: 'b', precio_promo: 1500 }),
        makePromoItem({ id: 'pi-a', item_carta_id: 'a', precio_promo: 800 }),
      ],
    });
    expect(result.map((d) => d.id)).toEqual(['promo:pi-b', 'promo:pi-a']);
  });

  it('skips items with null/invalid base_price', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [
        makeBase({ id: 'a', base_price: null }),
        makeBase({ id: 'b', base_price: 'not-a-number' as unknown as number }),
      ],
      promoItems: [
        makePromoItem({ id: 'pi-a', item_carta_id: 'a', precio_promo: 500 }),
        makePromoItem({ id: 'pi-b', item_carta_id: 'b', precio_promo: 500 }),
      ],
    });
    expect(result).toEqual([]);
  });

  it('respects isVisibleInChannel filter when provided', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [
        makeBase({ id: 'a', base_price: 1000 }),
        makeBase({ id: 'b', base_price: 1500 }),
      ],
      promoItems: [
        makePromoItem({ id: 'pi-a', item_carta_id: 'a', precio_promo: 800 }),
        makePromoItem({ id: 'pi-b', item_carta_id: 'b', precio_promo: 1200 }),
      ],
      isVisibleInChannel: (id) => id === 'b',
    });
    expect(result.map((d) => d.base.id)).toEqual(['b']);
  });
});

describe('buildSellableArticles', () => {
  it('calls mapper once per descriptor and places promos before base items', () => {
    const baseItems = [makeBase({ id: 'a', base_price: 1000 }), makeBase({ id: 'b', base_price: 2000 })];
    const promoItems = [makePromoItem({ id: 'pi-1', item_carta_id: 'a', precio_promo: 700 })];

    const mapperCalls: PromoArticleDescriptor<TestBaseItem>[] = [];
    const { promoArticles, baseArticles, all } = buildSellableArticles<TestBaseItem>({
      baseItems,
      promoItems,
      mapPromoToArticle: (d) => {
        mapperCalls.push(d);
        return { ...d.base, id: d.id, name: `${d.base.name} (PROMO)` };
      },
    });

    expect(mapperCalls).toHaveLength(1);
    expect(promoArticles).toHaveLength(1);
    expect(promoArticles[0].id).toBe('promo:pi-1');
    expect(promoArticles[0].name).toBe('Base a (PROMO)');
    expect(baseArticles).toBe(baseItems);
    expect(all[0].id).toBe('promo:pi-1');
    expect(all.slice(1)).toEqual(baseItems);
  });

  it('returns empty promoArticles when no promo item qualifies', () => {
    const result = buildSellableArticles<TestBaseItem>({
      baseItems: [makeBase({ id: 'a', base_price: 1000 })],
      promoItems: [makePromoItem({ id: 'pi-1', item_carta_id: 'a', precio_promo: 1000 })],
      mapPromoToArticle: (d) => d.base,
    });
    expect(result.promoArticles).toEqual([]);
    expect(result.all).toEqual(result.baseArticles);
  });

  it('filters invisible items out of baseArticles when isVisibleInChannel is provided', () => {
    const baseItems = [
      makeBase({ id: 'a', base_price: 1000 }),
      makeBase({ id: 'b', base_price: 2000 }),
      makeBase({ id: 'c', base_price: 3000 }),
    ];
    const result = buildSellableArticles<TestBaseItem>({
      baseItems,
      promoItems: [makePromoItem({ id: 'pi-a', item_carta_id: 'a', precio_promo: 700 })],
      isVisibleInChannel: (id) => id !== 'b',
      mapPromoToArticle: (d) => ({ ...d.base, id: d.id }),
    });
    expect(result.baseArticles.map((i) => i.id)).toEqual(['a', 'c']);
    expect(result.promoArticles).toHaveLength(1);
    expect(result.all.map((i) => i.id)).toEqual(['promo:pi-a', 'a', 'c']);
  });

  it('does not filter anything when isVisibleInChannel is not provided', () => {
    const baseItems = [makeBase({ id: 'a' }), makeBase({ id: 'b' })];
    const result = buildSellableArticles<TestBaseItem>({
      baseItems,
      promoItems: [],
      mapPromoToArticle: (d) => d.base,
    });
    expect(result.baseArticles).toBe(baseItems);
  });

  // ── Sprint 2: location-presence filter ────────────────────────────────────

  it('respects isVisibleAtLocation filter when provided', () => {
    const baseItems = [
      makeBase({ id: 'a', base_price: 1000 }),
      makeBase({ id: 'b', base_price: 2000 }),
      makeBase({ id: 'c', base_price: 3000 }),
    ];
    const result = buildSellableArticles<TestBaseItem>({
      baseItems,
      promoItems: [makePromoItem({ id: 'pi-b', item_carta_id: 'b', precio_promo: 1500 })],
      // Location where only 'a' and 'b' are present
      isVisibleAtLocation: (id) => id !== 'c',
      mapPromoToArticle: (d) => ({ ...d.base, id: d.id }),
    });
    expect(result.baseArticles.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.promoArticles).toHaveLength(1);
  });

  it('isVisibleAtLocation and isVisibleInChannel compose with AND logic', () => {
    const baseItems = [
      makeBase({ id: 'a', base_price: 1000 }),
      makeBase({ id: 'b', base_price: 2000 }),
      makeBase({ id: 'c', base_price: 3000 }),
    ];
    const result = buildSellableArticles<TestBaseItem>({
      baseItems,
      promoItems: [],
      // Channel visible: a, b; Location present: b, c → intersection: b only
      isVisibleInChannel: (id) => id !== 'c',
      isVisibleAtLocation: (id) => id !== 'a',
      mapPromoToArticle: (d) => d.base,
    });
    expect(result.baseArticles.map((i) => i.id)).toEqual(['b']);
  });

  it('promo items excluded when location filter removes base item', () => {
    const result = buildPromoArticleDescriptors({
      baseItems: [
        makeBase({ id: 'a', base_price: 1000 }),
        makeBase({ id: 'b', base_price: 1500 }),
      ],
      promoItems: [
        makePromoItem({ id: 'pi-a', item_carta_id: 'a', precio_promo: 800 }),
        makePromoItem({ id: 'pi-b', item_carta_id: 'b', precio_promo: 1200 }),
      ],
      // Only 'b' is present at this location
      isVisibleAtLocation: (id) => id === 'b',
    });
    expect(result.map((d) => d.base.id)).toEqual(['b']);
  });
});

// ── Sprint 6: single-location flow (no "brand" required) ─────────────────────

describe('single-location flow (no brand entity)', () => {
  it('builds sellable articles correctly when there is only 1 location and no brand', () => {
    const singleLocation = 'loc-a';
    const allItems = [
      makeBase({ id: 'burger', base_price: 1800 }),
      makeBase({ id: 'fries', base_price: 600 }),
      makeBase({ id: 'gin', base_price: 3500 }), // exclusive to other location
    ];
    const presentAtLocation = new Set(['burger', 'fries']);

    const result = buildSellableArticles<TestBaseItem>({
      baseItems: allItems,
      promoItems: [makePromoItem({ id: 'pi-burger', item_carta_id: 'burger', precio_promo: 1500 })],
      isVisibleAtLocation: (id) => presentAtLocation.has(id),
      mapPromoToArticle: (d) => ({ ...d.base, id: d.id, name: `${d.base.name} PROMO` }),
    });

    // 'gin' should be filtered out (not present at this location)
    expect(result.baseArticles.map((i) => i.id)).not.toContain('gin');
    expect(result.baseArticles.map((i) => i.id)).toContain('burger');
    expect(result.baseArticles.map((i) => i.id)).toContain('fries');
    // Promo for burger should still work
    expect(result.promoArticles).toHaveLength(1);
    // Unused location variable to document test intent
    expect(singleLocation).toBe('loc-a');
  });

  it('shows all items when present_at_all_locations=true and no exceptions', () => {
    const allItems = [
      makeBase({ id: 'burger', base_price: 1800 }),
      makeBase({ id: 'fries', base_price: 600 }),
    ];

    // present_at_all_locations=true → no filter needed → all items visible
    const result = buildSellableArticles<TestBaseItem>({
      baseItems: allItems,
      promoItems: [],
      // No isVisibleAtLocation → all items visible
      mapPromoToArticle: (d) => d.base,
    });

    expect(result.baseArticles).toBe(allItems);
    expect(result.all).toHaveLength(2);
  });
});
