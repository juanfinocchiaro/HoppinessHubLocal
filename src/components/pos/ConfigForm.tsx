import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Store,
  Utensils,
  Bike,
  ShoppingCart,
  Hash,
  FileText,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react';
import { fetchGoogleMapsApiKey, lookupProfileByPhone } from '@/services/posService';
import { AddressAutocomplete } from '@/components/webapp/AddressAutocomplete';
import type { AddressResult } from '@/types/webapp';
import { useCalculateDelivery } from '@/hooks/useDeliveryConfig';
import { useDebounce } from '@/hooks/useDebounce';
import { phoneVariants } from '@/lib/normalizePhone';
import type { CanalVenta, TipoServicio, CanalApp, TipoFactura, OrderConfig } from '@/types/pos';

const CANAL_OPTS: { value: CanalVenta; label: string; icon: React.ElementType }[] = [
  { value: 'mostrador', label: 'Mostrador', icon: Store },
  { value: 'apps', label: 'Apps Delivery', icon: Bike },
];

const TIPO_SERVICIO_OPTS: { value: TipoServicio; label: string; icon: React.ElementType }[] = [
  { value: 'takeaway', label: 'Para llevar', icon: ShoppingCart },
  { value: 'comer_aca', label: 'Comer acá', icon: Utensils },
  { value: 'delivery', label: 'Delivery', icon: Bike },
];

const CANAL_APP_OPTS: { value: CanalApp; label: string }[] = [
  { value: 'rappi', label: 'Rappi' },
  { value: 'pedidos_ya', label: 'Pedidos Ya' },
  { value: 'mp_delivery', label: 'MP Delivery' },
];

const CALLER_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

const TIPO_FACTURA_OPTS: { value: TipoFactura; label: string; short: string }[] = [
  { value: 'B', label: 'Factura B (CF / Mono)', short: 'B' },
  { value: 'A', label: 'Factura A (RI)', short: 'A' },
];

const APP_REF_DIGITS: Record<CanalApp, { maxLength: number; placeholder: string } | null> = {
  rappi: { maxLength: 6, placeholder: '6 dígitos' },
  mp_delivery: { maxLength: 3, placeholder: '3 dígitos' },
  pedidos_ya: null,
};

/** Parse a combined referenciaApp back into digits + name parts */
function parseRefParts(ref: string): { digits: string; name: string } {
  const trimmed = ref.trim();
  const match = trimmed.match(/^(\d+)\s*(.*)/);
  if (match) return { digits: match[1], name: match[2] };
  return { digits: '', name: trimmed };
}

