import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrackingInlineView } from './TrackingInlineView';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  CreditCard,
  Banknote,
  MapPin,
} from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { useWebappCart } from '@/hooks/useWebappCart';
import type { DeliveryCalcResult } from '@/types/webapp';
import { AddressAutocomplete } from './AddressAutocomplete';
import type { AddressResult } from '@/types/webapp';
import { DeliveryCostDisplay, DeliveryCostLoading } from './DeliveryCostDisplay';
import { DeliveryUnavailable } from './DeliveryUnavailable';
import { PromoCodeInput } from './PromoCodeInput';
import { useCalculateDelivery } from '@/hooks/useDeliveryConfig';
import { useActivePromos, useActivePromoItems } from '@/hooks/usePromociones';
import { normalizePhone } from '@/lib/normalizePhone';
import {
  createMercadoPagoCheckout,
  createWebappOrder,
  fetchGoogleMapsApiKey,
  fetchSavedAddresses,
  fetchUserProfile,
  fetchWebappConfigPayments,
} from '@/services/checkoutService';
import { useCheckoutPaymentRestrictions } from '@/hooks/useCheckoutFlow';
import { formatPrice } from '@/lib/formatters';

function useGoogleMapsApiKey() {
  return useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchGoogleMapsApiKey,
    staleTime: Infinity,
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: ReturnType<typeof useWebappCart>;
  branchName: string;
  branchId?: string;
  mpEnabled?: boolean;
  deliveryCosto?: number;
  initialStep?: Step;
  externalTrackingCode?: string | null;
  prevalidatedAddress?: AddressResult | null;
  prevalidatedCalc?: DeliveryCalcResult | null;
}

type Step = 'cart' | 'checkout' | 'tracking';
type MetodoPago = 'mercadopago' | 'cash';
type ServiceKey = 'retiro' | 'delivery';

// Inline validation helper
function FieldError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-xs text-destructive mt-1">{error}</p>;
}

