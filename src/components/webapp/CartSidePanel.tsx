import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckoutInlineView } from './CheckoutInlineView';
import { TrackingInlineView } from './TrackingInlineView';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderStatuses } from '@/services/webappOrderService';
import type { useWebappCart } from '@/hooks/useWebappCart';
import type { WebappMenuItem } from '@/types/webapp';
import { formatPrice } from '@/lib/formatters';

import { ORDER_TERMINAL_STATES } from '@/lib/constants';
const TERMINAL_STATES = ORDER_TERMINAL_STATES;

/** Simple fade+slide transition wrapper */
function StepTransition({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  const [visible, setVisible] = useState(false);
  const prevKey = useRef(stepKey);

  useEffect(() => {
    if (stepKey !== prevKey.current) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 20);
      prevKey.current = stepKey;
      return () => clearTimeout(t);
    } else {
      setVisible(true);
    }
  }, [stepKey]);

  return (
    <div
      className="flex flex-col flex-1 min-h-0 transition-all duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
    >
      {children}
    </div>
  );
}

interface Props {
  cart: ReturnType<typeof useWebappCart>;
  costoEnvio: number;
  branchId: string;
  branchName: string;
  mpEnabled: boolean;
  suggestedItems?: WebappMenuItem[];
  onAddSuggested?: (item: WebappMenuItem) => void;
  externalTrackingCode?: string | null;
  trackingTrigger?: number;
}

