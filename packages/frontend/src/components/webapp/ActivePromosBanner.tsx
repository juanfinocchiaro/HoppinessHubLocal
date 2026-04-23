import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { useActivePromos, useActivePromoItems } from '@/hooks/usePromociones';
import type { Promocion } from '@/hooks/usePromociones';

interface Props {
  branchId: string | undefined;
}

const CHANNEL_CODE = 'webapp';

type ActivePromo = Promocion;

interface PromoCardData {
  promo: ActivePromo;
  image: string | null;
  priceLabel: string | null;
  originalPrice: number | null;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-AR')}`;
}

function getWebappConfigForPromo(promo: ActivePromo) {
  return promo.channel_configs.find((c) => c.channel_code === CHANNEL_CODE);
}

function getPromoDiscountLabel(promo: ActivePromo): string | null {
  if (promo.tipo === 'descuento_porcentaje' && promo.valor > 0) return `${promo.valor}% OFF`;
  if (promo.tipo === 'descuento_fijo' && promo.valor > 0) return `-${formatCurrency(promo.valor)}`;
  if (promo.tipo === '2x1') return '2x1';
  if (promo.tipo === 'combo') return 'Combo';
  if (promo.tipo === 'precio_especial') return 'Precio especial';
  return null;
}

/**
 * Fase 4: sección hero "PROMOS DE HOY" en la WebApp. Reemplaza la tira de
 * texto por un carrusel horizontal de cards con imagen + tag + precio.
 *
 * - Respeta `show_in_webapp_section` (si está false, la promo no aparece acá).
 * - Usa `channel_configs[webapp].banner_image_url` si está definido, sino
 *   cae a la imagen del primer ítem de la promo, sino fallback visual.
 * - Respeta `channel_configs[webapp].promo_text` como descripción preferente.
 */
export function ActivePromosBanner({ branchId }: Props) {
  const { data: promos = [] } = useActivePromos(branchId, CHANNEL_CODE);
  const { data: promoItems = [] } = useActivePromoItems(branchId, CHANNEL_CODE);

  const featured = useMemo<ActivePromo[]>(
    () => promos.filter((p) => p.show_in_webapp_section !== false),
    [promos],
  );

  const cards = useMemo<PromoCardData[]>(() => {
    if (featured.length === 0) return [];
    const itemsByPromoId = new Map<string, typeof promoItems>();
    for (const pi of promoItems) {
      const list = itemsByPromoId.get(pi.promocion_id) ?? [];
      list.push(pi);
      itemsByPromoId.set(pi.promocion_id, list);
    }

    return featured.map<PromoCardData>((p) => {
      const webappCfg = getWebappConfigForPromo(p);
      const relatedItems = itemsByPromoId.get(p.id) ?? [];
      const fallbackImage = relatedItems.find((ri) => ri.item_imagen)?.item_imagen ?? null;
      const image = webappCfg?.banner_image_url ?? fallbackImage;

      // Precio: si hay ítems con precio_promo y precio_base, mostramos el mejor deal.
      let priceLabel: string | null = null;
      let originalPrice: number | null = null;
      const bestItem = relatedItems
        .filter((ri) => ri.precio_base != null && ri.precio_promo < Number(ri.precio_base))
        .sort((a, b) => {
          const deltaA = Number(a.precio_base) - a.precio_promo;
          const deltaB = Number(b.precio_base) - b.precio_promo;
          return deltaB - deltaA;
        })[0];

      if (webappCfg?.custom_final_price != null) {
        priceLabel = formatCurrency(webappCfg.custom_final_price);
      } else if (bestItem) {
        priceLabel = formatCurrency(bestItem.precio_promo);
        originalPrice = Number(bestItem.precio_base);
      }

      return { promo: p, image, priceLabel, originalPrice };
    });
  }, [featured, promoItems]);

  if (cards.length === 0) return null;

  return (
    <section
      className="bg-gradient-to-b from-accent/10 to-transparent border-b border-accent/20"
      aria-label="Promociones activas"
    >
      <div className="max-w-5xl mx-auto px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-accent font-bold text-sm mb-2">
          <Tag className="w-4 h-4" />
          <span>PROMOS DE HOY</span>
          <span className="text-[10px] text-muted-foreground font-normal">
            {cards.length} {cards.length === 1 ? 'promo activa' : 'promos activas'}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1 snap-x snap-mandatory">
          {cards.map(({ promo, image, priceLabel, originalPrice }) => {
            const webappCfg = getWebappConfigForPromo(promo);
            const discountLabel = getPromoDiscountLabel(promo);
            const description = webappCfg?.promo_text || promo.descripcion;
            return (
              <article
                key={promo.id}
                className="snap-start shrink-0 w-[240px] rounded-xl overflow-hidden bg-card border shadow-sm flex flex-col"
              >
                <div className="relative h-[110px] bg-gradient-to-br from-accent/30 via-accent/10 to-transparent flex items-center justify-center">
                  {image ? (
                    <img
                      src={image}
                      alt={promo.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Tag className="w-8 h-8 text-accent/60" />
                  )}
                  {discountLabel && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-success text-white text-[10px] font-bold shadow-sm">
                      {discountLabel}
                    </span>
                  )}
                </div>
                <div className="p-2.5 flex flex-col gap-0.5 flex-1">
                  <h3 className="text-xs font-bold line-clamp-2 leading-tight">{promo.name}</h3>
                  {description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {description}
                    </p>
                  )}
                  {priceLabel && (
                    <div className="flex items-baseline gap-1.5 mt-1">
                      {originalPrice != null && (
                        <span className="text-[10px] text-muted-foreground line-through">
                          {formatCurrency(originalPrice)}
                        </span>
                      )}
                      <span className="text-sm font-bold text-green-600">{priceLabel}</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
