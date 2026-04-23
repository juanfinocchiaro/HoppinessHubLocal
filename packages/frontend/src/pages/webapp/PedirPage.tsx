import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchGoogleMapsApiKey } from '@/services/checkoutService';
import { useWebappConfig } from '@/hooks/useWebappMenu';
import { useWebappCart } from '@/hooks/useWebappCart';
import { useMercadoPagoStatus } from '@/hooks/useMercadoPagoConfig';
import { useSellableMenu } from '@/hooks/useSellableMenu';
import { sellableItemsToWebapp } from '@/lib/menu/sellableToWebapp';
import { BranchLanding } from '@/components/webapp/BranchLanding';
import { WebappMenuView } from '@/components/webapp/WebappMenuView';
import { CartBar } from '@/components/webapp/CartBar';
import { CartSheet } from '@/components/webapp/CartSheet';
import { MisPedidosSheet } from '@/components/webapp/MisPedidosSheet';
import { ProductCustomizeSheet } from '@/components/webapp/ProductCustomizeSheet';
import { SEO } from '@/components/SEO';
import { SpinnerLoader } from '@/components/ui/loaders';
import type { TipoServicioWebapp, WebappMenuItem, DeliveryCalcResult } from '@/types/webapp';
import type { AddressResult } from '@/types/webapp';

