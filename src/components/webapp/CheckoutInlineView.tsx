/**
 * CheckoutInlineView — Checkout form for CartSidePanel (350px desktop panel).
 * Contains: customer data, delivery address, payment method, order summary, confirm button.
 * Shares logic with CartSheet but optimized for narrow inline layout.
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Banknote } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
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
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
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

function FieldError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-xs text-destructive mt-1">{error}</p>;
}

type MetodoPago = 'mercadopago' | 'efectivo';
type ServiceKey = 'retiro' | 'delivery';

interface Props {
  cart: ReturnType<typeof useWebappCart>;
  branchId: string;
  branchName: string;
  mpEnabled: boolean;
  costoEnvio: number;
  onBack: () => void;
  onConfirmed: (trackingCode: string) => void;
  prevalidatedAddress?: AddressResult | null;
  prevalidatedCalc?: DeliveryCalcResult | null;
}

export function CheckoutInlineView({
  cart,
  branchId,
  branchName,
  mpEnabled,
  costoEnvio: _propCostoEnvio,
  onBack,
  onConfirmed,
  prevalidatedAddress,
  prevalidatedCalc,
}: Props) {
  const { user } = useAuth();
  const isDelivery = cart.tipoServicio === 'delivery';
  const servicioLabel =
    cart.tipoServicio === 'retiro'
      ? 'Retiro en local'
      : cart.tipoServicio === 'delivery'
        ? 'Delivery'
        : 'Comer acá';
  const serviceKey: ServiceKey = isDelivery ? 'delivery' : 'retiro';

  const { data: webappConfig } = useQuery({
    queryKey: ['webapp-config-payments', branchId],
    queryFn: () => fetchWebappConfigPayments(branchId),
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
      efectivo: pm?.efectivo ?? defaults.efectivo,
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
    mpEnabled,
    serviceKey,
  });

  // Profile prefill
  const { data: userProfile } = useQuery({
    queryKey: ['webapp-profile-prefill', user?.id],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
  });

  // Dynamic delivery
  const { data: googleApiKey } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchGoogleMapsApiKey,
    staleTime: Infinity,
  });
  const calculateDelivery = useCalculateDelivery();
  const [deliveryAddress, setDeliveryAddress] = useState<AddressResult | null>(
    prevalidatedAddress ?? null,
  );
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryCalcResult | null>(
    prevalidatedCalc ?? null,
  );
  const [calcLoading, setCalcLoading] = useState(false);

  // Saved addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['saved-addresses-checkout', user?.id],
    queryFn: () => fetchSavedAddresses(user!.id),
    enabled: !!user && isDelivery,
  });

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showMpConfirm, setShowMpConfirm] = useState(false);

  const [nombre, setNombre] = useState(() => {
    try {
      return localStorage.getItem('hop_client_nombre') || '';
    } catch {
      return '';
    }
  });
  const [telefono, setTelefono] = useState(() => {
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
  const [direccion, setDireccion] = useState(() => {
    try {
      return localStorage.getItem('hop_client_direccion') || '';
    } catch {
      return '';
    }
  });
  const [piso, setPiso] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(mpEnabled ? 'mercadopago' : 'efectivo');
  const [pagaCon, setPagaCon] = useState<string>('');
  const [promoCode, setPromoCode] = useState<{
    codigoId: string;
    codigoText: string;
    descuento: number;
  } | null>(null);

  // Enforce payment restrictions (delivery + promos)
  useEffect(() => {
    if (promoPayment.conflict) return;
    if (promoPayment.forced && metodoPago !== promoPayment.forced) {
      setMetodoPago(promoPayment.forced);
      return;
    }
    if (!promoPayment.cashAllowed && metodoPago === 'efectivo') {
      setMetodoPago('mercadopago');
    }
  }, [promoPayment.conflict, promoPayment.forced, promoPayment.cashAllowed, metodoPago]);

  // Sync pre-validated delivery address when props change
  useEffect(() => {
    if (prevalidatedAddress && prevalidatedCalc) {
      setDeliveryAddress(prevalidatedAddress);
      setDeliveryCalc(prevalidatedCalc);
      if (prevalidatedAddress.formatted_address) {
        setDireccion(prevalidatedAddress.formatted_address);
      }
    }
  }, [prevalidatedAddress, prevalidatedCalc]);

  // Profile prefill
  useEffect(() => {
    if (userProfile) {
      if (userProfile.full_name && !nombre) setNombre(userProfile.full_name);
      if (userProfile.phone && !telefono) setTelefono(userProfile.phone);
      if ((userProfile.email || user?.email) && !email)
        setEmail(userProfile.email || user?.email || '');
    }
  }, [userProfile]);

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
      setDireccion(result.formatted_address);
    } else {
      setDireccion('');
      setDeliveryCalc(null);
    }
  };

  const costoEnvio =
    isDelivery && deliveryCalc?.available && deliveryCalc.cost != null ? deliveryCalc.cost : 0;
  const promoDescuento = promoCode?.descuento ?? 0;
  const totalConEnvio = Math.max(0, cart.totalPrecio + costoEnvio - promoDescuento);
  const deliveryAvailable = !isDelivery || deliveryCalc?.available === true;

  // Validation
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.nombre =
      nombre.trim().length === 0
        ? 'Ingresá tu nombre'
        : nombre.trim().length < 2
          ? 'Mínimo 2 caracteres'
          : null;
    e.telefono =
      telefono.trim().length === 0
        ? 'Ingresá tu teléfono'
        : telefono.trim().length < 8
          ? 'Mínimo 8 dígitos'
          : null;
    e.email =
      email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Email no válido' : null;
    if (isDelivery) {
      e.direccion =
        direccion.trim().length === 0
          ? 'Ingresá tu dirección'
          : direccion.trim().length < 5
            ? 'Mínimo 5 caracteres'
            : null;
    }
    return e;
  }, [nombre, telefono, email, direccion, isDelivery]);

  const hasErrors = Object.values(errors).some((e) => e !== null);
  const canSubmit =
    !hasErrors &&
    deliveryAvailable &&
    (!isDelivery || !!deliveryAddress) &&
    (metodoPago === 'efectivo' || mpEnabled);
  const paymentAllowed = useMemo(() => {
    if (promoPayment.conflict) return false;
    if (!promoPayment.cashAllowed && metodoPago === 'efectivo') return false;
    if (promoPayment.hasCashOnly && metodoPago !== 'efectivo') return false;
    if (promoPayment.hasDigitalOnly && metodoPago !== 'mercadopago') return false;
    if (metodoPago === 'mercadopago' && !promoPayment.mpAllowed) return false;
    return true;
  }, [promoPayment, metodoPago]);
  const canSubmitWithRestrictions = canSubmit && paymentAllowed;

  const handleBlur = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const quickAmounts = useMemo(() => {
    const t = totalConEnvio;
    const base = Math.ceil(t / 5000) * 5000;
    const amounts = [base];
    if (base + 5000 <= base * 2) amounts.push(base + 5000);
    if (base + 10000 <= base * 2) amounts.push(base + 10000);
    return amounts.filter((v, i, a) => a.indexOf(v) === i && v >= t);
  }, [totalConEnvio]);

  const handleConfirm = async () => {
    setTouched({ nombre: true, telefono: true, email: true, direccion: true });
    if (!canSubmitWithRestrictions) return;

    if (metodoPago === 'mercadopago' && !showMpConfirm) {
      setShowMpConfirm(true);
      return;
    }

    try {
      localStorage.setItem('hop_client_nombre', nombre.trim());
      localStorage.setItem('hop_client_telefono', telefono.trim());
      if (email.trim()) localStorage.setItem('hop_client_email', email.trim());
      if (direccion.trim()) localStorage.setItem('hop_client_direccion', direccion.trim());
    } catch {
      /* ignore */
    }

    setSubmitting(true);
    try {
      const orderItems = cart.items.map((item) => ({
        item_carta_id: item.sourceItemId ?? item.itemId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        extras: item.extras.map((e) => ({
          nombre: e.nombre,
          precio: e.precio,
          cantidad: e.cantidad ?? 1,
        })),
        incluidos: (item.includedModifiers || []).map((m) => ({
          nombre: m.nombre,
          cantidad: m.cantidad,
        })),
        removidos: item.removidos,
        promocion_id: item.promocionId ?? null,
        promocion_item_id: item.promocionItemId ?? null,
        articulo_tipo: item.isPromoArticle ? 'promo' : 'base',
        articulo_id: item.itemId,
        notas: item.notas || null,
      }));

      const { data: orderData, error: orderErr } = await createWebappOrder({
        branch_id: branchId,
        tipo_servicio: cart.tipoServicio,
        cliente_nombre: nombre.trim(),
        cliente_telefono: normalizePhone(telefono) || telefono.trim(),
        cliente_email: email.trim() || null,
        cliente_direccion: isDelivery ? direccion.trim() : null,
        cliente_piso: isDelivery ? piso.trim() || null : null,
        cliente_referencia: isDelivery ? referencia.trim() || null : null,
        cliente_notas: notas.trim() || null,
        metodo_pago: metodoPago,
        paga_con: metodoPago === 'efectivo' && pagaCon ? parseInt(pagaCon) : null,
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

      const { pedido_id, tracking_code, numero_pedido } = orderData;

      if (metodoPago === 'mercadopago') {
        const checkoutItems = cart.items.map((item) => ({
          title: item.nombre,
          quantity: item.cantidad,
          unit_price:
            item.precioUnitario + item.extras.reduce((s, e) => s + e.precio * (e.cantidad ?? 1), 0),
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
            phone: telefono.trim(),
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
      toast.success(`Pedido #${numero_pedido} confirmado`);
      localStorage.setItem('hoppiness_last_tracking', tracking_code);
      onConfirmed(tracking_code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear el pedido';
      toast.error('Error', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-bold text-sm text-foreground">Completá tus datos</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <p className="text-xs text-muted-foreground">
          {servicioLabel} · {branchName}
        </p>

        {/* Customer data */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Tus datos</h3>
          <div>
            <Label className="text-xs">Nombre *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => handleBlur('nombre')}
              placeholder="Tu nombre"
              className={`mt-1 h-8 text-sm ${touched.nombre && errors.nombre ? 'border-destructive' : ''}`}
            />
            {touched.nombre && <FieldError error={errors.nombre} />}
          </div>
          <div>
            <Label className="text-xs">Teléfono *</Label>
            <Input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onBlur={() => handleBlur('telefono')}
              placeholder="3511234567"
              inputMode="tel"
              className={`mt-1 h-8 text-sm ${touched.telefono && errors.telefono ? 'border-destructive' : ''}`}
            />
            {touched.telefono && <FieldError error={errors.telefono} />}
            {!touched.telefono || !errors.telefono ? (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Sin 0 ni +54 — ej: 3511234567
              </p>
            ) : null}
          </div>
          <div>
            <Label className="text-xs">Email (opcional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="tu@email.com"
              className={`mt-1 h-8 text-sm ${touched.email && errors.email ? 'border-destructive' : ''}`}
            />
            {touched.email && <FieldError error={errors.email} />}
          </div>
        </div>

        {/* Delivery address */}
        {isDelivery && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground">Dirección de entrega</h3>

            {deliveryAddress && deliveryCalc?.available ? (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">
                    {deliveryAddress.formatted_address}
                  </span>
                  <button
                    onClick={() => {
                      setDeliveryAddress(null);
                      setDeliveryCalc(null);
                      setDireccion('');
                    }}
                    className="text-[10px] text-primary hover:underline shrink-0 ml-2"
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

                {savedAddresses.length > 0 && !deliveryAddress && (
                  <Select
                    value=""
                    onValueChange={(id) => {
                      const addr = savedAddresses.find((a) => a.id === id);
                      if (addr) {
                        setDireccion(addr.direccion);
                        setPiso(addr.piso || '');
                        setReferencia(addr.referencia || '');
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Dirección guardada" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.etiqueta} — {a.direccion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Piso / Depto</Label>
                <Input
                  value={piso}
                  onChange={(e) => setPiso(e.target.value)}
                  placeholder="3B"
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Referencia</Label>
                <Input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Edificio verde"
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <Label className="text-xs font-bold">Notas (opcional)</Label>
          <Textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: tocar timbre..."
            rows={2}
            className="resize-none mt-1 text-sm"
          />
        </div>

        {/* Payment method */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Método de pago</h3>
          {promoPayment.reason && (
            <p className="text-[11px] text-muted-foreground">{promoPayment.reason}</p>
          )}
          <RadioGroup
            value={metodoPago}
            onValueChange={(v) => setMetodoPago(v as MetodoPago)}
            className="space-y-1.5"
          >
            {mpEnabled && (
              <label
                className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                  metodoPago === 'mercadopago' ? 'border-primary bg-primary/5' : ''
                } ${!promoPayment.mpAllowed || promoPayment.hasCashOnly ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
              >
                <RadioGroupItem
                  value="mercadopago"
                  disabled={!promoPayment.mpAllowed || promoPayment.hasCashOnly}
                />
                <CreditCard className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs font-semibold">MercadoPago</p>
                  <p className="text-[10px] text-muted-foreground">Tarjeta, débito o billetera</p>
                </div>
              </label>
            )}
            <label
              className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                metodoPago === 'efectivo' ? 'border-primary bg-primary/5' : ''
              } ${!promoPayment.cashAllowed || promoPayment.hasDigitalOnly ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
            >
              <RadioGroupItem
                value="efectivo"
                disabled={!promoPayment.cashAllowed || promoPayment.hasDigitalOnly}
              />
              <Banknote className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs font-semibold">Efectivo</p>
                <p className="text-[10px] text-muted-foreground">
                  {isDelivery ? 'Pagás al recibir' : 'Pagás al retirar'}
                </p>
              </div>
            </label>
          </RadioGroup>

          {metodoPago === 'efectivo' && promoPayment.cashAllowed && (
            <div className="space-y-1.5 pl-1">
              <Label className="text-xs">¿Con cuánto pagás?</Label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setPagaCon('')}
                  className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    !pagaCon
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Justo
                </button>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setPagaCon(String(amt))}
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      pagaCon === String(amt)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
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
                className="h-7 text-xs"
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
        <div className="rounded-lg border p-3 bg-muted/30 space-y-1.5">
          <h3 className="text-xs font-bold">Resumen</h3>
          {cart.items.map((item) => {
            const ext = item.extras.reduce((s, e) => s + e.precio * (e.cantidad ?? 1), 0);
            return (
              <div key={item.cartId} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground truncate">
                  {item.cantidad}x {item.nombre}
                </span>
                <span className="font-medium shrink-0 ml-2">
                  {formatPrice((item.precioUnitario + ext) * item.cantidad)}
                </span>
              </div>
            );
          })}
          <div className="border-t pt-1.5 mt-1.5 space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(cart.totalPrecio)}</span>
            </div>
            {costoEnvio > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Envío</span>
                <span>{formatPrice(costoEnvio)}</span>
              </div>
            )}
            {promoDescuento > 0 && (
              <div className="flex justify-between text-[11px] text-success">
                <span>Descuento ({promoCode?.codigoText})</span>
                <span>-{formatPrice(promoDescuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold pt-1">
              <span>Total</span>
              <span>{formatPrice(totalConEnvio)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 bg-background space-y-2">
        {showMpConfirm && metodoPago === 'mercadopago' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-900">Te vamos a llevar a MercadoPago</p>
            <p className="text-[10px] text-blue-700">Vas a completar el pago de forma segura.</p>
          </div>
        )}
        <Button
          size="default"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm"
          disabled={!canSubmitWithRestrictions || submitting}
          onClick={handleConfirm}
        >
          {submitting && <DotsLoader />}
          {metodoPago === 'mercadopago'
            ? showMpConfirm
              ? `Ir a MercadoPago · ${formatPrice(totalConEnvio)}`
              : `Pagar ${formatPrice(totalConEnvio)}`
            : `Confirmar ${formatPrice(totalConEnvio)}`}
        </Button>
      </div>
    </>
  );
}
