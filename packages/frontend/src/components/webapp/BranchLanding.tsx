import { useState, useEffect } from "react";
import { MapPin, Clock, Truck, ShoppingBag, Pause, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WebappConfig, TipoServicioWebapp } from "@/types/webapp";
import { WebappHeader } from "./WebappHeader";
import { StaticBranchMap } from "./StaticBranchMap";
import { AddressAutocomplete } from "./AddressAutocomplete";
import type { AddressResult } from "@/types/webapp";
import { DeliveryCostDisplay, DeliveryCostLoading } from "./DeliveryCostDisplay";
import { DeliveryUnavailable } from "./DeliveryUnavailable";
import { useDynamicPrepTime } from "@/hooks/useDeliveryConfig";
import { useCalculateDelivery } from "@/hooks/useDeliveryConfig";
import type { DeliveryCalcResult } from "@/types/webapp";
import { formatPrice } from "@/lib/formatters";

interface Props {
  branch: {
    name: string;
    address: string;
    city: string;
    opening_time: string | null;
    closing_time: string | null;
    latitude?: number | null;
    longitude?: number | null;
    public_hours?: any;
    id?: string;
    google_place_id?: string | null;
  };
  config: WebappConfig;
  onSelectService: (tipo: TipoServicioWebapp) => void;
  onViewMenu: () => void;
  onBack?: () => void;
  branchId?: string;
  googleApiKey?: string | null;
  onDeliveryValidated?: (address: AddressResult, calc: DeliveryCalcResult) => void;
  initialDeliveryAddress?: AddressResult | null;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const parts = time.split(":");
  return `${parts[0]}:${parts[1]}`;
}

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getTodayIdx() {
  const today = new Date().getDay();
  return today === 0 ? 6 : today - 1;
}

function getTodayHours(publicHours: any) {
  if (!publicHours) return null;
  const idx = getTodayIdx();
  const day = Array.isArray(publicHours) ? publicHours[idx] : publicHours[String(idx)];
  if (!day) return null;
  const open = day?.opens || day?.open || day?.apertura;
  const close = day?.closes || day?.close || day?.cierre;
  const isClosed = day?.closed || day?.cerrado || (!open && !close);
  return { open, close, isClosed };
}

