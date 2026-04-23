import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, LayoutGrid, List, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProductCard } from './ProductCard';
import { SpinnerLoader } from '@/components/ui/loaders';
import { ActiveOrderBanner } from './ActiveOrderBanner';
import { ActivePromosBanner } from './ActivePromosBanner';
import { EmailConfirmBanner } from '@/components/auth/EmailConfirmBanner';
import { WebappHeader } from './WebappHeader';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useDebounce } from '@/hooks/useDebounce';
import { useDynamicPrepTime } from '@/hooks/useDeliveryConfig';
import type { WebappMenuItem, TipoServicioWebapp } from '@/types/webapp';
import type { useWebappCart } from '@/hooks/useWebappCart';

interface Props {
  branch: { name: string; id?: string };
  config: any;
  items: WebappMenuItem[];
  loading: boolean;
  tipoServicio: TipoServicioWebapp;
  cart: ReturnType<typeof useWebappCart>;
  onProductClick: (item: WebappMenuItem) => void;
  onBack: () => void;
  onServiceChange?: (tipo: TipoServicioWebapp) => void;
  onShowTracking?: (trackingCode: string) => void;
  onOpenCart?: () => void;
  hasCartItems?: boolean;
}

export function WebappMenuView({
  branch,
  config,
  items,
  loading,
  tipoServicio,
  cart,
  onProductClick,
  onBack,
  onServiceChange,
  onShowTracking,
  onOpenCart,
  hasCartItems,
}: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollDir = useScrollDirection(15);

  const [headerH, setHeaderH] = useState(120);
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => setHeaderH(header.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  const promoItems = useMemo(() => {
    return items.filter(
      (i) => i.promo_etiqueta || (i.precio_promo != null && i.precio_promo < i.base_price),
    );
  }, [items]);

  const categories = useMemo(() => {
    const nonPromoItems = debouncedSearch.trim() ? items : items.filter((i) => !i.is_promo_article);
    const filtered = debouncedSearch.trim()
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            i.description?.toLowerCase().includes(debouncedSearch.toLowerCase()),
        )
      : nonPromoItems;

    const grouped: Record<string, { name: string; orden: number; items: WebappMenuItem[] }> = {};
    filtered.forEach((item) => {
      const cat = item.categoria_nombre || 'Otros';
      const orden = item.categoria_orden ?? 999;
      if (!grouped[cat]) grouped[cat] = { name: cat, orden, items: [] };
      grouped[cat].items.push(item);
    });

    return Object.values(grouped).sort((a, b) => a.orden - b.orden);
  }, [items, debouncedSearch]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.getAttribute('data-category'));
          }
        }
      },
      { rootMargin: `-${headerH}px 0px -60% 0px`, threshold: 0 },
    );

    Object.values(categoryRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories, headerH]);

  const scrollToCategory = (catName: string) => {
    setActiveCategory(catName);
    categoryRefs.current[catName]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Dynamic ETA
  const { data: retiroEta } = useDynamicPrepTime(branch.id, 'retiro');
  const { data: deliveryEta } = useDynamicPrepTime(branch.id, 'delivery');

  const currentEta = tipoServicio === 'delivery' ? deliveryEta : retiroEta;

  const servicioOptions = [
    config.retiro_habilitado && {
      key: 'retiro' as TipoServicioWebapp,
      label: 'Retiro',
      icon: '🛒',
      tiempo: retiroEta?.prep_time_min ?? config.tiempo_estimado_retiro_min,
    },
    config.delivery_habilitado && {
      key: 'delivery' as TipoServicioWebapp,
      label: 'Delivery',
      icon: '🛵',
      tiempo: deliveryEta?.prep_time_min ?? config.tiempo_estimado_delivery_min,
    },
  ].filter(Boolean) as {
    key: TipoServicioWebapp;
    label: string;
    icon: string;
    tiempo: number | null;
  }[];

  const servicioLabel = tipoServicio === 'retiro' ? '🛒 Retiro en local' : '🛵 Delivery';

  const tiempoEstimado =
    currentEta?.prep_time_min ??
    (tipoServicio === 'delivery'
      ? config.tiempo_estimado_delivery_min
      : config.tiempo_estimado_retiro_min);
  const highDemand = (currentEta?.active_orders ?? 0) >= 5;

  const headerSubtitle = [
    servicioLabel,
    tiempoEstimado ? `~${tiempoEstimado} min` : null,
    highDemand ? '(alta demanda)' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const renderProductCard = (item: WebappMenuItem, layout: 'grid' | 'list' | 'desktop') => {
    const price =
      item.precio_promo != null && item.precio_promo < item.base_price
        ? item.precio_promo
        : item.base_price;
    return (
      <ProductCard
        key={item.id}
        item={item}
        qty={cart.getItemQty(item.id)}
        layout={layout}
        onTap={() => onProductClick(item)}
        onQuickAdd={() =>
          cart.quickAdd(item.id, item.name, price, item.image_url, {
            sourceItemId: item.source_item_id ?? item.id,
            isPromoArticle: item.is_promo_article,
            promocionId: item.promocion_id,
            promocionItemId: item.promocion_item_id,
            includedModifiers: item.promo_included_modifiers,
          })
        }
        onIncrement={() =>
          cart.quickAdd(item.id, item.name, price, item.image_url, {
            sourceItemId: item.source_item_id ?? item.id,
            isPromoArticle: item.is_promo_article,
            promocionId: item.promocion_id,
            promocionItemId: item.promocion_item_id,
            includedModifiers: item.promo_included_modifiers,
          })
        }
        onDecrement={() => {
          const entry = cart.items.find((i) => i.itemId === item.id);
          if (entry) cart.updateQuantity(entry.cartId, entry.quantity - 1);
        }}
      />
    );
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-screen">
      <WebappHeader
        title={branch.name}
        subtitle={headerSubtitle}
        showBack
        onBack={onBack}
        showSearch
        onSearchToggle={() => setSearchExpanded((v) => !v)}
        showCart={!!onOpenCart}
        cartCount={cart.totalItems}
        onCartClick={onOpenCart}
        extraActions={
          <button
            onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors lg:hidden text-muted-foreground"
            title={viewMode === 'grid' ? 'Vista lista' : 'Vista grilla'}
          >
            {viewMode === 'grid' ? (
              <List className="w-4 h-4" />
            ) : (
              <LayoutGrid className="w-4 h-4" />
            )}
          </button>
        }
      >
        {/* Collapsible sub-header on mobile: hides on scroll-down, re-shows on scroll-up */}
        <div
          className={`overflow-hidden transition-all duration-300 lg:max-h-none ${
            scrollDir === 'down' ? 'max-h-0 lg:max-h-none' : 'max-h-60'
          }`}
        >
          {/* Service toggle pills — only if multiple services available */}
          {servicioOptions.length > 1 && onServiceChange && (
            <div className="flex gap-1 px-4 pb-2">
              {servicioOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => onServiceChange(opt.key)}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                    tipoServicio === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt.icon} {opt.label}
                  {opt.tiempo && <span className="opacity-70"> ~{opt.tiempo}′</span>}
                </button>
              ))}
            </div>
          )}

          {/* Search bar — collapsible on mobile, always visible on desktop */}
          <div className={`px-4 pb-3 ${searchExpanded ? '' : 'hidden lg:block'}`}>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en el menú..."
                className="pl-9 pr-8 bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
                autoFocus={searchExpanded}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Email confirm + Active order + Promos banners */}
          <EmailConfirmBanner />
          {onShowTracking && <ActiveOrderBanner onShowTracking={onShowTracking} />}
          <ActivePromosBanner branchId={branch.id} />

          {/* Category tabs - mobile only */}
          {!debouncedSearch && categories.length > 1 && (
            <div
              ref={tabsRef}
              className="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none xl:hidden"
            >
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => scrollToCategory(cat.name)}
                  className={`
                    whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0
                    ${
                      activeCategory === cat.name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </WebappHeader>

      {/* Main content: sidebar (desktop) + products — extra bottom padding when cart bar is visible */}
      <main className={`flex-1 ${hasCartItems ? 'pb-24' : 'pb-24 lg:pb-8'}`}>
        <div className="max-w-6xl mx-auto flex">
          {/* Desktop sidebar categories */}
          {!debouncedSearch && categories.length > 1 && (
            <aside
              className="hidden xl:block w-[200px] shrink-0 sticky self-start overflow-y-auto border-r"
              style={{ top: headerH, maxHeight: `calc(100vh - ${headerH + 20}px)` }}
            >
              <nav className="py-4 pr-2">
                {promoItems.length > 0 && (
                  <button
                    onClick={() => scrollToCategory('__promos')}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors mb-0.5 flex items-center gap-1.5
                      ${
                        activeCategory === '__promos'
                          ? 'bg-accent/10 text-accent font-bold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Promociones
                  </button>
                )}
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => scrollToCategory(cat.name)}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors mb-0.5
                      ${
                        activeCategory === cat.name
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Promo banner bar */}
            {!loading && !debouncedSearch && promoItems.length > 0 && (
              <div className="bg-accent/10 border-b border-accent/20">
                <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none">
                  {promoItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onProductClick(item)}
                      className="shrink-0 flex items-center gap-2 bg-card rounded-full border border-accent/30 px-3 py-1.5 hover:border-accent transition-colors"
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      )}
                      <span className="text-xs font-bold text-foreground whitespace-nowrap">
                        {item.short_name || item.name}
                      </span>
                      {item.promo_etiqueta && (
                        <span className="bg-accent text-accent-foreground text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                          {item.promo_etiqueta}
                        </span>
                      )}
                      {item.precio_promo != null && item.precio_promo < item.base_price && (
                        <span className="text-xs font-bold text-accent">
                          ${item.precio_promo.toLocaleString('es-AR')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <SpinnerLoader size="md" />
              </div>
            ) : categories.length === 0 && !promoItems.length ? (
              <div className="text-center py-20 text-muted-foreground">
                {debouncedSearch
                  ? 'No encontramos productos con ese name. Probá con otra búsqueda.'
                  : 'El menú se está preparando. Volvé en un ratito.'}
              </div>
            ) : (
              <>
                {/* Popular / Featured section */}
                {!debouncedSearch && promoItems.length > 0 && (
                  <div
                    ref={(el) => {
                      categoryRefs.current['__promos'] = el;
                    }}
                    data-category="__promos"
                    style={{ scrollMarginTop: headerH }}
                  >
                    <div
                      className="sticky z-10 bg-background/95 backdrop-blur-sm px-4 py-2.5 border-b"
                      style={{ top: headerH }}
                    >
                      <h2 className="font-brand text-sm font-black text-accent uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 fill-accent" />
                        Promociones
                      </h2>
                    </div>
                    {/* Horizontal scroll on mobile, grid on desktop */}
                    <div className="lg:hidden">
                      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none">
                        {promoItems.map((item) => (
                          <div key={item.id} className="shrink-0 w-[160px]">
                            {renderProductCard(item, 'grid')}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="hidden lg:block px-4 py-3">
                      <div className="grid gap-3 grid-cols-2 xl:grid-cols-3">
                        {promoItems.map((item) => renderProductCard(item, 'desktop'))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Regular categories */}
                {categories.map((cat) => (
                  <div
                    key={cat.name}
                    ref={(el) => {
                      categoryRefs.current[cat.name] = el;
                    }}
                    data-category={cat.name}
                    style={{ scrollMarginTop: headerH }}
                  >
                    <div
                      className="sticky z-10 bg-background/95 backdrop-blur-sm px-4 py-2.5 border-b"
                      style={{ top: headerH }}
                    >
                      <h2 className="font-brand text-sm font-black text-primary uppercase tracking-wide">
                        {cat.name}
                        <span className="text-xs font-normal text-muted-foreground ml-2 lowercase tracking-normal">
                          {cat.items.length} {cat.items.length === 1 ? 'producto' : 'productos'}
                        </span>
                      </h2>
                    </div>

                    {/* Mobile: grid or list view */}
                    <div className="lg:hidden">
                      {viewMode === 'grid' ? (
                        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                          {cat.items.map((item) => renderProductCard(item, 'grid'))}
                        </div>
                      ) : (
                        <div className="px-4 py-2 space-y-2">
                          {cat.items.map((item) => renderProductCard(item, 'list'))}
                        </div>
                      )}
                    </div>

                    {/* Desktop: horizontal cards */}
                    <div className="hidden lg:block px-4 py-3">
                      <div className="grid gap-3 grid-cols-2 xl:grid-cols-3">
                        {cat.items.map((item) => renderProductCard(item, 'desktop'))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
