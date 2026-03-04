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
  codigo: '',
  tipo: 'descuento_porcentaje',
  valor: 0,
  usos_maximos: null,
  uso_unico_por_usuario: true,
  monto_minimo_pedido: null,
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  activo: true,
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
      codigo: code.codigo,
      tipo: code.tipo,
      valor: code.valor,
      usos_maximos: code.usos_maximos,
      uso_unico_por_usuario: code.uso_unico_por_usuario,
      monto_minimo_pedido: code.monto_minimo_pedido,
      fecha_inicio: code.fecha_inicio,
      fecha_fin: code.fecha_fin,
      activo: code.is_active,
      branch_ids: code.branch_ids,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.codigo.trim()) {
      toast.error('Ingresá un código');
      return;
    }
    if (form.valor < 0) {
      toast.error('El valor no puede ser negativo');
      return;
    }
    if (form.tipo === 'descuento_porcentaje' && form.valor > 100) {
      toast.error('El porcentaje no puede ser mayor a 100');
      return;
    }
    if (form.fecha_inicio > form.fecha_fin) {
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
                        {code.codigo}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(code.codigo);
                          toast.success('Código copiado');
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {code.tipo === 'descuento_porcentaje'
                      ? `${code.valor}%`
                      : `$${code.valor.toLocaleString('es-AR')}`}
                  </TableCell>
                  <TableCell>
                    {code.usos_actuales}/{code.usos_maximos ?? '∞'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {code.fecha_inicio} — {code.fecha_fin}
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
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                placeholder="BIENVENIDO20"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as any }))}
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
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Usos máximos</Label>
                <Input
                  type="number"
                  value={form.usos_maximos ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      usos_maximos: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pedido mínimo ($)</Label>
                <Input
                  type="number"
                  value={form.monto_minimo_pedido ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monto_minimo_pedido: e.target.value ? Number(e.target.value) : null,
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
                  value={form.fecha_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Uso único por usuario</Label>
              <Switch
                checked={form.uso_unico_por_usuario}
                onCheckedChange={(v) => setForm((f) => ({ ...f, uso_unico_por_usuario: v }))}
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
        description={`¿Eliminar el código "${deleting?.codigo}"?`}
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
