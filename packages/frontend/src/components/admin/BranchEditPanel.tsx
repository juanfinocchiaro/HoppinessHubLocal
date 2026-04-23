import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { updateBranch, upsertPosConfig } from '@/services/adminService';
import { fetchPosConfig } from '@/services/configService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  MapPin,
  CheckCircle2,
  Globe,
  Eye,
  EyeOff,
  CalendarClock,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import type { Tables } from '@/types/database';
import BranchLocationMap from '@/components/maps/BranchLocationMap';
import PublicHoursEditor, { PublicHours } from './PublicHoursEditor';

type Branch = Tables<'branches'>;
type PublicStatus = 'active' | 'coming_soon' | 'hidden';

interface BranchEditPanelProps {
  branch: Branch;
  onSaved: () => void;
  onCancel: () => void;
}

export default function BranchEditPanel({ branch, onSaved, onCancel }: BranchEditPanelProps) {
  const queryClient = useQueryClient();
  const { isSuperadmin } = useDynamicPermissions();
  const [saving, setSaving] = useState(false);

  const { data: posConfig } = useQuery({
    queryKey: ['pos-config', branch.id],
    queryFn: () => fetchPosConfig(branch.id),
  });

  const [posEnabled, setPosEnabled] = useState(posConfig?.pos_enabled ?? false);

  useEffect(() => {
    if (posConfig !== undefined && posConfig !== null) {
      setPosEnabled(posConfig.pos_enabled ?? false);
    }
  }, [posConfig?.pos_enabled, posConfig]);

  // Datos básicos
  const [name, setName] = useState(branch.name || '');
  const [address, setAddress] = useState(branch.address || '');
  const [city, setCity] = useState(branch.city || '');
  const [phone, setPhone] = useState(branch.phone || '');
  const [email, setEmail] = useState(branch.email || '');
  const [latitude, setLatitude] = useState((branch as any).latitude?.toString() || '');
  const [longitude, setLongitude] = useState((branch as any).longitude?.toString() || '');
  const [googlePlaceId, setGooglePlaceId] = useState((branch as any).google_place_id || '');

  // Estado público (nuevo sistema)
  const [publicStatus, setPublicStatus] = useState<PublicStatus>(
    ((branch as any).public_status as PublicStatus) || 'active',
  );

  // Horarios públicos por día
  const [publicHours, setPublicHours] = useState<PublicHours | null>(
    (branch as any).public_hours || null,
  );

  // Mapa (on-demand)
  const [showMap, setShowMap] = useState(false);

  // Reset form when branch changes (prevents stale data from previous branch)
  useEffect(() => {
    setName(branch.name || '');
    setAddress(branch.address || '');
    setCity(branch.city || '');
    setPhone(branch.phone || '');
    setEmail(branch.email || '');
    setLatitude((branch as any).latitude?.toString() || '');
    setLongitude((branch as any).longitude?.toString() || '');
    setGooglePlaceId((branch as any).google_place_id || '');
    setPublicStatus(((branch as any).public_status as PublicStatus) || 'active');
    setPublicHours((branch as any).public_hours || null);
    setShowMap(false);
  }, [branch.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBranch(branch.id, {
        name,
        address,
        city,
        phone: phone || null,
        email: email || null,
        is_active: publicStatus !== 'hidden',
        public_status: publicStatus,
        public_hours: publicHours,
        latitude: latitude && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null,
        longitude: longitude && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null,
        google_place_id: googlePlaceId.trim() || null,
      });

      if (isSuperadmin) {
        try {
          await upsertPosConfig(branch.id, posEnabled);
        } catch (posErr: any) {
          const msg = posErr?.message || posErr?.error_description || String(posErr);
          const needsMigration = /does not exist|relation|relation "pos_config"/i.test(msg);
          const hint = needsMigration
            ? ' Ejecutá supabase db push para aplicar las migraciones de POS.'
            : '';
          throw new Error(`POS: ${msg}${hint}`);
        }
      }

      // Invalidar TODAS las queries de branches para sincronizar cache
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-branches'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-branches-v2'] });
      queryClient.invalidateQueries({ queryKey: ['branch-detail'] });
      queryClient.invalidateQueries({ queryKey: ['public-branches-landing'] });
      queryClient.invalidateQueries({ queryKey: ['pos-config', branch.id] });
      queryClient.invalidateQueries({ queryKey: ['pos-config'] });

      toast.success('Sucursal actualizada');
      onSaved();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Error saving branch:', error);
      const message = error?.message || 'Error al guardar los cambios';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Manantiales"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="351-1234567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Dirección *</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección completa"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Ubicación en mapa</Label>
              {latitude && longitude && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ubicado
                </span>
              )}
            </div>
            {!showMap && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMap(true)}
                className="gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                Ubicar en mapa
              </Button>
            )}
          </div>

          {showMap && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="google-place-id">Google Place ID</Label>
                  <a
                    href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Cómo obtenerlo
                  </a>
                </div>
                <Input
                  id="google-place-id"
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  placeholder="Ej: ChIJN1t_tDeuEmsRUsoyG83frY4"
                />
                <p className="text-xs text-muted-foreground">
                  Los links de "Cómo llegar" abrirán el perfil de Google My Business del local.
                </p>
              </div>

              <BranchLocationMap
                placeId={googlePlaceId}
                latitude={latitude}
                longitude={longitude}
                onLocated={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowMap(false)}
                className="gap-1.5"
              >
                <Save className="h-3 w-3" />
                Guardar ubicación
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad / Zona</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Córdoba"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="local@hoppiness.com"
            />
          </div>
        </div>

        {/* Horarios públicos por día */}
        <div className="pt-4 border-t">
          <PublicHoursEditor value={publicHours} onChange={setPublicHours} />
        </div>

        {/* Estado público del local */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Estado en la Web
          </div>
          <RadioGroup
            value={publicStatus}
            onValueChange={(val) => setPublicStatus(val as PublicStatus)}
            className="grid gap-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="active" id="status-active" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="status-active"
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Eye className="h-4 w-4 text-success" />
                  Activo
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  El local está operativo y visible normalmente en la web
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="coming_soon" id="status-coming-soon" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="status-coming-soon"
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <CalendarClock className="h-4 w-4 text-accent" />
                  Próximamente
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aparece en la web con badge "Próximamente" (para locales en construcción)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="hidden" id="status-hidden" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="status-hidden"
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  Oculto
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No aparece en la landing pública (temporalmente cerrado o en pausa)
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Punto de Venta (POS) - Solo superadmin */}
        {isSuperadmin && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                Punto de Venta (POS)
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="pos-enabled" className="text-sm text-muted-foreground">
                  {posEnabled ? 'Habilitado' : 'Deshabilitado'}
                </Label>
                <Switch id="pos-enabled" checked={posEnabled} onCheckedChange={setPosEnabled} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Si está habilitado, esta sucursal usará el POS integrado. Se ocultan Ventas Mensuales
              y Cargador RDO (carga manual).
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