export function ConfigForm({
  config,
  onChange,
  onConfirm,
  branchId,
  deliveryDisabled = false,
  deliveryDisabledReason = 'Configurá delivery en Caja para habilitar este canal.',
}: {
  config: OrderConfig;
  onChange: (config: OrderConfig) => void;
  onConfirm?: () => void;
  branchId?: string;
  deliveryDisabled?: boolean;
  deliveryDisabledReason?: string;
}) {
  const [receptorOpen, setReceptorOpen] = useState(false);

  // —— Delivery address autocomplete & zone validation ————————————————————
  const [deliveryAddress, setDeliveryAddress] = useState<AddressResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [deliveryCalc, setDeliveryCalc] = useState<{
    available: boolean;
    cost: number | null;
    estimated_delivery_min: number | null;
    reason?: string;
  } | null>(null);
  const calculateDelivery = useCalculateDelivery();

  const { data: googleApiKey } = useQuery({
    queryKey: ['google-maps-api-key-pos'],
    queryFn: fetchGoogleMapsApiKey,
    staleTime: 60 * 60 * 1000,
    enabled: config.tipoServicio === 'delivery' && config.canalVenta === 'mostrador',
  });

  const handleAddressSelect = (result: AddressResult | null) => {
    setDeliveryAddress(result);
    setDeliveryCalc(null);
    if (result) {
      onChange({ ...config, customerAddress: result.formatted_address });
    } else {
      onChange({ ...config, customerAddress: '', costoDelivery: 0 });
    }
  };

  useEffect(() => {
    if (!deliveryAddress || !branchId) return;
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
        onChange({
          ...config,
          costoDelivery: result.available && result.cost != null ? result.cost : 0,
        });
      })
      .catch(() => {
        setDeliveryCalc(null);
      })
      .finally(() => {
        setCalcLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryAddress, branchId]);

  useEffect(() => {
    if (config.tipoServicio !== 'delivery') {
      setDeliveryAddress(null);
      setDeliveryCalc(null);
    }
  }, [config.tipoServicio]);

  // —— Phone-based customer lookup ————————————————————————————————————————
  const debouncedPhone = useDebounce(config.customerPhone, 600);
  const [profileSuggestion, setProfileSuggestion] = useState<{
    id: string;
    full_name: string;
    phone: string;
  } | null>(null);
  const [lookingUpPhone, setLookingUpPhone] = useState(false);

  useEffect(() => {
    const phone = debouncedPhone?.trim();
    if (!phone || phone.length < 8) {
      setProfileSuggestion(null);
      return;
    }
    const variants = phoneVariants(phone);
    setLookingUpPhone(true);
    lookupProfileByPhone(variants)
      .then((data) => {
        setProfileSuggestion(data);
      })
      .catch(() => setProfileSuggestion(null))
      .finally(() => setLookingUpPhone(false));
  }, [debouncedPhone]);

  const parsed = parseRefParts(config.referenciaApp);
  const [refDigits, setRefDigits] = useState(parsed.digits);
  const [refName, setRefName] = useState(parsed.name);

  const set = (partial: Partial<OrderConfig>) => {
    if (partial.tipoFactura && partial.tipoFactura !== config.tipoFactura) {
      setReceptorOpen(false);
    }
    onChange({ ...config, ...partial });
  };

  useEffect(() => {
    const p = parseRefParts(config.referenciaApp);
    setRefDigits(p.digits);
    setRefName(p.name);
  }, [config.canalApp, config.referenciaApp]);

  const updateRef = (digits: string, name: string) => {
    setRefDigits(digits);
    setRefName(name);
    const combined = [digits, name].filter(Boolean).join(' ');
    set({ referenciaApp: combined });
  };

  return (
    <div className="space-y-4">
      {/* Canal: Mostrador | Apps */}
      <div className="space-y-2">
        <Label className="text-xs">Canal de venta</Label>
        <div className="flex gap-2 flex-wrap">
          {CANAL_OPTS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={config.canalVenta === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => set({ canalVenta: opt.value })}
              className="flex-1 min-w-0"
            >
              <opt.icon className="w-4 h-4 mr-1.5 shrink-0" />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {config.canalVenta === 'mostrador' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Tipo de servicio</Label>
            <div className="flex gap-2 flex-wrap">
              {TIPO_SERVICIO_OPTS.map((opt) => {
                const isDelivery = opt.value === 'delivery';
                const isDisabled = isDelivery && deliveryDisabled;
                const btn = (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={config.tipoServicio === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => !isDisabled && set({ tipoServicio: opt.value })}
                    disabled={isDisabled}
                    className={isDisabled ? 'opacity-60' : ''}
                  >
                    <opt.icon className="w-3.5 h-3.5 mr-1" />
                    {opt.label}
                  </Button>
                );
                return isDisabled ? (
                  <Tooltip key={opt.value}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {deliveryDisabledReason}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  btn
                );
              })}
            </div>
          </div>

          {(config.tipoServicio === 'comer_aca' || config.tipoServicio === 'takeaway') && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Número de llamador
              </Label>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                {CALLER_NUMBERS.map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant={config.numeroLlamador === String(num) ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => {
                      const updates: Partial<OrderConfig> = { numeroLlamador: String(num) };
                      if (!config.customerName || config.customerName.startsWith('Llamador #')) {
                        updates.customerName = `Llamador #${num}`;
                      }
                      set(updates);
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <div className="pt-1">
                <Label className="text-xs text-muted-foreground">Nombre (opcional)</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={
                    config.clienteNombre?.startsWith('Llamador #')
                      ? ''
                      : (config.clienteNombre ?? '')
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    set({
                      clienteNombre:
                        v || (config.numeroLlamador ? `Llamador #${config.numeroLlamador}` : ''),
                    });
                  }}
                  className="h-9 mt-1"
                />
              </div>
            </div>
          )}

          {config.tipoServicio === 'delivery' && (
            <div className="space-y-3">
              {/* Teléfono — con lookup de cliente */}
              <div>
                <Label className="text-xs">Teléfono *</Label>
                <div className="relative mt-1">
                  <Input
                    placeholder="Ej: 3511234567"
                    value={config.clienteTelefono}
                    onChange={(e) => {
                      set({ clienteTelefono: e.target.value, clienteUserId: undefined });
                      setProfileSuggestion(null);
                    }}
                    className="h-9 pr-8"
                    inputMode="tel"
                  />
                  {lookingUpPhone && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {profileSuggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      set({
                        clienteNombre: profileSuggestion.full_name,
                        clienteUserId: profileSuggestion.id,
                      });
                      setProfileSuggestion(null);
                    }}
                    className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <User className="h-3 w-3" />
                    ¿Es <strong>{profileSuggestion.full_name}</strong>? Clic para completar nombre
                  </button>
                )}
              </div>

              {/* Nombre */}
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input
                  placeholder="Cliente"
                  value={config.clienteNombre}
                  onChange={(e) => set({ clienteNombre: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>

              {/* Dirección — con Google Places autocomplete */}
              <div>
                {googleApiKey !== undefined ? (
                  <AddressAutocomplete
                    apiKey={googleApiKey}
                    onSelect={handleAddressSelect}
                    selectedAddress={deliveryAddress}
                  />
                ) : (
                  <>
                    <Label className="text-xs">Dirección *</Label>
                    <Input
                      placeholder="Dirección de entrega"
                      value={config.clienteDireccion}
                      onChange={(e) => set({ clienteDireccion: e.target.value })}
                      className="h-9 mt-1"
                    />
                  </>
                )}
              </div>

              {/* Estado de zona de entrega */}
              {calcLoading && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verificando zona de entrega...
                </div>
              )}
              {!calcLoading && deliveryCalc && deliveryCalc.available && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  En zona · Envío ${(deliveryCalc.cost ?? 0).toLocaleString('es-AR')}
                  {deliveryCalc.estimated_delivery_min
                    ? ` · ~${deliveryCalc.estimated_delivery_min} min`
                    : ''}
                </div>
              )}
              {!calcLoading && deliveryCalc && !deliveryCalc.available && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {deliveryCalc.reason === 'out_of_radius' && 'Fuera del radio de entrega'}
                  {deliveryCalc.reason === 'blocked_zone' && 'Zona bloqueada por seguridad'}
                  {deliveryCalc.reason === 'delivery_disabled' && 'Delivery no disponible ahora'}
                  {deliveryCalc.reason === 'outside_hours' && 'Fuera del horario de delivery'}
                  {deliveryCalc.reason === 'assigned_other_branch' &&
                    'Zona asignada a otra sucursal'}
                  {!deliveryCalc.reason && 'No se puede hacer delivery a esta dirección'}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {config.canalVenta === 'apps' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Plataforma</Label>
            <div className="flex gap-2 flex-wrap">
              {CANAL_APP_OPTS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={config.canalApp === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => set({ canalApp: opt.value })}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> Referencia del pedido
            </Label>
            {APP_REF_DIGITS[config.canalApp] ? (
              <div className="flex gap-2">
                <Input
                  placeholder={APP_REF_DIGITS[config.canalApp]!.placeholder}
                  value={refDigits}
                  onChange={(e) => {
                    const v = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, APP_REF_DIGITS[config.canalApp]!.maxLength);
                    updateRef(v, refName);
                  }}
                  className="h-9 w-28 shrink-0"
                  inputMode="numeric"
                />
                <Input
                  placeholder="Nombre"
                  value={refName}
                  onChange={(e) => updateRef(refDigits, e.target.value)}
                  className="h-9 flex-1"
                />
              </div>
            ) : (
              <Input
                placeholder="Nombre de la persona"
                value={config.referenciaApp}
                onChange={(e) => set({ referenciaApp: e.target.value })}
                className="h-9"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Costo envío cobrado al cliente ($)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="0"
              value={config.costoDelivery ?? 0}
              onChange={(e) => set({ costoDelivery: Math.max(0, Number(e.target.value) || 0) })}
              className="h-9"
            />
          </div>
        </>
      )}

      {/* Tipo de factura - solo mostrador (apps siempre CF) */}
      {config.canalVenta === 'mostrador' && (
        <div className="space-y-2 border-t pt-4 mt-2">
          <Label className="text-xs flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Comprobante
          </Label>
          <div className="flex gap-2 flex-wrap">
            {TIPO_FACTURA_OPTS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={config.tipoFactura === opt.value ? 'default' : 'outline'}
                size="sm"
                className="flex-1 min-w-0"
                onClick={() =>
                  set({
                    tipoFactura: opt.value,
                  })
                }
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {config.tipoFactura === 'A' && (
            <div className="space-y-2 mt-2 p-3 rounded-md bg-muted/50 border">
              <div>
                <Label className="text-xs">CUIT *</Label>
                <Input
                  placeholder="20-12345678-9"
                  value={config.receptorCuit}
                  onChange={(e) => set({ receptorCuit: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Razón Social *</Label>
                <Input
                  placeholder="Nombre o razón social"
                  value={config.receptorRazonSocial}
                  onChange={(e) => set({ receptorRazonSocial: e.target.value })}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email (opcional)</Label>
                <Input
                  placeholder="email@ejemplo.com"
                  value={config.receptorEmail}
                  onChange={(e) => set({ receptorEmail: e.target.value })}
                  className="h-9 mt-1"
                  type="email"
                />
              </div>
            </div>
          )}

          {config.tipoFactura === 'B' && (
            <Collapsible open={receptorOpen} onOpenChange={setReceptorOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 gap-1.5 text-xs text-muted-foreground w-full justify-start"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${receptorOpen ? '' : '-rotate-90'}`}
                  />
                  Datos del receptor (opcional)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-1 p-3 rounded-md bg-muted/50 border">
                  <div>
                    <Label className="text-xs">CUIT (opcional)</Label>
                    <Input
                      placeholder="20-12345678-9"
                      value={config.receptorCuit}
                      onChange={(e) => set({ receptorCuit: e.target.value })}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Razón Social (opcional)</Label>
                    <Input
                      placeholder="Nombre o razón social"
                      value={config.receptorRazonSocial}
                      onChange={(e) => set({ receptorRazonSocial: e.target.value })}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email (opcional)</Label>
                    <Input
                      placeholder="email@ejemplo.com"
                      value={config.receptorEmail}
                      onChange={(e) => set({ receptorEmail: e.target.value })}
                      className="h-9 mt-1"
                      type="email"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {onConfirm && (
        <Button size="lg" className="w-full" onClick={onConfirm}>
          Comenzar venta
        </Button>
      )}
    </div>
  );
}
