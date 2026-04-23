/**
 * ProductGrid - Grilla de productos con fotos, tabs de categoría, búsqueda y scroll spy.
 *
 * Fase 1 follow-up: consume el contrato canónico `useSellableMenu` via
 * `sellableItemsToPos()`. Ya no lee `menu_items` crudo ni combina promos
 * ad-hoc; el backend resuelve todo (visibility, custom_*, combos, promos
 * activas por canal).
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchItemExtraAssignments, fetchItemRemovibles } from '@/services/posService';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, X, Tag, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import type { PromocionItem, PromocionItemExtra } from '@/hooks/usePromociones';
import { useSellableMenu } from '@/hooks/useSellableMenu';
import { sellableItemsToPos, type PosGridItem, type PosPromoArticle } from '@/lib/menu/sellableToPos';
import { useDebounce } from '@/hooks/useDebounce';

type MenuItemWithCategory = PosGridItem;
type PromoArticle = PosPromoArticle;
type GridItem = MenuItemWithCategory | PromoArticle;

interface SelectableItem extends Record<string, any> {
  _promoPrice?: number;
  _originalPrecioBase?: number;
  _preconfigExtras?: PromocionItemExtra[];
  _promoId?: string;
  _promoRestriccionPago?: 'cualquiera' | 'solo_efectivo' | 'solo_digital';
  _promoNombre?: string;
}

export type { CartItem, CartItemExtra, CartItemRemovible, CartItemOpcional } from '@/types/pos';
import type { CartItem } from '@/types/pos';

interface ProductGridProps {
  onAddItem: (item: CartItem) => void;
  onSelectItem?: (item: SelectableItem) => void;
  cart?: CartItem[];
  branchId?: string;
  disabled?: boolean;
  promoChannel?: string;
}

type GridDensity = 'compact' | 'default' | 'large';

const GRID_DENSITY_KEY = 'pos-grid-density';
const DENSITY_ORDER: GridDensity[] = ['large', 'default', 'compact'];

const GRID_CLASSES: Record<GridDensity, string> = {
  compact: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  default: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ProductGrid({
  onAddItem,
  onSelectItem,
  cart = [],
  branchId,
  disabled,
  promoChannel,
}: ProductGridProps) {
  // Fase 1: canal para el menú resuelto. POS usa 'salon' → 'mostrador';
  // apps usan el slug directo; undefined cae a 'mostrador' (disabled state).
  const resolvedChannel = promoChannel === 'salon' ? 'mostrador' : (promoChannel ?? 'mostrador');
  const { data: sellable, isLoading } = useSellableMenu({
    channel: resolvedChannel,
    branch: branchId,
  });

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const isManualScroll = useRef(false);

  const [gridDensity, setGridDensity] = useState<GridDensity>(() => {
    try {
      const saved = localStorage.getItem(GRID_DENSITY_KEY);
      if (saved && DENSITY_ORDER.includes(saved as GridDensity)) return saved as GridDensity;
    } catch {
      /* noop */
    }
    return 'default';
  });

  const gridClass = GRID_CLASSES[gridDensity];

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setGridDensity((prev) => {
      const idx = DENSITY_ORDER.indexOf(prev);
      const next =
        direction === 'in' ? Math.min(idx + 1, DENSITY_ORDER.length - 1) : Math.max(idx - 1, 0);
      const val = DENSITY_ORDER[next];
      try {
        localStorage.setItem(GRID_DENSITY_KEY, val);
      } catch {
        /* noop */
      }
      return val;
    });
  }, []);

  // Cart quantity map for badges
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.item_carta_id, (map.get(item.item_carta_id) || 0) + item.quantity);
    }
    return map;
  }, [cart]);

  // Fase 1: el backend ya resolvió visibility + promos. Simplemente
  // adaptamos al shape que espera el POS.
  const { baseItems: allItems, promoArticles } = useMemo(() => {
    if (!sellable?.items) return { baseItems: [] as PosGridItem[], promoArticles: [] as PosPromoArticle[] };
    return sellableItemsToPos(sellable.items);
  }, [sellable]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const term = debouncedSearch.toLowerCase();
    const match = (item: GridItem) => {
      const nombre = (item.name ?? '').toLowerCase();
      const nombreCorto = (item.short_name ?? '').toLowerCase();
      return nombre.includes(term) || nombreCorto.includes(term);
    };
    return [...promoArticles.filter(match), ...allItems.filter(match)];
  }, [allItems, promoArticles, debouncedSearch]);

  const byCategory = useMemo(() => {
    const acc = allItems.reduce<Record<string, { items: GridItem[]; orden: number }>>((acc, item) => {
      const cat = item.menu_categories?.nombre ?? 'Sin categoría';
      const orden = item.menu_categories?.orden ?? 999;
      if (!acc[cat]) acc[cat] = { items: [], orden };
      acc[cat].items.push(item);
      return acc;
    }, {});
    if (promoArticles.length > 0) {
      acc['Promociones'] = { items: promoArticles, orden: -1 };
    }
    return acc;
  }, [allItems, promoArticles]);

  const cats = useMemo(() => {
    return Object.keys(byCategory).sort((a, b) => byCategory[a].orden - byCategory[b].orden);
  }, [byCategory]);

  // Scroll spy with IntersectionObserver
  useEffect(() => {
    // Find the scroll viewport (Radix ScrollArea renders a [data-radix-scroll-area-viewport])
    const root = scrollViewportRef.current;
    if (!root) return;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScroll.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = entry.target.getAttribute('data-category');
            if (cat) setActiveCategory(cat);
          }
        }
      },
      { root: viewport, threshold: 0.3 },
    );

    Object.entries(sectionRefs.current).forEach(([, el]) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [cats]);

  const handleCategoryClick = useCallback((cat: string) => {
    setActiveCategory(cat);
    isManualScroll.current = true;
    const el = sectionRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isManualScroll.current = false;
      }, 600);
    } else {
      isManualScroll.current = false;
    }
  }, []);

  // Prefetch extras/removibles on hover
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(new Set<string>());

  const handlePrefetch = useCallback(
    (itemId: string) => {
      if (prefetchedRef.current.has(itemId) || disabled) return;
      prefetchedRef.current.add(itemId);

      queryClient.prefetchQuery({
        queryKey: ['item-carta-extras', itemId],
        queryFn: () => fetchItemExtraAssignments(itemId),
        staleTime: 5 * 60 * 1000,
      });

      queryClient.prefetchQuery({
        queryKey: ['item-removibles', itemId],
        queryFn: () => fetchItemRemovibles(itemId),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient, disabled],
  );

  const handleProductClick = (item: GridItem) => {
    if (disabled) {
      toast('Iniciá la venta primero', {
        description: 'Configurá el canal y servicio antes de agregar productos',
      });
      return;
    }

    if ('_isPromoArticle' in item && item._isPromoArticle) {
      addPromoItemToCart(item as PromoArticle);
      return;
    }

    addItemToCart(item);
  };

  const addItemToCart = (item: MenuItemWithCategory) => {
    const precio = item.base_price ?? 0;
    const nombre = item.short_name ?? item.name;
    const precioRef = item.reference_price ? Number(item.reference_price) : undefined;

    if (onSelectItem) {
      onSelectItem(item);
    } else {
      onAddItem({
        item_carta_id: item.id,
        name: nombre,
        quantity: 1,
        unit_price: precio,
        subtotal: precio,
        reference_price: precioRef && precioRef > precio ? precioRef : undefined,
        categoria_carta_id: item.categoria_carta_id ?? null,
      });
    }
  };

  const addPromoItemToCart = (promoArticle: PromoArticle) => {
    const pi = promoArticle._promoData;
    const baseItem = allItems.find((i) => i.id === promoArticle._sourceItemId);
    if (!baseItem) return;
    const precioSinPromo = promoArticle._precioSinPromo ?? Number(baseItem.base_price ?? 0);

    if (onSelectItem) {
      onSelectItem({
        ...baseItem,
        base_price: pi.precio_promo,
        _promoPrice: pi.precio_promo,
        _originalPrecioBase: precioSinPromo,
        _preconfigExtras: pi.preconfigExtras,
        _promoId: pi.promocion_id,
        _promoRestriccionPago: pi.restriccion_pago,
        _promoNombre: pi.promocion_nombre,
      });
    } else {
      const nombre = pi.promocion_nombre || (baseItem.short_name ?? baseItem.name);
      const discount = precioSinPromo - pi.precio_promo;
      onAddItem({
        item_carta_id: baseItem.id,
        name: `${nombre} (PROMO)`,
        quantity: 1,
        unit_price: precioSinPromo,
        subtotal: precioSinPromo,
        categoria_carta_id: baseItem.categoria_carta_id ?? null,
        promo_id: pi.promocion_id,
        promo_restriccion_pago: pi.restriccion_pago ?? 'cualquiera',
        promo_descuento: discount > 0 ? discount : undefined,
        promo_nombre: pi.promocion_nombre || 'Promoción',
      });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length === 1) {
      handleProductClick(searchResults[0]);
      setSearchTerm('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className={cn('grid gap-3', GRID_CLASSES['default'])}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search input + zoom */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleZoom('out')}
          disabled={gridDensity === 'large'}
          className="h-9 w-9 flex items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Más grande"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom('in')}
          disabled={gridDensity === 'compact'}
          className="h-9 w-9 flex items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Más chico"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Category tabs */}
      {!searchTerm.trim() && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {cats.map((cat) => {
            const catItems = byCategory[cat]?.items ?? [];
            const hasCartItems = catItems.some((item) => cartQtyMap.has(item.id));
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  'relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                )}
              >
                {cat}
                {hasCartItems && (
                  <span
                    className={cn(
                      'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full',
                      activeCategory === cat ? 'bg-primary-foreground' : 'bg-primary',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Products grid */}
      <ScrollArea className="flex-1 min-h-0 pr-2" ref={scrollViewportRef}>
        <div className="space-y-6 pb-4">
          {searchTerm.trim() ? (
            <div>
              <h3 className="py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
              </h3>
              <div className={cn('grid gap-3', gridClass)}>
                {searchResults.map((item: GridItem) => {
                  const promo = '_isPromoArticle' in item ? (item as PromoArticle) : null;
                  return (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qty={promo ? 0 : cartQtyMap.get(item.id) || 0}
                      onClick={handleProductClick}
                      onHover={(id) => handlePrefetch(promo ? promo._sourceItemId : id)}
                      promoPrice={promo ? promo._promoData.precio_promo : undefined}
                      promoLabel={promo ? promo._promoData.promocion_nombre || 'PROMO' : undefined}
                      subtitle={promo ? promo._includedLabel : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            cats.map((cat) => {
              const catItems = byCategory[cat]?.items ?? [];
              return (
                <div
                  key={cat}
                  ref={(el) => {
                    sectionRefs.current[cat] = el;
                  }}
                  data-category={cat}
                >
                  <h3 className="sticky top-0 z-10 bg-slate-50 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {cat}
                  </h3>
                  <div className={cn('grid gap-3', gridClass)}>
                    {catItems.map((item: GridItem) => {
                      const promo = '_isPromoArticle' in item ? (item as PromoArticle) : null;
                      return (
                        <ProductCard
                          key={item.id}
                          item={item}
                          qty={promo ? 0 : cartQtyMap.get(item.id) || 0}
                          onClick={handleProductClick}
                          onHover={(id) => handlePrefetch(promo ? promo._sourceItemId : id)}
                          promoPrice={promo ? promo._promoData.precio_promo : undefined}
                          promoLabel={
                            promo ? promo._promoData.promocion_nombre || 'PROMO' : undefined
                          }
                          subtitle={promo ? promo._includedLabel : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ProductCard({
  item,
  qty,
  onClick,
  onHover,
  promoPrice,
  promoLabel,
  subtitle,
}: {
  item: GridItem;
  qty: number;
  onClick: (item: GridItem) => void;
  onHover?: (id: string) => void;
  promoPrice?: number;
  promoLabel?: string;
  subtitle?: string | null;
}) {
  const precio = item.base_price ?? 0;
  const precioRef = item.reference_price ? Number(item.reference_price) : null;
  const hasDiscount = precioRef != null && precioRef > precio;
  const discountPct = hasDiscount ? Math.round(((precioRef! - precio) / precioRef!) * 100) : 0;
  const hasPromo = promoPrice != null && promoPrice < precio;
  const nombre = item.short_name ?? item.name;
  const imagenUrl = item.image_url;
  const inCart = qty > 0;

  return (
    <button
      onClick={() => onClick(item)}
      onMouseEnter={() => onHover?.(item.id)}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card overflow-hidden text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.99]',
        inCart
          ? 'border-primary hover:border-primary'
          : hasPromo
            ? 'border-green-400/60 hover:border-green-500'
            : 'hover:border-primary/50',
      )}
    >
      {/* Quantity badge */}
      {inCart && (
        <span className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
          {qty}
        </span>
      )}
      {/* Promo badge */}
      {hasPromo && !inCart && (
        <span
          className="absolute top-1.5 left-1.5 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-success text-white text-[10px] font-bold shadow-sm"
          title={promoLabel || 'Promoción'}
        >
          <Tag className="w-2.5 h-2.5" /> {promoLabel ? 'PROMO ACTIVA' : 'PROMO'}
        </span>
      )}
      {/* Discount badge */}
      {hasDiscount && !inCart && !hasPromo && (
        <span className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm">
          -{discountPct}%
        </span>
      )}
      {/* Image or initials */}
      <div className="relative w-full aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt={nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl font-bold text-muted-foreground/40 select-none">
            {getInitials(nombre)}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5 flex flex-col gap-0.5">
        <span className="font-brand text-sm font-medium line-clamp-2 leading-tight">{nombre}</span>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground line-clamp-1">{subtitle}</span>
        )}
        {hasPromo ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground line-through">
              $ {precio.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-green-600 font-bold">
              $ {promoPrice!.toLocaleString('es-AR')}
            </span>
          </div>
        ) : hasDiscount ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground line-through">
              $ {precioRef!.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-destructive font-bold">
              $ {precio.toLocaleString('es-AR')}
            </span>
          </div>
        ) : (
          <span className="text-base text-primary font-bold">
            $ {precio.toLocaleString('es-AR')}
          </span>
        )}
      </div>
    </button>
  );
}