export function CartSheet({
  open,
  onOpenChange,
  cart,
  branchName,
  branchId,
  mpEnabled,
  deliveryCosto: _deliveryCosto = 0,
  initialStep,
  externalTrackingCode,
  prevalidatedAddress,
  prevalidatedCalc,
}: Props) {
  const { user } = useAuth();
  const servicioLabel =
    cart.tipoServicio === 'retiro'
      ? 'Retiro en local'
      : cart.tipoServicio === 'delivery'
        ? 'Delivery'
        : 'Comer acá';

  // Fetch profile for pre-fill when logged in
  const { data: userProfile } = useQuery({
    queryKey: ['webapp-profile-prefill', user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
  });

  const isDelivery = cart.tipoServicio === 'delivery';
  const serviceKey: ServiceKey = isDelivery ? 'delivery' : 'retiro';
  const { data: googleApiKey } = useGoogleMapsApiKey();
  const calculateDelivery = useCalculateDelivery();

  // Dynamic delivery state — seed from pre-validated values
  const [deliveryAddress, setDeliveryAddress] = useState<AddressResult | null>(
    prevalidatedAddress ?? null,
  );
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryCalcResult | null>(
    prevalidatedCalc ?? null,
  );
  const [calcLoading, setCalcLoading] = useState(false);

  // Fetch saved addresses for logged-in users
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['saved-addresses-checkout', user?.id],
    queryFn: () => fetchSavedAddresses(user!.id),
    enabled: !!user && isDelivery,
  });

  const [step, setStep] = useState<Step>(initialStep || 'cart');
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialStep) {
      setStep(initialStep);
    }
  }, [open, initialStep]);

  useEffect(() => {
    if (externalTrackingCode) {
      setTrackingCode(externalTrackingCode);
      setStep('tracking');
    }
  }, [externalTrackingCode]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Calculate delivery cost when address is selected
  useEffect(() => {
    if (!deliveryAddress || !branchId) {
      setDeliveryCalc(null);
      return;
    }
    setCalcLoading(true);
    calculateDelivery
      .mutateAsync({
        branch_id: branchId,
        customer_lat: deliveryAddress.lat,
        customer_lng: deliveryAddress.lng,
        neighborhood_name: deliveryAddress.neighborhood_name,
      })
      .then((result) => {
        setDeliveryCalc(result);
      })
      .catch(() => {
        setDeliveryCalc(null);
      })
      .finally(() => {
        setCalcLoading(false);
      });
  }, [deliveryAddress, branchId]);

  const handleAddressSelect = (result: AddressResult | null) => {
    setDeliveryAddress(result);
    if (result) {
      setAddress(result.formatted_address);
    } else {
      setAddress('');
      setDeliveryCalc(null);
    }
  };

  // Checkout form state - pre-fill from profile (if logged in) or localStorage
  const [nombre, setNombre] = useState(() => {
    try {
      return localStorage.getItem('hop_client_nombre') || '';
    } catch {
      return '';
    }
  });
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem('hop_client_telefono') || '';
    } catch {
      return '';
    }
  });
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('hop_client_email') || '';
    } catch {
      return '';
    }
  });
  const [address, setAddress] = useState(() => {
    try {
      return localStorage.getItem('hop_client_direccion') || '';
    } catch {
      return '';
    }
  });

  // Pre-fill from profile when data loads (overrides localStorage if profile has data)
  useEffect(() => {
    if (userProfile) {
      if (userProfile.full_name && !nombre) setNombre(userProfile.full_name);
      if (userProfile.phone && !phone) setPhone(userProfile.phone);
      if ((userProfile.email || user?.email) && !email)
        setEmail(userProfile.email || user?.email || '');
    }
  }, [userProfile]);
  // Sync pre-validated delivery address when props change
  useEffect(() => {
    if (prevalidatedAddress && prevalidatedCalc) {
      setDeliveryAddress(prevalidatedAddress);
      setDeliveryCalc(prevalidatedCalc);
      if (prevalidatedAddress.formatted_address) {
        setAddress(prevalidatedAddress.formatted_address);
      }
    }
  }, [prevalidatedAddress, prevalidatedCalc]);

  const [piso, setPiso] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(mpEnabled ? 'mercadopago' : 'cash');
  const [pagaCon, setPagaCon] = useState<string>('');
  const [showMpConfirm, setShowMpConfirm] = useState(false);
  const [promoCode, setPromoCode] = useState<{
    codigoId: string;
    codigoText: string;
    descuento: number;
  } | null>(null);

  const mpEnabledBool = !!mpEnabled;
  const { data: webappConfig } = useQuery({
    queryKey: ['webapp-config-payments', branchId],
    queryFn: () => fetchWebappConfigPayments(branchId!),
    enabled: !!branchId,
  });

  const servicePayments = useMemo(() => {
    const defaults =
      serviceKey === 'delivery'
        ? { efectivo: false, mercadopago: true }
        : { efectivo: true, mercadopago: true };
    const schedules = webappConfig?.service_schedules as
      | Record<string, { payment_methods?: { efectivo?: boolean; mercadopago?: boolean } }>
      | undefined;
    const pm = schedules?.[serviceKey]?.payment_methods;
    return {
      cash: pm?.efectivo ?? defaults.efectivo,
      mercadopago: pm?.mercadopago ?? defaults.mercadopago,
    };
  }, [webappConfig, serviceKey]);
  const { data: activePromos = [] } = useActivePromos(branchId, 'webapp');
  const { data: activePromoItems = [] } = useActivePromoItems(branchId, 'webapp');

  const promoPayment = useCheckoutPaymentRestrictions({
    activePromoItems,
    activePromos,
    cartItems: cart.items,
    servicePayments,
    mpEnabled: mpEnabledBool,
    serviceKey,
  });

  useEffect(() => {
    if (promoPayment.conflict) return;
    if (promoPayment.forced && metodoPago !== promoPayment.forced) {
      setMetodoPago(promoPayment.forced);
      return;
    }
    if (!promoPayment.cashAllowed && metodoPago === 'cash') {
      setMetodoPago('mercadopago');
    }
  }, [promoPayment.conflict, promoPayment.forced, promoPayment.cashAllowed, metodoPago]);

  const costoEnvio =
    isDelivery && deliveryCalc?.available && deliveryCalc.cost != null ? deliveryCalc.cost : 0;
  const promoDescuento = promoCode?.descuento ?? 0;
  const totalConEnvio = Math.max(0, cart.totalPrecio + costoEnvio - promoDescuento);
  const deliveryAvailable = !isDelivery || deliveryCalc?.available === true;

  // Inline validation errors
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.nombre =
      nombre.trim().length === 0
        ? 'Ingresá tu nombre'
        : nombre.trim().length < 2
          ? 'Mínimo 2 caracteres'
          : null;
    e.phone =
      phone.trim().length === 0
        ? 'Ingresá tu teléfono'
        : phone.trim().length < 8
          ? 'Mínimo 8 dígitos'
          : null;
    e.email =
      email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Email no válido' : null;
    if (isDelivery) {
      e.address =
        address.trim().length === 0
          ? 'Ingresá tu dirección'
          : address.trim().length < 5
            ? 'Mínimo 5 caracteres'
            : null;
    }
    return e;
  }, [nombre, phone, email, address, isDelivery]);

  const hasErrors = Object.values(errors).some((e) => e !== null);
  const paymentAllowed = useMemo(() => {
    if (promoPayment.conflict) return false;
    if (!promoPayment.cashAllowed && metodoPago === 'cash') return false;
    if (promoPayment.hasCashOnly && metodoPago !== 'cash') return false;
    if (promoPayment.hasDigitalOnly && metodoPago !== 'mercadopago') return false;
    if (metodoPago === 'mercadopago' && !promoPayment.mpAllowed) return false;
    return true;
  }, [promoPayment, metodoPago]);

  const canSubmit =
    !hasErrors &&
    deliveryAvailable &&
    (!isDelivery || !!deliveryAddress) &&
    (metodoPago === 'cash' || mpEnabled);
  const canSubmitWithRestrictions = canSubmit && paymentAllowed;

  const handleBlur = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleContinue = () => setStep('checkout');

  const handleBack = () => setStep('cart');

  const handleConfirm = async () => {
    // Mark all fields as touched to show errors
    setTouched({ nombre: true, phone: true, email: true, address: true });
    if (!branchId || !canSubmitWithRestrictions) return;

    // Show MP confirmation dialog before proceeding
    if (metodoPago === 'mercadopago' && !showMpConfirm) {
      setShowMpConfirm(true);
      return;
    }

    // Save client data to localStorage for pre-fill
    try {
      localStorage.setItem('hop_client_nombre', nombre.trim());
      localStorage.setItem('hop_client_telefono', phone.trim());
      if (email.trim()) localStorage.setItem('hop_client_email', email.trim());
      if (address.trim()) localStorage.setItem('hop_client_direccion', address.trim());
    } catch {
      /* ignore */
    }

    setSubmitting(true);
    try {
      const orderItems = cart.items.map((item) => ({
        item_carta_id: item.sourceItemId ?? item.itemId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.precioUnitario,
        extras: item.extras.map((e) => ({ name: e.name, precio: e.precio })),
        incluidos: (item.includedModifiers || []).map((m) => ({
          name: m.name,
          quantity: m.quantity,
        })),
        removidos: item.removidos,
        promocion_id: item.promocionId ?? null,
        promocion_item_id: item.promocionItemId ?? null,
        articulo_tipo: item.isPromoArticle ? 'promo' : 'base',
        articulo_id: item.itemId,
        notes: item.notes || null,
      }));

      const { data: orderData, error: orderErr } = await createWebappOrder({
        branch_id: branchId,
        service_type: cart.tipoServicio,
        customer_name: nombre.trim(),
        customer_phone: normalizePhone(phone) || phone.trim(),
        cliente_email: email.trim() || null,
        customer_address: isDelivery ? address.trim() : null,
        cliente_piso: isDelivery ? piso.trim() || null : null,
        cliente_referencia: isDelivery ? referencia.trim() || null : null,
        cliente_notas: notas.trim() || null,
        metodo_pago: metodoPago,
        paga_con: metodoPago === 'cash' && pagaCon ? parseInt(pagaCon) : null,
        delivery_zone_id: null,
        delivery_lat: deliveryAddress?.lat ?? null,
        delivery_lng: deliveryAddress?.lng ?? null,
        delivery_cost_calculated: costoEnvio > 0 ? costoEnvio : null,
        delivery_distance_km: deliveryCalc?.distance_km ?? null,
        codigo_descuento_id: promoCode?.codigoId ?? null,
        descuento_codigo: promoDescuento > 0 ? promoDescuento : null,
        items: orderItems,
      });

      if (orderErr) {
        let errorMsg = 'Error al crear el pedido';
        try {
          if (orderErr instanceof Error && 'context' in orderErr) {
            const ctx = (orderErr as any).context;
            if (ctx?.json) {
              const body = await ctx.json();
              errorMsg = body?.error || errorMsg;
            }
          } else if (
            typeof orderErr === 'object' &&
            orderErr !== null &&
            'error' in (orderErr as any)
          ) {
            errorMsg = (orderErr as any).error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(errorMsg);
      }
      if (!orderData?.pedido_id) throw new Error('No se pudo crear el pedido');

      const { pedido_id, tracking_code, order_number } = orderData;

      if (metodoPago === 'mercadopago') {
        const checkoutItems = cart.items.map((item) => ({
          title: item.name,
          quantity: item.quantity,
          unit_price: item.precioUnitario + item.extras.reduce((s, e) => s + e.precio, 0),
        }));

        if (costoEnvio > 0) {
          checkoutItems.push({ title: 'Envío', quantity: 1, unit_price: costoEnvio });
        }

        const trackingUrl = `${window.location.origin}/pedido/${tracking_code}`;

        const { data: mpData, error: mpErr } = await createMercadoPagoCheckout({
          branch_id: branchId,
          items: checkoutItems,
          external_reference: pedido_id,
          payer: {
            name: nombre.trim(),
            email: email.trim() || undefined,
            phone: phone.trim(),
          },
          back_url: trackingUrl,
          webapp_order: true,
        });

        if (mpErr) throw mpErr;
        if (mpData?.init_point) {
          cart.clearCart();
          window.location.href = mpData.init_point;
          return;
        }
        throw new Error('No se pudo crear el link de pago');
      }

      cart.clearCart();
      toast.success(`Pedido #${order_number} confirmado`);
      localStorage.setItem('hoppiness_last_tracking', tracking_code);
      setTrackingCode(tracking_code);
      setStep('tracking');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear el pedido';
      toast.error('Error', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && step !== 'tracking') {
      setStep('cart');
      setTouched({});
    }
    onOpenChange(open);
  };

  // Quick cash amount buttons
  const quickAmounts = useMemo(() => {
    const t = totalConEnvio;
    const base = Math.ceil(t / 5000) * 5000;
    const amounts = [base];
    if (base + 5000 <= base * 2) amounts.push(base + 5000);
    if (base + 10000 <= base * 2) amounts.push(base + 10000);
    return amounts.filter((v, i, a) => a.indexOf(v) === i && v >= t);
  }, [totalConEnvio]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 flex flex-col">
        <SheetHeader className="px-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-left">
            {(step === 'checkout' || step === 'tracking') && (
              <button
                onClick={
                  step === 'tracking'
                    ? () => {
                        setTrackingCode(null);
                        setStep('cart');
                        onOpenChange(false);
                      }
                    : handleBack
                }
                className="p-1 -ml-1 rounded-full hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <ShoppingBag className="w-5 h-5 text-primary" />
            {step === 'tracking'
              ? 'Seguimiento'
              : step === 'cart'
                ? 'Tu pedido'
                : 'Completá tus datos'}
          </SheetTitle>
          {step !== 'tracking' && (
            <p className="text-xs text-muted-foreground">
              {servicioLabel} · {branchName}
            </p>
          )}
          {/* Visual stepper — hidden during tracking */}
          {step !== 'tracking' && cart.items.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === 'cart'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  1
                </div>
                <span
                  className={`text-xs font-medium ${step === 'cart' ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Pedido
                </span>
              </div>
              <div
                className={`flex-1 h-0.5 rounded ${step === 'checkout' ? 'bg-primary' : 'bg-border'}`}
              />
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === 'checkout'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-xs font-medium ${step === 'checkout' ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  Datos y pago
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Tracking FIRST — before empty cart check (cart is cleared after order) */}
        {step === 'tracking' && trackingCode ? (
          <div className="flex flex-col flex-1 min-h-0">
            <TrackingInlineView
              trackingCode={trackingCode}
              onNewOrder={() => {
                setTrackingCode(null);
                setStep('cart');
                localStorage.removeItem('hoppiness_last_tracking');
                onOpenChange(false);
              }}
            />
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20 text-center">
            <div>
              <span className="text-5xl mb-4 block">🛒</span>
              <p className="text-muted-foreground">Tu carrito está vacío</p>
              <p className="text-xs text-muted-foreground mt-1">
                Explorá el menú y armá tu pedido perfecto.
              </p>
            </div>
          </div>
        ) : step === 'cart' ? (
          /* ── STEP 1: CART ───────────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.items.map((item) => {
                const extrasTotal = item.extras.reduce((s, e) => s + e.precio, 0);
                const lineTotal = (item.precioUnitario + extrasTotal) * item.quantity;

                return (
                  <div
                    key={item.cartId}
                    className="flex items-start gap-3 bg-card rounded-lg p-3 border"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xl">
                        🍔
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      {item.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.extras.map((e) => `+ ${e.name}`).join(', ')}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-xs text-destructive">
                          {item.removidos.map((r) => `Sin ${r}`).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) cart.removeItem(item.cartId);
                              else cart.updateQuantity(item.cartId, item.quantity - 1);
                            }}
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95"
                            aria-label="Quitar uno"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-3 h-3 text-destructive" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.cartId, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
                            aria-label="Agregar uno"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-bold text-sm">{formatPrice(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t px-5 py-4 space-y-3 bg-background shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-semibold">{formatPrice(cart.totalPrecio)}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Envío</span>
                  <span className="text-sm font-semibold">{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-base font-bold">Total</span>
                <span className="text-xl font-black text-foreground">
                  {formatPrice(totalConEnvio)}
                </span>
              </div>
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base"
                onClick={handleContinue}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          /* ── STEP 2: CHECKOUT ───────────────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Customer data */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Tus datos</h3>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="checkout-nombre" className="text-xs">
                      Nombre *
                    </Label>
                    <Input
                      id="checkout-nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      onBlur={() => handleBlur('nombre')}
                      placeholder="Tu nombre"
                      className={`mt-1 ${touched.nombre && errors.nombre ? 'border-destructive' : ''}`}
                    />
                    {touched.nombre && <FieldError error={errors.nombre} />}
                  </div>
                  <div>
                    <Label htmlFor="checkout-phone" className="text-xs">
                      Teléfono *
                    </Label>
                    <Input
                      id="checkout-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder="3511234567"
                      className={`mt-1 ${touched.phone && errors.phone ? 'border-destructive' : ''}`}
                    />
                    {touched.phone && <FieldError error={errors.phone} />}
                    {(!touched.phone || !errors.phone) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Sin 0 ni +54 — ej: 3511234567
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="checkout-email" className="text-xs">
                      Email (opcional)
                    </Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="tu@email.com"
                      className={`mt-1 ${touched.email && errors.email ? 'border-destructive' : ''}`}
                    />
                    {touched.email && <FieldError error={errors.email} />}
                  </div>
                </div>
              </div>

              {/* Delivery address + dynamic cost */}
              {isDelivery && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Dirección de entrega</h3>

                  {/* Pre-validated address summary or full autocomplete */}
                  {deliveryAddress && deliveryCalc?.available ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                          <span className="font-medium truncate">
                            {deliveryAddress.formatted_address}
                          </span>
                        </div>
                        <button
                        onClick={() => {
                          setDeliveryAddress(null);
                          setDeliveryCalc(null);
                          setAddress('');
                          }}
                          className="text-xs text-primary hover:underline shrink-0 ml-2"
                        >
                          Cambiar
                        </button>
                      </div>
                      {deliveryCalc.cost != null && (
                        <DeliveryCostDisplay
                          cost={deliveryCalc.cost}
                          distanceKm={deliveryCalc.distance_km!}
                          estimatedDeliveryMin={deliveryCalc.estimated_delivery_min!}
                          disclaimer={deliveryCalc.disclaimer}
                        />
                      )}
                    </div>
                  ) : (
                    <>
                      <AddressAutocomplete
                        apiKey={googleApiKey ?? null}
                        onSelect={handleAddressSelect}
                        selectedAddress={deliveryAddress}
                      />

                      {calcLoading && <DeliveryCostLoading />}
                      {deliveryCalc && deliveryCalc.available && deliveryCalc.cost != null && (
                        <DeliveryCostDisplay
                          cost={deliveryCalc.cost}
                          distanceKm={deliveryCalc.distance_km!}
                          estimatedDeliveryMin={deliveryCalc.estimated_delivery_min!}
                          disclaimer={deliveryCalc.disclaimer}
                        />
                      )}
                      {deliveryCalc && !deliveryCalc.available && (
                        <DeliveryUnavailable
                          onSwitchToPickup={() => {
                            cart.setTipoServicio('retiro');
                            setDeliveryAddress(null);
                            setDeliveryCalc(null);
                          }}
                          onChangeAddress={() => {
                            setDeliveryAddress(null);
                            setDeliveryCalc(null);
                          }}
                          reason={deliveryCalc.reason}
                          suggestedBranch={deliveryCalc.suggested_branch}
                        />
                      )}

                      {/* Saved addresses picker */}
                      {savedAddresses.length > 0 && !deliveryAddress && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Dirección guardada</Label>
                          <Select
                            value=""
                            onValueChange={(addrId) => {
                              const addr = savedAddresses.find((a) => a.id === addrId);
                              if (addr) {
                                setAddress(addr.address);
                                setPiso(addr.piso || '');
                                setReferencia(addr.referencia || '');
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar dirección guardada" />
                            </SelectTrigger>
                            <SelectContent>
                              {savedAddresses.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.etiqueta} — {a.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="checkout-piso" className="text-xs">
                          Piso / Depto
                        </Label>
                        <Input
                          id="checkout-piso"
                          value={piso}
                          onChange={(e) => setPiso(e.target.value)}
                          placeholder="3B"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkout-ref" className="text-xs">
                          Referencia
                        </Label>
                        <Input
                          id="checkout-ref"
                          value={referencia}
                          onChange={(e) => setReferencia(e.target.value)}
                          placeholder="Edificio verde"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="checkout-notas" className="text-xs font-bold">
                  Notas para el local (opcional)
                </Label>
                <Textarea
                  id="checkout-notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: tocar timbre, sin servilletas..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Payment method */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Método de pago</h3>
                {promoPayment.reason && (
                  <p className="text-[11px] text-muted-foreground">{promoPayment.reason}</p>
                )}
                <RadioGroup
                  value={metodoPago}
                  onValueChange={(v) => setMetodoPago(v as MetodoPago)}
                  className="space-y-2"
                >
                  {mpEnabled && (
                    <label
                      htmlFor="pago-mp"
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        metodoPago === 'mercadopago' ? 'border-primary bg-primary/5' : ''
                      } ${!promoPayment.mpAllowed || promoPayment.hasCashOnly ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                    >
                      <RadioGroupItem
                        value="mercadopago"
                        id="pago-mp"
                        disabled={!promoPayment.mpAllowed || promoPayment.hasCashOnly}
                      />
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-semibold">MercadoPago</p>
                        <p className="text-xs text-muted-foreground">Tarjeta, débito o billetera</p>
                      </div>
                    </label>
                  )}
                  <label
                    htmlFor="pago-cash"
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      metodoPago === 'cash' ? 'border-primary bg-primary/5' : ''
                    } ${!promoPayment.cashAllowed || promoPayment.hasDigitalOnly ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <RadioGroupItem
                      value="cash"
                      id="pago-cash"
                      disabled={!promoPayment.cashAllowed || promoPayment.hasDigitalOnly}
                    />
                    <Banknote className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold">Efectivo</p>
                      <p className="text-xs text-muted-foreground">
                        {isDelivery ? 'Pagás al recibir' : 'Pagás al retirar'}
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {/* "¿Con cuánto pagás?" for cash */}
                {metodoPago === 'cash' && promoPayment.cashAllowed && (
                  <div className="space-y-2 pl-1">
                    <Label className="text-xs">¿Con cuánto pagás?</Label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setPagaCon('')}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          !pagaCon
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        Monto justo
                      </button>
                      {quickAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setPagaCon(String(amt))}
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                            pagaCon === String(amt)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {formatPrice(amt)}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={pagaCon}
                      onChange={(e) => setPagaCon(e.target.value)}
                      placeholder="Otro monto..."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Promo code */}
              <PromoCodeInput
                branchId={branchId}
                subtotal={cart.totalPrecio}
                onApply={(descuento, codigoId, codigoText) =>
                  setPromoCode({ codigoId, codigoText, descuento })
                }
                onRemove={() => setPromoCode(null)}
                appliedCode={promoCode?.codigoText ?? null}
                appliedDiscount={promoDescuento}
              />

              {/* Order summary */}
              <div className="space-y-2 rounded-xl border p-3 bg-muted/30">
                <h3 className="text-sm font-bold text-foreground">Resumen</h3>
                {cart.items.map((item) => {
                  const ext = item.extras.reduce((s, e) => s + e.precio, 0);
                  return (
                    <div key={item.cartId} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium">
                        {formatPrice((item.precioUnitario + ext) * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(cart.totalPrecio)}</span>
                  </div>
                  {costoEnvio > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Envío</span>
                      <span>{formatPrice(costoEnvio)}</span>
                    </div>
                  )}
                  {promoDescuento > 0 && (
                    <div className="flex justify-between text-xs text-success">
                      <span>Descuento ({promoCode?.codigoText})</span>
                      <span>-{formatPrice(promoDescuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span>Total</span>
                    <span>{formatPrice(totalConEnvio)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <div className="border-t px-5 py-4 bg-background shrink-0 space-y-3">
              {/* MercadoPago pre-redirect confirmation */}
              {showMpConfirm && metodoPago === 'mercadopago' && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-2">
                  <p className="text-sm font-semibold text-blue-900">
                    Te vamos a llevar a MercadoPago
                  </p>
                  <p className="text-xs text-blue-700">
                    Vas a completar el pago de forma segura en MercadoPago. Una vez confirmado,
                    volvés acá para seguir el estado de tu pedido.
                  </p>
                </div>
              )}
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base"
                disabled={!canSubmitWithRestrictions || submitting}
                onClick={handleConfirm}
              >
                {submitting && <DotsLoader />}
                {metodoPago === 'mercadopago'
                  ? showMpConfirm
                    ? `Ir a MercadoPago · ${formatPrice(totalConEnvio)}`
                    : `Pagar ${formatPrice(totalConEnvio)}`
                  : `Confirmar pedido ${formatPrice(totalConEnvio)}`}
              </Button>
            </div>
          </div>
        )}

        {/* Tracking block moved above empty cart check */}
      </SheetContent>
    </Sheet>
  );
}
