import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Custom marker SVGs ──────────────────────────────────────────

const storeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="22" fill="#16a34a" stroke="#fff" stroke-width="3"/>
  <text x="24" y="30" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff" font-family="sans-serif">H</text>
</svg>`;

const houseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="22" fill="#3b82f6" stroke="#fff" stroke-width="3"/>
  <path d="M24 14 L36 24 L33 24 L33 34 L27 34 L27 28 L21 28 L21 34 L15 34 L15 24 L12 24 Z" fill="#fff"/>
</svg>`;

const motoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width="56" height="56">
  <circle cx="28" cy="28" r="26" fill="#16a34a" stroke="#fff" stroke-width="3"/>
  <g transform="translate(12,14)" fill="#fff">
    <circle cx="6" cy="20" r="4" fill="none" stroke="#fff" stroke-width="2"/>
    <circle cx="26" cy="20" r="4" fill="none" stroke="#fff" stroke-width="2"/>
    <path d="M6 20 L10 12 L18 10 L22 6 L28 6 L26 10 L20 12 L22 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="16" y="4" width="8" height="3" rx="1" fill="#fff"/>
  </g>
</svg>`;

function svgToIcon(svg: string, size: [number, number]): L.DivIcon {
  return L.divIcon({
    html: svg,
    className: 'delivery-tracking-marker',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
}

// ── Auto-fit bounds ─────────────────────────────────────────────

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length >= 2 && !fitted.current) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      fitted.current = true;
    }
  }, [points, map]);

  return null;
}

// ── Animate marker ──────────────────────────────────────────────

function AnimatedMarker({
  position,
  icon,
  popup,
}: {
  position: [number, number];
  icon: L.DivIcon;
  popup?: string;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setLatLng(position);
    }
  }, [position]);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      {popup && <Popup>{popup}</Popup>}
    </Marker>
  );
}

// ── Main component ──────────────────────────────────────────────

interface DeliveryTrackingMapProps {
  storeLat: number;
  storeLng: number;
  destLat: number;
  destLng: number;
  cadeteLat: number | null;
  cadeteLng: number | null;
  trackingActive: boolean;
  branchName?: string;
}

export function DeliveryTrackingMap({
  storeLat,
  storeLng,
  destLat,
  destLng,
  cadeteLat,
  cadeteLng,
  trackingActive,
  branchName,
}: DeliveryTrackingMapProps) {
  const storeIcon = useMemo(() => svgToIcon(storeSvg, [48, 48]), []);
  const houseIcon = useMemo(() => svgToIcon(houseSvg, [48, 48]), []);
  const motoIcon = useMemo(() => svgToIcon(motoSvg, [56, 56]), []);

  const center: [number, number] = [(storeLat + destLat) / 2, (storeLng + destLng) / 2];

  const fitPoints: [number, number][] = [
    [storeLat, storeLng],
    [destLat, destLng],
  ];
  if (cadeteLat != null && cadeteLng != null) {
    fitPoints.push([cadeteLat, cadeteLng]);
  }

  return (
    <div className="rounded-xl overflow-hidden border" style={{ height: 280 }}>
      <style>{`
        .delivery-tracking-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        dragging={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />

        {/* Store marker */}
        <Marker position={[storeLat, storeLng]} icon={storeIcon}>
          <Popup>{branchName || 'Hoppiness'}</Popup>
        </Marker>

        {/* Customer house marker */}
        <Marker position={[destLat, destLng]} icon={houseIcon}>
          <Popup>Tu ubicación</Popup>
        </Marker>

        {/* Cadete motorcycle marker */}
        {trackingActive && cadeteLat != null && cadeteLng != null && (
          <AnimatedMarker
            position={[cadeteLat, cadeteLng]}
            icon={motoIcon}
            popup="Tu pedido va en camino"
          />
        )}
      </MapContainer>
    </div>
  );
}