export default function PedirPage() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useWebappConfig(branchSlug);
  const { data: mpStatus } = useMercadoPagoStatus(data?.branch?.id);
  // Fase 1: contrato canónico server-authoritative. Un solo hook que
  // reemplaza `useWebappMenuItems` + `useActivePromoItems` + `buildSellableArticles`.
  // Ya respeta is_visible por canal, custom_name, custom_image_url, combos
  // y promos activas resueltas en backend.
  const { data: sellable, isLoading: menuLoading } = useSellableMenu({
    channel: 'webapp',
    branch: data?.branch?.id ?? null,
  });
  const menuItems = useMemo<WebappMenuItem[]>(
    () => (sellable ? sellableItemsToWebapp(sellable.items) : []),
    [sellable],
  );
  const cart = useWebappCart();
  const navigate = useNavigate();
  const mpEnabled = mpStatus?.connection_status === 'conectado';
  const reorderChecked = useRef(false);

  const { data: googleApiKey } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchGoogleMapsApiKey,
    staleTime: Infinity,
  });

  // Lifted delivery address state (set by BranchLanding, consumed by CartSheet)
  const [prevalidatedAddress, setPrevalidatedAddress] = useState<AddressResult | null>(() => {
    try {
      const stored = localStorage.getItem('hop_delivery_address');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [prevalidatedCalc, setPrevalidatedCalc] = useState<DeliveryCalcResult | null>(null);

  const handleDeliveryValidated = (address: AddressResult, calc: DeliveryCalcResult) => {
    setPrevalidatedAddress(address);
    setPrevalidatedCalc(calc);
    try {
      localStorage.setItem('hop_delivery_address', JSON.stringify(address));
    } catch {
      /* ignore */
    }
  };

  // Check for reorder items when menu loads
  useEffect(() => {
    if (reorderChecked.current || !menuItems || menuItems.length === 0) return;
    if (localStorage.getItem('hoppiness_reorder')) {
      const loaded = cart.loadReorderItems(menuItems);
      if (loaded) {
        // Ensure we're on menu step
        setStep('menu');
      }
      reorderChecked.current = true;
    }
  }, [menuItems]);

  const [step, setStep] = useState<'landing' | 'menu'>('landing');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartInitialStep, setCartInitialStep] = useState<'cart' | 'checkout'>('cart');
  const [externalTrackingCode, setExternalTrackingCode] = useState<string | null>(null);
  const [trackingTrigger, setTrackingTrigger] = useState(0);
  const [misPedidosOpen, setMisPedidosOpen] = useState(false);

  // Always show landing first so user can choose service (Retiro/Delivery/Comer acá) before menu
  const [customizeItem, setCustomizeItem] = useState<WebappMenuItem | null>(null);

  // Deep linking: auto-open product from ?item= query param
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && menuItems && menuItems.length > 0 && !customizeItem) {
      const found = menuItems.find((i) => i.id === itemId);
      if (found) {
        setCustomizeItem(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, menuItems, customizeItem]);

  // Deep linking: auto-open tracking from ?tracking= query param
  useEffect(() => {
    const trackingParam = searchParams.get('tracking');
    if (trackingParam) {
      setExternalTrackingCode(trackingParam);
      setTrackingTrigger((prev) => prev + 1);
      const next = new URLSearchParams(searchParams);
      next.delete('tracking');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams]);

  // Open CartSheet when user wants to view tracking (e.g. "Ver estado" or ?tracking=)
  useEffect(() => {
    if (externalTrackingCode) {
      setCartOpen(true);
    }
  }, [externalTrackingCode, trackingTrigger]);

  // Auto-open cart sheet when user adds first item ("abrirse al estar llenandolo")
  const prevCartCount = useRef(cart.totalItems);
  useEffect(() => {
    if (cart.totalItems >= 1 && prevCartCount.current === 0) {
      setCartInitialStep('cart');
      setCartOpen(true);
    }
    prevCartCount.current = cart.totalItems;
  }, [cart.totalItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SpinnerLoader size="lg" text="Cargando menú..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Local no encontrado</h1>
          <p className="text-muted-foreground">Verificá el link y volvé a intentar.</p>
        </div>
      </div>
    );
  }

  if (!data.config.webapp_activa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-6">
        <div className="text-center text-white max-w-sm space-y-4">
          <h1 className="text-2xl font-black font-brand">{data.branch.name}</h1>
          <p className="text-white/80">
            Este local todavía no tiene pedidos online directos. Podés pedir por MasDelivery.
          </p>
          <a
            href="https://pedidos.masdelivery.com/hoppiness"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Ir a MasDelivery
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <Link to="/pedir" className="block mt-4">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Ver otros locales
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { branch, config } = data;

  const handleSelectService = (tipo: TipoServicioWebapp) => {
    cart.setTipoServicio(tipo);
    setStep('menu');
  };

  const handleProductClick = (item: WebappMenuItem) => {
    // Update URL for deep linking (shareable product link)
    setSearchParams({ item: item.id }, { replace: true });
    setCustomizeItem(item);
  };

  const handleOpenCartMobile = () => {
    setCartInitialStep('cart');
    setCartOpen(true);
  };

  // Handler for MisPedidosSheet tracking â€” feeds into same mechanism
  const handleMisPedidosTrack = (trackingCode: string) => {
    setExternalTrackingCode(trackingCode);
    setTrackingTrigger((prev) => prev + 1);
  };

  // Side panel now handles checkout inline, no need for this handler

  const isDelivery = cart.tipoServicio === 'delivery';
  const costoEnvio = isDelivery ? (config.delivery_costo ?? 0) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`Pedí en ${branch.name} | Hoppiness`}
        description={`Hacé tu pedido online en Hoppiness ${branch.name}. Hamburguesas smash premiadas.`}
        path={`/pedir/${branchSlug}`}
      />

      {step === 'landing' ? (
        <BranchLanding
          branch={branch}
          config={config}
          onSelectService={handleSelectService}
          onViewMenu={() => setStep('menu')}
          onBack={() => navigate('/pedir')}
          branchId={branch.id}
          googleApiKey={googleApiKey}
          onDeliveryValidated={handleDeliveryValidated}
          initialDeliveryAddress={prevalidatedAddress}
        />
      ) : (
        <>
          <div className="flex flex-1 min-h-0">
            <WebappMenuView
              branch={branch}
              config={config}
              items={menuItems || []}
              loading={menuLoading}
              tipoServicio={cart.tipoServicio}
              cart={cart}
              onProductClick={handleProductClick}
              onBack={() => setStep('landing')}
              onServiceChange={(tipo) => cart.setTipoServicio(tipo)}
              onShowTracking={(code) => {
                setExternalTrackingCode(code);
                setTrackingTrigger((prev) => prev + 1);
              }}
              onOpenCart={handleOpenCartMobile}
              hasCartItems={cart.totalItems > 0}
            />
          </div>

          {/* Cart bar (mobile + desktop) â€” opens CartSheet */}
          {cart.totalItems > 0 && (
            <CartBar
              totalItems={cart.totalItems}
              totalPrecio={cart.totalPrecio}
              onOpen={handleOpenCartMobile}
            />
          )}

          <CartSheet
            open={cartOpen}
            onOpenChange={setCartOpen}
            cart={cart}
            branchName={branch.name}
            branchId={branch.id}
            mpEnabled={mpEnabled}
            deliveryCosto={costoEnvio}
            initialStep={cartInitialStep}
            externalTrackingCode={externalTrackingCode}
            prevalidatedAddress={prevalidatedAddress}
            prevalidatedCalc={prevalidatedCalc}
          />

          <MisPedidosSheet
            open={misPedidosOpen}
            onOpenChange={setMisPedidosOpen}
            onShowTracking={handleMisPedidosTrack}
            currentBranchSlug={branchSlug}
          />

          <ProductCustomizeSheet
            item={customizeItem}
            onClose={() => {
              setCustomizeItem(null);
              // Clear deep link param
              if (searchParams.has('item')) setSearchParams({}, { replace: true });
            }}
            onAdd={(cartItem) => {
              cart.addItem(cartItem);
              setCustomizeItem(null);
              if (searchParams.has('item')) setSearchParams({}, { replace: true });
            }}
          />
        </>
      )}
    </div>
  );
}
