/**
 * Hub de producto (página canónica).
 *
 * Envuelve `ItemExpandedPanel` como página full-width. Añade la sección de
 * "Presencia por local" (Sprint 2 — catalog presence model).
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { ItemExpandedPanel } from '@/components/centro-costos/ItemExpandedPanel';
import { SpinnerLoader } from '@/components/ui/loaders';
import { useProductPresence, useProductPresenceMutation } from '@/hooks/useProductPresence';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchesIdName } from '@/services/adminService';

export default function ProductoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: items, isLoading } = useItemsCarta();

  const item = items?.find((i: { id: string }) => i.id === id);

  const { data: presenceData } = useProductPresence(id);
  const presenceMutation = useProductPresenceMutation(id);

  const { data: locationsList } = useQuery({
    queryKey: ['branches-id-name'],
    queryFn: fetchBranchesIdName,
  });

  const locations: Array<{ id: string; name: string }> = Array.isArray(locationsList)
    ? locationsList
    : (locationsList as { data?: Array<{ id: string; name: string }> })?.data ?? [];

  const [saving, setSaving] = useState(false);

  const handleToggleAll = async (val: boolean) => {
    if (!id) return;
    setSaving(true);
    try {
      await presenceMutation.mutateAsync({
        present_at_all_locations: val,
        exceptions: presenceData?.exceptions ?? [],
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLocation = async (locationId: string, isPresent: boolean) => {
    if (!id || !presenceData) return;
    const current = presenceData.exceptions.filter((e) => e.location_id !== locationId);
    const updated = [...current, { location_id: locationId, is_present: isPresent }];
    setSaving(true);
    try {
      await presenceMutation.mutateAsync({
        present_at_all_locations: presenceData.present_at_all_locations,
        exceptions: updated,
      });
    } finally {
      setSaving(false);
    }
  };

  const isLocationPresent = (locationId: string): boolean => {
    if (!presenceData) return true;
    const exception = presenceData.exceptions.find((e) => e.location_id === locationId);
    if (exception) return exception.is_present;
    return presenceData.present_at_all_locations;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <SpinnerLoader size="lg" text="Cargando producto..." />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/mimarca/productos">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver a productos
          </Link>
        </Button>
        <div className="rounded-lg border bg-muted/10 px-4 py-6 text-center text-muted-foreground">
          Producto no encontrado. Puede haber sido eliminado.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={item.name}
        subtitle={item.type === 'combo' ? 'Combo' : item.type === 'extra' ? 'Extra' : 'Producto'}
        breadcrumb={[
          { label: 'Mi Marca', href: '/mimarca' },
          { label: 'Productos', href: '/mimarca/productos' },
          { label: item.name },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/mimarca/productos">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Link>
          </Button>
        }
      />

      <ItemExpandedPanel
        item={item}
        onClose={() => navigate('/mimarca/productos')}
        onDeleted={() => navigate('/mimarca/productos')}
      />

      {/* ── Presencia por local (Sprint 2) ── */}
      {presenceData && locations.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Presencia por local
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="present-all"
                checked={presenceData.present_at_all_locations}
                onCheckedChange={handleToggleAll}
                disabled={saving}
              />
              <Label htmlFor="present-all" className="cursor-pointer">
                {presenceData.present_at_all_locations
                  ? 'Disponible en todos los locales'
                  : 'Solo disponible en locales seleccionados'}
              </Label>
            </div>

            {!presenceData.present_at_all_locations && (
              <div className="grid gap-2 pl-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Elegí en qué locales está disponible este producto:
                </p>
                {locations.map((loc) => (
                  <div key={loc.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`loc-${loc.id}`}
                      checked={isLocationPresent(loc.id)}
                      onCheckedChange={(checked) =>
                        handleToggleLocation(loc.id, !!checked)
                      }
                      disabled={saving}
                    />
                    <Label htmlFor={`loc-${loc.id}`} className="cursor-pointer font-normal">
                      {loc.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {presenceData.present_at_all_locations && presenceData.exceptions.length > 0 && (
              <div className="grid gap-2 pl-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Excepciones (locales donde NO está disponible):
                </p>
                {locations
                  .filter((loc) =>
                    presenceData.exceptions.some(
                      (e) => e.location_id === loc.id && !e.is_present
                    )
                  )
                  .map((loc) => (
                    <div key={loc.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`exc-${loc.id}`}
                        checked={false}
                        onCheckedChange={() => handleToggleLocation(loc.id, true)}
                        disabled={saving}
                      />
                      <Label htmlFor={`exc-${loc.id}`} className="cursor-pointer font-normal text-muted-foreground">
                        {loc.name} (excluido)
                      </Label>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
