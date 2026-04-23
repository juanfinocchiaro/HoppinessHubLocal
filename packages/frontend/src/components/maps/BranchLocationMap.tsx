import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Navigation } from 'lucide-react';
import { devWarn } from '@/lib/errorHandler';
import { toast } from 'sonner';
import logoHoppiness from '@/assets/logo-hoppiness.png';
import { getSession } from '@/services/authService';

const libraries: 'places'[] = ['places'];

interface BranchLocationMapProps {
  placeId: string;
  latitude: string;
  longitude: string;
  onLocated: (lat: string, lng: string) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '250px',
};

const defaultCenter = {
  lat: -31.4201,
  lng: -64.1888,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

function BranchLocationMapInner({
  apiKey,
  placeId,
  latitude,
  longitude,
  onLocated,
}: BranchLocationMapProps & { apiKey: string }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [locating, setLocating] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMarkerPosition({ lat, lng });
      }
    }
  }, [latitude, longitude]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (markerPosition) {
        map.setCenter(markerPosition);
        map.setZoom(16);
      }
    },
    [markerPosition],
  );

  const sanitizePlaceId = (raw: string) => raw.trim().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');

  const locateByPlaceId = useCallback(() => {
    const cleanId = sanitizePlaceId(placeId);
    if (!mapRef.current || !cleanId) {
      toast.error('Ingresá un Google Place ID primero');
      return;
    }

    setLocating(true);
    const service = new google.maps.places.PlacesService(mapRef.current);

    service.getDetails({ placeId: cleanId, fields: ['geometry', 'name'] }, (place, status) => {
      setLocating(false);

      if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        setMarkerPosition({ lat, lng });
        onLocated(lat.toFixed(7), lng.toFixed(7));

        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(16);
        }

        const nameHint = place.name ? ` (${place.name})` : '';
        toast.success(`Ubicación encontrada${nameHint}`);
      } else {
        devWarn('PlacesService.getDetails failed', { status, placeId: cleanId });

        const statusMessages: Record<string, string> = {
          INVALID_REQUEST: 'El Place ID tiene un formato inválido.',
          NOT_FOUND: 'No se encontró el Place ID. Verificá que sea correcto.',
          OVER_QUERY_LIMIT: 'Se superó el límite de consultas. Intentá en unos minutos.',
          REQUEST_DENIED:
            'La API de Places no está habilitada en la API Key. Habilitá "Places API" en Google Cloud Console.',
          ZERO_RESULTS: 'No se encontraron resultados para ese Place ID.',
        };
        const msg = statusMessages[status] || `Error al buscar el Place ID (${status}).`;
        toast.error(msg);
      }
    });
  }, [placeId, onLocated]);

  const center = markerPosition || defaultCenter;
  const zoom = markerPosition ? 16 : 12;

  if (loadError) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-destructive text-sm">Error al cargar el mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={locateByPlaceId}
          disabled={locating || !placeId.trim()}
          className="gap-1.5"
        >
          {locating ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Navigation className="h-3 w-3" />
          )}
          Ubicar
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {markerPosition && (
            <OverlayView
              position={markerPosition}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={() => ({ x: -20, y: -20 })}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <img
                  src={logoHoppiness}
                  alt="Hoppiness Club"
                  className="w-full h-full object-cover"
                />
              </div>
            </OverlayView>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

export default function BranchLocationMap(props: BranchLocationMapProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchApiKey = async () => {
      setLoadingKey(true);
      setError(false);

      try {
        const {
          data: { session },
        } = await getSession();

        if (!session) {
          devWarn('No authenticated session for Google Maps API');
          setError(true);
          setLoadingKey(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-maps-key`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        devWarn('Error fetching Google Maps API key:', err);
        setError(true);
      } finally {
        setLoadingKey(false);
      }
    };
    fetchApiKey();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (loadingKey) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey || error) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <MapPin className="h-8 w-8 opacity-50" />
        <p className="text-sm">Mapa no disponible</p>
        <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5">
          <RefreshCw className="h-3 w-3" />
          Reintentar
        </Button>
      </div>
    );
  }

  return <BranchLocationMapInner {...props} apiKey={apiKey} />;
}
