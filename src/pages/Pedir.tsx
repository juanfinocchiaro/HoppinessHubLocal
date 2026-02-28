import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Pause, RefreshCw } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchesForPedir } from '@/services/publicBranchService';
import { WebappHeader } from '@/components/webapp/WebappHeader';
import { StaticBranchMap } from '@/components/webapp/StaticBranchMap';
import { SEO } from '@/components/SEO';

interface BranchWithWebapp {
  id: string;
  name: string;
  address: string;
  city: string;
  slug: string | null;
  public_status: string | null;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_time: string | null;
  closing_time: string | null;
  public_hours: Record<string, { opens?: string; closes?: string; closed?: boolean }> | null;

  webapp_activa: boolean;
  estado: string;
  delivery_habilitado: boolean;
  retiro_habilitado: boolean;
  delivery_costo: number | null;
  tiempo_retiro: number | null;
  tiempo_delivery: number | null;
}

/** Monday-based index: 0=Mon..6=Sun â€” canonical for public_hours keys */
function getMondayBasedDayIdx(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Returns true if current time is within branch opening hours (for branches without webapp). */
function isBranchOpenBySchedule(
  branch: Pick<BranchWithWebapp, 'opening_time' | 'closing_time' | 'public_hours'>,
): boolean {
  const now = new Date();
  const dayKey = String(getMondayBasedDayIdx());
  const toMinutes = (t: string) => {
    const parts = (t || '').trim().split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h * 60 + m;
  };
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Support both Record and Array formats
  const ph = Array.isArray(branch.public_hours)
    ? branch.public_hours[getMondayBasedDayIdx()]
    : branch.public_hours?.[dayKey];
  if (ph && typeof ph === 'object') {
    if (ph.closed || (ph as any).cerrado) return false;
    const opens =
      ph.opens ?? (ph as any).open ?? (ph as any).apertura ?? branch.opening_time ?? '09:00';
    const closes =
      ph.closes ?? (ph as any).close ?? (ph as any).cierre ?? branch.closing_time ?? '23:00';
    const openMin = toMinutes(opens);
    let closeMin = toMinutes(closes);
    if (closeMin <= openMin) closeMin += 24 * 60;
    const nowMinNorm = nowMin < openMin ? nowMin + 24 * 60 : nowMin;
    return nowMinNorm >= openMin && nowMinNorm < closeMin;
  }

  const opens = branch.opening_time ?? '09:00';
  const closes = branch.closing_time ?? '23:00';
  const openMin = toMinutes(opens);
  let closeMin = toMinutes(closes);
  if (closeMin <= openMin) closeMin += 24 * 60;
  const nowMinNorm = nowMin < openMin ? nowMin + 24 * 60 : nowMin;
  return nowMinNorm >= openMin && nowMinNorm < closeMin;
}

function useBranchesForPedir() {
  return useQuery({
    queryKey: ['branches-pedir'],
    retry: 2,
    queryFn: async () => {
      const { branches, configMap } = await fetchBranchesForPedir();

      return branches
        .filter((b: any) => b.public_status === 'active')
        .map((b: any): BranchWithWebapp => {
          const cfg = configMap[b.id];
          return {
            ...b,
            cover_image_url: b.cover_image_url ?? null,
            latitude: b.latitude ?? null,
            longitude: b.longitude ?? null,
            opening_time: b.opening_time ?? null,
            closing_time: b.closing_time ?? null,
            public_hours: b.public_hours ?? null,
            webapp_activa: cfg?.webapp_activa === true,
            estado: cfg?.estado ?? 'cerrado',
            delivery_habilitado: cfg?.delivery_habilitado ?? false,
            retiro_habilitado: cfg?.retiro_habilitado ?? false,
            delivery_costo: cfg?.delivery_costo ?? null,
            tiempo_retiro: cfg?.tiempo_estimado_retiro_min ?? null,
            tiempo_delivery: cfg?.tiempo_estimado_delivery_min ?? null,
          };
        })
        .sort((a, b) => {
          const aOpen = a.webapp_activa ? a.estado === 'abierto' : isBranchOpenBySchedule(a);
          const bOpen = b.webapp_activa ? b.estado === 'abierto' : isBranchOpenBySchedule(b);
          if (aOpen && !bOpen) return -1;
          if (!aOpen && bOpen) return 1;
          return (a.name ?? '').localeCompare(b.name ?? '');
        });
    },
  });
}

export default function Pedir() {
  const { data: branches, isLoading, error, refetch } = useBranchesForPedir();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Pedí Online | Hoppiness Club"
        description="Hacé tu pedido de hamburguesas smash en tu Hoppiness más cercano."
        path="/pedir"
      />

      <WebappHeader title="Pedí Online" showBack onBack={() => navigate('/')} />

      {/* Branch cards */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6 pb-12">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <SpinnerLoader size="lg" text="Cargando locales..." />
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-destructive font-medium">Error al cargar los locales</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Hubo un problema de conexión. Intentá de nuevo.
              </p>
              {error instanceof Error && error.message && (
                <p className="text-xs text-muted-foreground max-w-md mx-auto font-mono break-all">
                  {error.message}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </Button>
            </div>
          ) : !branches?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              No hay locales disponibles en este momento.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => (
                <BranchCard key={branch.id} branch={branch} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function getTodayHoursLabel(publicHours: Record<string, any> | any[] | null): string | null {
  if (!publicHours) return null;
  const idx = getMondayBasedDayIdx();
  const day = Array.isArray(publicHours) ? publicHours[idx] : publicHours[String(idx)];
  if (!day) return null;
  if (day.closed || day.cerrado) return 'Hoy: Cerrado';
  const opens = day.opens ?? day.open ?? day.apertura;
  const closes = day.closes ?? day.close ?? day.cierre;
  const fmt = (t?: string) => (t || '').replace(/^(\d{1,2}:\d{2})(:\d{2})?$/, '$1');
  if (opens && closes) return `Hoy: ${fmt(opens)} - ${fmt(closes)}`;
  return null;
}

function BranchCard({ branch }: { branch: BranchWithWebapp }) {
  const hasWebapp = branch.webapp_activa && branch.slug;
  const todayLabel = getTodayHoursLabel(branch.public_hours);
  const isOpen = branch.estado === 'abierto';
  const isPaused = branch.estado === 'pausado';
  const isClosed = !isOpen && !isPaused;
  const openBySchedule = isBranchOpenBySchedule(branch);
  const hasCoords = branch.latitude != null && branch.longitude != null;
  const mapsUrl = hasCoords
    ? `https://maps.google.com/?q=${branch.latitude},${branch.longitude}`
    : `https://maps.google.com/?q=${encodeURIComponent(branch.address + ', ' + branch.city)}`;

  return (
    <div className="rounded-xl bg-card border shadow-soft overflow-hidden transition-shadow hover:shadow-card active:scale-[0.99]">
      {hasCoords && (
        <div className="px-4 pt-2">
          <StaticBranchMap
            latitude={branch.latitude!}
            longitude={branch.longitude!}
            mapsUrl={mapsUrl}
            height={100}
            linkLabel="Cómo llegar"
          />
        </div>
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-black text-lg text-foreground leading-tight">{branch.name}</h2>
          {hasWebapp ? (
            <>
              {isOpen && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Abierto
                </span>
              )}
              {isPaused && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
                  <Pause className="w-3 h-3" />
                  Pausado
                </span>
              )}
              {isClosed && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  Cerrado
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/80 px-2.5 py-1 rounded-full shrink-0">
              {openBySchedule ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Abierto
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  Fuera de horario
                </>
              )}
            </span>
          )}
        </div>

        {todayLabel && <p className="text-xs text-muted-foreground font-medium">{todayLabel}</p>}

        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {branch.address}, {branch.city}
        </p>

        {hasWebapp &&
          isOpen &&
          (() => {
            const services: string[] = [];
            if (branch.retiro_habilitado) services.push('Retiro');
            if (branch.delivery_habilitado) services.push('Delivery');
            if (services.length === 0) return null;
            return (
              <p className="text-xs text-muted-foreground">
                Servicios disponibles: {services.join(', ')}
              </p>
            );
          })()}
        {!hasWebapp && <p className="text-xs text-muted-foreground">Disponible por Mas Delivery</p>}
      </div>

      <div className="px-5 pb-5">
        {hasWebapp ? (
          <Link to={`/pedir/${branch.slug}`}>
            <Button className="w-full font-bold" size="lg" disabled={isClosed}>
              {isOpen ? 'Pedir acá' : isPaused ? 'Ver menú' : 'Cerrado'}
            </Button>
          </Link>
        ) : (
          <a
            href="https://pedidos.masdelivery.com/hoppiness"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full" size="lg">
              Pedir por MasDelivery
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