function WeeklySchedule({ publicHours }: { publicHours: any }) {
  if (!publicHours) return null;
  const asArray = Array.isArray(publicHours)
    ? publicHours
    : DAY_NAMES.map((_, i) => publicHours[String(i)]).filter(Boolean);
  if (asArray.length === 0) return null;
  const todayIdx = getTodayIdx();

  return (
    <div className="w-full space-y-1.5 mt-2">
      {asArray.map((day: any, idx: number) => {
        const isToday = idx === todayIdx;
        const label = DAY_SHORT[idx] || `Día ${idx + 1}`;
        const open = day?.opens || day?.open || day?.apertura;
        const close = day?.closes || day?.close || day?.cierre;
        const isClosed = day?.closed || day?.cerrado || (!open && !close);

        return (
          <div
            key={idx}
            className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
              isToday ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground"
            }`}
          >
            <span>
              {label}
              {isToday ? " (hoy)" : ""}
            </span>
            <span>{isClosed ? "Cerrado" : `${formatTime(open)} - ${formatTime(close)}`}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BranchLanding({
  branch,
  config,
  onSelectService,
  onViewMenu,
  onBack,
  branchId,
  googleApiKey,
  onDeliveryValidated,
  initialDeliveryAddress,
}: Props) {
  const [showWeek, setShowWeek] = useState(false);
  const resolvedBranchId = branchId || branch.id;
  const isOpen = config.status === "abierto";
  const isPaused = config.status === "pausado";
  const hasCoords = branch.latitude != null && branch.longitude != null;
  const mapsUrl = branch.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${branch.google_place_id}`
    : hasCoords
      ? `https://maps.google.com/?q=${branch.latitude},${branch.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(branch.address + ", " + branch.city)}`;
  const todayHours = getTodayHours(branch.public_hours);

  // Dynamic ETA
  const { data: retiroEta } = useDynamicPrepTime(resolvedBranchId, "retiro");
  const { data: deliveryEta } = useDynamicPrepTime(resolvedBranchId, "delivery");
  const retiroTime = retiroEta?.prep_time_min ?? config.tiempo_estimado_retiro_min;
  const deliveryTime = deliveryEta?.prep_time_min ?? config.tiempo_estimado_delivery_min;
  const retiroHighDemand = (retiroEta?.active_orders ?? 0) >= 5;
  const deliveryHighDemand = (deliveryEta?.active_orders ?? 0) >= 5;

  // Delivery address pre-validation
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<AddressResult | null>(initialDeliveryAddress ?? null);
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryCalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const calculateDelivery = useCalculateDelivery();

  useEffect(() => {
    if (!deliveryAddress || !resolvedBranchId) {
      setDeliveryCalc(null);
      return;
    }
    setCalcLoading(true);
    calculateDelivery
      .mutateAsync({
        branch_id: resolvedBranchId,
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
  }, [deliveryAddress, resolvedBranchId]);

  const handleDeliveryClick = () => {
    setShowAddressInput(true);
  };

  const handleAddressSelect = (result: AddressResult | null) => {
    setDeliveryAddress(result);
    if (!result) {
      setDeliveryCalc(null);
    }
  };

  const handleProceedToMenu = () => {
    if (deliveryAddress && deliveryCalc?.available) {
      onDeliveryValidated?.(deliveryAddress, deliveryCalc);
      onSelectService("delivery");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <WebappHeader title={branch.name} showBack={!!onBack} onBack={onBack} />

      {/* Branch info */}
      <div className="border-b bg-background px-6 py-6 lg:py-8 text-center">
        <h2 className="text-2xl lg:text-3xl font-black font-brand tracking-tight text-foreground">{branch.name}</h2>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5 hover:text-primary transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="underline-offset-2 hover:underline">
            {branch.address}, {branch.city}
          </span>
        </a>

        {/* Status badge */}
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div className="inline-flex">
            {isOpen && (
              <span className="flex items-center gap-2 text-sm font-semibold bg-green-50 text-green-700 border border-green-200 px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Abierto
              </span>
            )}
            {isPaused && (
              <span className="flex items-center gap-2 text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-full">
                <Pause className="w-3.5 h-3.5" />
                Pausado temporalmente
              </span>
            )}
            {!isOpen && !isPaused && (
              <span className="flex items-center gap-2 text-sm font-semibold bg-muted text-muted-foreground border px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Cerrado
                {branch.opening_time && <span>· Abre {formatTime(branch.opening_time)}</span>}
              </span>
            )}
          </div>

          {/* Today's hours */}
          {todayHours && (
            <p className="text-xs text-muted-foreground">
              Hoy:{" "}
              {todayHours.isClosed ? "Cerrado" : `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`}
            </p>
          )}

          {/* Toggle weekly schedule */}
          {branch.public_hours && (
            <>
              <button
                onClick={() => setShowWeek((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {showWeek ? "Ocultar horarios" : "Ver horarios"}
                {showWeek ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showWeek && (
                <div className="w-full max-w-xs mx-auto">
                  <WeeklySchedule publicHours={branch.public_hours} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Map with Hoppiness pin */}
        {hasCoords && (
          <div className="mt-4 max-w-sm mx-auto w-full">
            <StaticBranchMap
              latitude={branch.latitude!}
              longitude={branch.longitude!}
              mapsUrl={mapsUrl}
              height={160}
              linkLabel="Cómo llegar"
            />
          </div>
        )}
      </div>

      {/* Service selection */}
      <div className="flex-1 flex flex-col items-center px-6 py-8 max-w-lg mx-auto w-full">
        {isOpen ? (
          <div className="w-full bg-card rounded-xl shadow-sm border p-5 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">Servicios disponibles</h3>
              <p className="text-sm text-muted-foreground">¿Cómo querés tu pedido?</p>
            </div>

            {config.retiro_habilitado && (
              <button
                onClick={() => onSelectService("retiro")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Retiro en local</p>
                  <p className="text-xs text-muted-foreground">Paso a buscarlo</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />~{retiroTime} min
                  </div>
                  {retiroHighDemand && <p className="text-[10px] text-amber-600 font-medium mt-0.5">Alta demanda</p>}
                </div>
              </button>
            )}

            {config.delivery_habilitado && !showAddressInput && (
              <button
                onClick={handleDeliveryClick}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                  <Truck className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Delivery</p>
                  <p className="text-xs text-muted-foreground">Que me lo traigan</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />~{deliveryTime} min
                  </div>
                  {deliveryHighDemand && <p className="text-[10px] text-amber-600 font-medium mt-0.5">Alta demanda</p>}
                </div>
              </button>
            )}

            {/* Delivery address pre-validation */}
            {config.delivery_habilitado && showAddressInput && (
              <div className="w-full rounded-xl border-2 border-accent/50 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-accent" />
                  <p className="font-bold text-foreground text-sm">Delivery</p>
                </div>

                <AddressAutocomplete
                  apiKey={googleApiKey ?? null}
                  onSelect={handleAddressSelect}
                  selectedAddress={deliveryAddress}
                />

                {calcLoading && <DeliveryCostLoading />}

                {deliveryCalc && deliveryCalc.available && deliveryCalc.cost != null && (
                  <>
                    <DeliveryCostDisplay
                      cost={deliveryCalc.cost}
                      distanceKm={deliveryCalc.distance_km!}
                      estimatedDeliveryMin={deliveryCalc.estimated_delivery_min!}
                      disclaimer={deliveryCalc.disclaimer}
                    />
                    <Button
                      size="lg"
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2"
                      onClick={handleProceedToMenu}
                    >
                      Ver menú
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {deliveryCalc && !deliveryCalc.available && (
                  <DeliveryUnavailable
                    onSwitchToPickup={() => {
                      setShowAddressInput(false);
                      setDeliveryAddress(null);
                      setDeliveryCalc(null);
                      onSelectService("retiro");
                    }}
                    onChangeAddress={() => {
                      setDeliveryAddress(null);
                      setDeliveryCalc(null);
                    }}
                    reason={deliveryCalc.reason}
                    suggestedBranch={deliveryCalc.suggested_branch}
                  />
                )}

                <button
                  onClick={() => {
                    setShowAddressInput(false);
                    setDeliveryAddress(null);
                    setDeliveryCalc(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                >
                  Cancelar
                </button>
              </div>
            )}

            {config.delivery_pedido_minimo != null &&
              config.delivery_pedido_minimo > 0 &&
              config.delivery_habilitado && (
                <p className="text-center text-[11px] text-muted-foreground pt-1">
                  Pedido mínimo delivery: {formatPrice(config.delivery_pedido_minimo)}
                </p>
              )}
          </div>
        ) : (
          <div className="w-full bg-card rounded-xl shadow-sm border p-6 text-center space-y-4">
            {isPaused && config.mensaje_pausa && (
              <p className="text-sm text-muted-foreground">{config.mensaje_pausa}</p>
            )}
            {!isPaused && (
              <p className="text-sm text-muted-foreground">Este local no está recibiendo pedidos en este momento.</p>
            )}

            <Button variant="outline" onClick={onViewMenu} className="w-full">
              Ver menú igualmente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
