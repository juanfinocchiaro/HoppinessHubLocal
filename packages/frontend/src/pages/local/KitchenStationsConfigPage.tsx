/**
 * KitchenStationsConfigPage - CRUD de estaciones de cocina
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Flame, Plus, Trash2, Pencil, Monitor, Printer } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useKitchenStations, type KitchenStation } from '@/hooks/useKitchenStations';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';

const ICONS = [
  { value: 'flame', label: '🔥 Parrilla' },
  { value: 'fries', label: '🍟 Freidora' },
  { value: 'cup', label: '🥤 Bebidas' },
  { value: 'sandwich', label: '🥪 Armado' },
  { value: 'package', label: '📦 Entrega' },
  { value: 'star', label: '⭐ General' },
];

const DEFAULT_STATION = {
  name: '',
  icon: 'flame',
  sort_order: 0,
  kds_enabled: true,
  printer_id: null as string | null,
  print_on: 'on_receive',
  print_copies: 1,
  is_active: true,
};

export default function KitchenStationsConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: stations, isLoading, create, update, remove } = useKitchenStations(branchId!);
  const { data: printers } = useBranchPrinters(branchId!);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KitchenStation | null>(null);
  const [form, setForm] = useState(DEFAULT_STATION);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...DEFAULT_STATION, sort_order: (stations?.length || 0) + 1 });
    setModalOpen(true);
  };

  const openEdit = (s: KitchenStation) => {
    setEditing(s);
    setForm({
      name: s.name,
      icon: s.icon,
      sort_order: s.sort_order,
      kds_enabled: s.kds_enabled,
      printer_id: s.printer_id,
      print_on: s.print_on,
      print_copies: s.print_copies,
      is_active: s.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) {
      update.mutate({ id: editing.id, ...form }, { onSuccess: () => setModalOpen(false) });
    } else {
      create.mutate({ branch_id: branchId!, ...form } as any, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const iconEmoji = (icon: string) =>
    ICONS.find((i) => i.value === icon)?.label?.split(' ')[0] || '🔥';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estaciones de Cocina"
        subtitle="Configurá las estaciones de trabajo para el KDS"
        icon={<Flame className="w-5 h-5" />}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nueva estación
          </Button>
        }
      />

      {!stations?.length ? (
        <EmptyState
          icon={Flame}
          title="Sin estaciones"
          description="Creá estaciones como Parrilla, Freidora, etc. para organizar la cocina."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{iconEmoji(s.icon)}</span>
                    <span className="font-semibold">{s.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {s.kds_enabled && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Monitor className="w-3 h-3" /> KDS
                      </Badge>
                    )}
                    {s.printer_id && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Printer className="w-3 h-3" /> Imprime
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.printer_id && (
                    <p>
                      Imprime:{' '}
                      {s.print_on === 'on_receive' ? 'Al recibir pedido' : 'Al iniciar preparación'}{' '}
                      ({s.print_copies} copia{s.print_copies > 1 ? 's' : ''})
                    </p>
                  )}
                  <p>Orden: {s.sort_order}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => remove.mutate(s.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar estación' : 'Nueva estación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Parrilla"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icono</Label>
                <Select
                  value={form.icon}
                  onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.kds_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, kds_enabled: v }))}
              />
              <Label>Mostrar en pantalla KDS</Label>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-sm">Impresión</h4>
              <div>
                <Label>Impresora asignada</Label>
                <Select
                  value={form.printer_id || 'none'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, printer_id: v === 'none' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin impresora</SelectItem>
                    {printers?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.ip_address})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.printer_id && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Imprimir</Label>
                    <Select
                      value={form.print_on}
                      onValueChange={(v) => setForm((f) => ({ ...f, print_on: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_receive">Al recibir</SelectItem>
                        <SelectItem value="on_prep">Al preparar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Copias</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={form.print_copies}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, print_copies: parseInt(e.target.value) || 1 }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
