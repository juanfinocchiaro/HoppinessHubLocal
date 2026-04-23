import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Navigation, CheckCircle2, AlertCircle, Bike } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';

interface TrackingInfo {
  tracking_token: string;
  pedido: {
    order_number: number;
    customer_name: string | null;
    customer_address: string | null;
    customer_phone: string | null;
    status: string;
  };
  branch: { name: string; address: string | null };
  tracking_started: boolean;
  tracking_completed: boolean;
}

type PageState = 'loading' | 'ready' | 'tracking' | 'completed' | 'error';

export default function CadeteTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPos = useRef<{ lat: number; lng: number } | null>(null);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const callApi = useCallback(
    async (method: string, body?: unknown) => {
      const url =
        method === 'GET'
          ? `${baseUrl}/functions/v1/delivery-tracking?token=${token}`
          : `${baseUrl}/functions/v1/delivery-tracking`;

      const res = await fetch(url, {
        method,
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      return res.json();
    },
    [baseUrl, apiKey, token],
  );

  useEffect(() => {
    if (!token) return;

    callApi('GET')
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setPageState('error');
          return;
        }
        setInfo(data);
        if (data.tracking_completed) {
          setPageState('completed');
        } else if (data.tracking_started) {
          setPageState('tracking');
          startGeolocation();
        } else {
          setPageState('ready');
        }
      })
      .catch(() => {
        setError('No se pudo cargar la información');
        setPageState('error');
      });

    return () => stopGeolocation();
  }, [token]);

  const startGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu dispositivo no soporta geolocalización');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Permiso de ubicación denegado. Activalo en la configuración del navegador.');
        } else {
          setGeoError('No se pudo obtener la ubicación');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    intervalRef.current = setInterval(async () => {
      if (!latestPos.current) return;
      try {
        await callApi('POST', {
          token,
          lat: latestPos.current.lat,
          lng: latestPos.current.lng,
          action: 'update',
        });
        setLastUpdate(new Date());
      } catch {
        /* silently retry next interval */
      }
    }, 10000);
  };

  const stopGeolocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStart = async () => {
    if (!navigator.geolocation) {
      setGeoError('Tu dispositivo no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        latestPos.current = { lat, lng };

        const result = await callApi('POST', { token, lat, lng, action: 'start' });
        if (result.error) {
          setError(result.error);
          return;
        }
        setPageState('tracking');
        startGeolocation();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Necesitamos acceso a tu ubicación para el rastreo. Activalo en la configuración del navegador.',
          );
        } else {
          setGeoError('No se pudo obtener la ubicación. Intentá de nuevo.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleComplete = async () => {
    const pos = latestPos.current;
    const result = await callApi('POST', {
      token,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      action: 'complete',
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    stopGeolocation();
    setPageState('completed');
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SpinnerLoader size="lg" text="Cargando rastreo..." />
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Error</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Rastreo de envío | Hoppiness" />

      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bike className="w-6 h-6" />
          <span className="text-sm opacity-80">{info?.branch.name}</span>
        </div>
        <h1 className="text-2xl font-black">Pedido #{info?.pedido.order_number}</h1>
        <p className="text-sm opacity-80 mt-1">Rastreo de envío</p>
      </div>

      <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">
        {/* Delivery info */}
        <div className="rounded-xl border p-4 space-y-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Datos de entrega
          </h3>
          {info?.pedido.customer_name && <p className="text-sm">{info.pedido.customer_name}</p>}
          {info?.pedido.customer_address && (
            <p className="text-sm text-muted-foreground">{info.pedido.customer_address}</p>
          )}
          {info?.pedido.customer_phone && (
            <a
              href={`tel:${info.pedido.customer_phone}`}
              className="text-sm text-primary underline"
            >
              {info.pedido.customer_phone}
            </a>
          )}
        </div>

        {/* State-dependent content */}
        {pageState === 'ready' && (
          <div className="space-y-4">
            <div className="bg-accent/10 rounded-xl p-5 text-center space-y-3">
              <Navigation className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Al iniciar el rastreo, el cliente podrá ver tu ubicación en tiempo real.
              </p>
            </div>
            {geoError && (
              <div className="bg-destructive/10 rounded-xl p-3 text-center">
                <p className="text-sm text-destructive">{geoError}</p>
              </div>
            )}
            <Button onClick={handleStart} className="w-full h-14 text-lg font-bold" size="lg">
              <Navigation className="w-5 h-5 mr-2" />
              INICIAR RASTREO
            </Button>
          </div>
        )}

        {pageState === 'tracking' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-5 text-center space-y-2">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Rastreo activo
              </p>
              <p className="text-xs text-muted-foreground">
                Tu ubicación se está enviando al cliente
              </p>
              {lastUpdate && (
                <p className="text-xs text-muted-foreground">
                  Última actualización:{' '}
                  {lastUpdate.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              )}
            </div>
            {geoError && (
              <div className="bg-destructive/10 rounded-xl p-3 text-center">
                <p className="text-sm text-destructive">{geoError}</p>
              </div>
            )}
            <Button
              onClick={handleComplete}
              className="w-full h-14 text-lg font-bold bg-success hover:bg-success/90"
              size="lg"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              LLEGUÉ - ENTREGAR
            </Button>
          </div>
        )}

        {pageState === 'completed' && (
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-bold text-success dark:text-green-400">
              Entrega completada
            </h2>
            <p className="text-sm text-muted-foreground">
              El envío fue marcado como entregado. Podés cerrar esta página.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