export function CartSidePanel({
  cart,
  costoEnvio,
  branchId,
  branchName,
  mpEnabled,
  suggestedItems,
  onAddSuggested,
  externalTrackingCode,
  trackingTrigger,
}: Props) {
  // Multi-order tab system
  const [activeOrders, setActiveOrders] = useState<string[]>(() => {
    const saved = localStorage.getItem('hoppiness_last_tracking');
    return saved ? [saved] : [];
  });
  const [selectedTab, setSelectedTab] = useState<'cart' | 'checkout' | string>('cart');

  // Poll active orders to remove terminal ones
  const { data: orderStatuses } = useQuery({
    queryKey: ['side-panel-order-statuses', activeOrders],
    queryFn: () => fetchOrderStatuses(activeOrders),
    enabled: activeOrders.length > 0,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // Remove terminal orders from tabs
  useEffect(() => {
    if (!orderStatuses || orderStatuses.length === 0) return;
    const terminalCodes = orderStatuses
      .filter((o) => TERMINAL_STATES.includes(o.estado))
      .map((o) => o.webapp_tracking_code)
      .filter(Boolean) as string[];

    if (terminalCodes.length > 0) {
      setActiveOrders((prev) => {
        const next = prev.filter((c) => !terminalCodes.includes(c));
        return next;
      });
      // If selected tab was a terminal order, go to cart
      if (
        typeof selectedTab === 'string' &&
        selectedTab !== 'cart' &&
        selectedTab !== 'checkout' &&
        terminalCodes.includes(selectedTab)
      ) {
        setSelectedTab('cart');
      }
    }
  }, [orderStatuses]);

  // If cart becomes empty while on checkout, go back to cart
  useEffect(() => {
    if (cart.items.length === 0 && selectedTab === 'checkout') setSelectedTab('cart');
  }, [cart.items.length, selectedTab]);

  // Handle external tracking code (from ActiveOrderBanner or MisPedidos)
  useEffect(() => {
    if (externalTrackingCode) {
      // Add to active orders if not already there
      setActiveOrders((prev) =>
        prev.includes(externalTrackingCode) ? prev : [...prev, externalTrackingCode],
      );
      setSelectedTab(externalTrackingCode);
    }
  }, [externalTrackingCode, trackingTrigger]);

  const totalConEnvio = cart.totalPrecio + costoEnvio;

  const UPSELL_CATEGORIES = ['ACOMPAÑAMIENTOS', 'BEBIDAS'];

  const allSuggestions = (suggestedItems || []).filter(
    (item) =>
      !cart.items.some((ci) => ci.itemId === item.id) &&
      item.tipo !== 'extra' &&
      item.categoria_nombre &&
      UPSELL_CATEGORIES.includes(item.categoria_nombre.toUpperCase()),
  );

  const acompSuggestions = allSuggestions
    .filter((i) => i.categoria_nombre?.toUpperCase() === 'ACOMPAÑAMIENTOS')
    .slice(0, 2);
  const bebidaSuggestions = allSuggestions
    .filter((i) => i.categoria_nombre?.toUpperCase() === 'BEBIDAS')
    .slice(0, 2);
  const hasSuggestions = acompSuggestions.length > 0 || bebidaSuggestions.length > 0;

  const handleNewOrder = () => {
    // Don't destroy tracking — just switch to cart tab
    setSelectedTab('cart');
  };

  const handleOrderConfirmed = (code: string) => {
    setActiveOrders((prev) => (prev.includes(code) ? prev : [...prev, code]));
    localStorage.setItem('hoppiness_last_tracking', code);
    setSelectedTab(code);
  };

  // Build tab label from order statuses
  const getOrderTabLabel = (code: string) => {
    const status = orderStatuses?.find((o) => o.webapp_tracking_code === code);
    if (!status) return code.slice(0, 6);
    return `#${status.numero_pedido}`;
  };

  const hasTabs = activeOrders.length > 0;
  const isTrackingTab = selectedTab !== 'cart' && selectedTab !== 'checkout';
  const effectiveStep = isTrackingTab ? 'tracking' : selectedTab;

  return (
    <aside className="hidden lg:flex w-[350px] shrink-0 border-l bg-background flex-col sticky top-0 h-screen z-20">
      {/* Tabs bar — only show if there are active orders */}
      {hasTabs && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedTab('cart')}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              selectedTab === 'cart' || selectedTab === 'checkout'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            Carrito{cart.totalItems > 0 ? ` (${cart.totalItems})` : ''}
          </button>
          {activeOrders.map((code) => (
            <button
              key={code}
              onClick={() => setSelectedTab(code)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                selectedTab === code
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Package className="w-3 h-3" />
              {getOrderTabLabel(code)}
            </button>
          ))}
        </div>
      )}

      <StepTransition stepKey={effectiveStep}>
        {effectiveStep === 'cart' && (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm text-foreground">Tu pedido</h2>
              <span className="ml-auto text-xs text-muted-foreground">{cart.totalItems} items</span>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Tu carrito está vacío</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Agregá productos del menú</p>
                </div>
              )}

              {cart.items.map((item) => {
                const extrasTotal = item.extras.reduce((s, e) => s + e.precio, 0);
                const lineTotal = (item.precioUnitario + extrasTotal) * item.cantidad;

                return (
                  <div key={item.cartId} className="flex items-start gap-3">
                    {item.imagen_url ? (
                      <img
                        src={item.imagen_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
                        🍔
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate text-foreground">
                        {item.nombre}
                      </p>
                      {item.extras.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.extras.map((e) => `+ ${e.nombre}`).join(', ')}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-[11px] text-destructive truncate">
                          {item.removidos.map((r) => `Sin ${r}`).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (item.cantidad <= 1) cart.removeItem(item.cartId);
                              else cart.updateQuantity(item.cartId, item.cantidad - 1);
                            }}
                            className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                          >
                            {item.cantidad === 1 ? (
                              <Trash2 className="w-3 h-3 text-destructive" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.cartId, item.cantidad + 1)}
                            className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-bold text-xs">{formatPrice(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Upsell suggestions — ONLY when cart has items (Bug 7E fix) */}
              {cart.items.length > 0 && hasSuggestions && onAddSuggested && (
                <div className="pt-3 border-t space-y-3">
                  <p className="text-xs font-bold text-foreground">¿Querés agregar algo más?</p>
                  {[
                    { label: 'Acompañamientos', items: acompSuggestions },
                    { label: 'Bebidas', items: bebidaSuggestions },
                  ]
                    .filter((g) => g.items.length > 0)
                    .map((group) => (
                      <div key={group.label}>
                        <p className="text-[11px] text-muted-foreground font-medium mb-1.5">
                          {group.label}
                        </p>
                        <div className="space-y-1.5">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => onAddSuggested(item)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg border hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
                            >
                              {item.imagen_url ? (
                                <img
                                  src={item.imagen_url}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm">
                                  🍟
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{item.nombre}</p>
                                <p className="text-xs text-accent font-bold">
                                  {formatPrice(item.precio_base)}
                                </p>
                              </div>
                              <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                                <Plus className="w-3 h-3" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.items.length > 0 && (
              <div className="border-t px-4 py-4 space-y-2 bg-background">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatPrice(cart.totalPrecio)}</span>
                </div>
                {costoEnvio > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-semibold">{formatPrice(costoEnvio)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>Total</span>
                  <span>{formatPrice(totalConEnvio)}</span>
                </div>
                <Button
                  size="lg"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm mt-2"
                  onClick={() => setSelectedTab('checkout')}
                >
                  Continuar al pago
                </Button>
              </div>
            )}
          </>
        )}

        {effectiveStep === 'checkout' && (
          <CheckoutInlineView
            cart={cart}
            branchId={branchId}
            branchName={branchName}
            mpEnabled={mpEnabled}
            costoEnvio={costoEnvio}
            onBack={() => setSelectedTab('cart')}
            onConfirmed={handleOrderConfirmed}
          />
        )}

        {effectiveStep === 'tracking' && isTrackingTab && (
          <TrackingInlineView trackingCode={selectedTab} onNewOrder={handleNewOrder} />
        )}
      </StepTransition>
    </aside>
  );
}
