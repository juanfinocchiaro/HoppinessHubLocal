import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { Plus, Trash2, Pencil, Copy, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCodigosDescuento,
  useCodigoDescuentoMutations,
  type CodigoDescuento,
  type CodigoDescuentoFormData,
} from '@/hooks/useCodigosDescuento';

const EMPTY_FORM: CodigoDescuentoFormData = {
  code: '',
  type: 'descuento_porcentaje',
  value: 0,
  max_uses: null,
  single_use_per_user: true,
  min_order_amount: null,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  is_active: true,
  branch_ids: [],
};

export default function CodigosDescuentoPage() {
  const { data: codigos, isLoading } = useCodigosDescuento();
  const { create, update, remove } = useCodigoDescuentoMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CodigoDescuento | null>(null);
  const [deleting, setDeleting] = useState<CodigoDescuento | null>(null);
  const [form, setForm] = useState<CodigoDescuentoFormData>(EMPTY_FORM);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (code: CodigoDescuento) => {
    setEditing(code);
    setForm({
      code: code.code,
      type: code.type,
      value: code.value,
      max_uses: code.max_uses,
      single_use_per_user: code.single_use_per_user,
      min_order_amount: code.min_order_amount,
      start_date: code.start_date,
      end_date: code.end_date,
      is_active: code.is_active,
      branch_ids: code.branch_ids,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      toast.error('Ingresá un código');
      return;
    }
    if (form.value < 0) {
      toast.error('El valor no puede ser negativo');
      return;
    }
    if (form.type === 'descuento_porcentaje' && form.value > 100) {
      toast.error('El porcentaje no puede ser mayor a 100');
      return;
    }
    if (form.start_date > form.end_date) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: form });
      } else {
        await create.mutateAsync(form);
      }
      setFormOpen(false);
    } catch {
      // Error already handled by toast in mutations
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Códigos de Descuento"
        subtitle="Cupones de descuento"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Código
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-5 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !codigos?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40">
                  <EmptyState
                    icon={Ticket}
                    title="Sin códigos"
                    description="Creá tu primer código de descuento"
                  />
                </TableCell>
              </TableRow>
            ) : (
              codigos.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded">
                        {code.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(code.code);
                          toast.success('Código copiado');
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {code.type === 'descuento_porcentaje'
                      ? `${code.value}%`
                      : `$${(code.value ?? 0).toLocaleString('es-AR')}`}
                  </TableCell>
                  <TableCell>
                    {code.current_uses}/{code.max_uses ?? '∞'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {code.start_date} — {code.end_date}
                  </TableCell>
                  <TableCell>
                    <Badge variant={code.is_active ? 'default' : 'outline'}>
                      {code.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(code)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(code)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Código' : 'Nuevo Código de Descuento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="BIENVENIDO20"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="descuento_porcentaje">% Descuento</SelectItem>
                    <SelectItem value="descuento_fijo">$ Descuento fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Usos máximos</Label>
                <Input
                  type="number"
                  value={form.max_uses ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      max_uses: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pedido mínimo ($)</Label>
                <Input
                  type="number"
                  value={form.min_order_amount ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      min_order_amount: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="Sin mínimo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Uso único por usuario</Label>
              <Switch
                checked={form.single_use_per_user}
                onCheckedChange={(v) => setForm((f) => ({ ...f, single_use_per_user: v }))}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
            >
              {editing ? 'Guardar cambios' : 'Crear código'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar código"
        description={`¿Eliminar el código "${deleting?.code}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
