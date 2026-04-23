import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Building2, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/states';
import {
  useInversiones,
  useInversionMutations,
  TIPO_INVERSION_OPTIONS,
  ESTADO_INVERSION_OPTIONS,
  type InversionFormData,
} from '@/hooks/useInversiones';

interface Props {
  branchId: string;
}

export function GestorInversiones({ branchId }: Props) {
  const [periodo, setPeriodo] = useState<string | undefined>();
  const { data: inversiones, isLoading } = useInversiones(branchId, periodo);
  const { create, softDelete } = useInversionMutations();
  const [modalOpen, setModalOpen] = useState(false);

  const periodos = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const totalInversiones = inversiones?.reduce((sum, inv) => sum + Number(inv.monto_total), 0) || 0;

  const getTipoLabel = (t: string) => TIPO_INVERSION_OPTIONS.find((o) => o.value === t)?.label || t;
  const getEstadoBadge = (e: string) => {
    const variant = e === 'pagado' ? 'default' : e === 'pendiente' ? 'secondary' : 'outline';
    return (
      <Badge variant={variant}>
        {ESTADO_INVERSION_OPTIONS.find((o) => o.value === e)?.label || e}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inversiones (CAPEX)</h2>
          <p className="text-sm text-muted-foreground">
            Registros de capital que no afectan el resultado operativo
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={periodo || 'all'}
            onValueChange={(v) => setPeriodo(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los períodos</SelectItem>
              {periodos.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Total invertido</div>
          <div className="text-2xl font-bold font-mono">
            $ {totalInversiones.toLocaleString('es-AR')}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !inversiones?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40">
                    <EmptyState
                      icon={Building2}
                      title="Sin inversiones"
                      description="Registrá inversiones de capital"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                inversiones.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTipoLabel(inv.tipo_inversion)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(inv.fecha).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      $ {Number(inv.monto_total).toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell>{getEstadoBadge(inv.estado)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => softDelete.mutate(inv.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <InversionFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        branchId={branchId}
        onCreate={create}
      />
    </div>
  );
}

function InversionFormModal({
  open,
  onOpenChange,
  branchId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  branchId: string;
  onCreate: ReturnType<typeof useInversionMutations>['create'];
}) {
  const [form, setForm] = useState({
    descripcion: '',
    tipo_inversion: 'equipamiento',
    monto_total: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'pagado',
    vida_util_meses: '',
    cuotas_total: '',
    observaciones: '',
  });

  const handleSubmit = async () => {
    if (!form.descripcion || !form.monto_total) return;

    const periodo = `${form.fecha.slice(0, 4)}-${form.fecha.slice(5, 7)}`;
    const payload: InversionFormData = {
      branch_id: branchId,
      descripcion: form.descripcion,
      tipo_inversion: form.tipo_inversion,
      monto_total: parseFloat(form.monto_total),
      date: form.fecha,
      period: periodo,
      estado: form.estado,
      vida_util_meses: form.vida_util_meses ? parseInt(form.vida_util_meses) : null,
      cuotas_total: form.cuotas_total ? parseInt(form.cuotas_total) : null,
      notes: form.observaciones || undefined,
    };

    await onCreate.mutateAsync(payload);
    onOpenChange(false);
    setForm({
      descripcion: '',
      tipo_inversion: 'equipamiento',
      monto_total: '',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'pagado',
      vida_util_meses: '',
      cuotas_total: '',
      observaciones: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Inversión</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Descripción *</Label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo_inversion}
                onValueChange={(v) => setForm({ ...form, tipo_inversion: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_INVERSION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Monto Total *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monto_total}
                onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_INVERSION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.estado === 'financiado' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cuotas Totales</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.cuotas_total}
                  onChange={(e) => setForm({ ...form, cuotas_total: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vida Útil (meses)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.vida_util_meses}
                  onChange={(e) => setForm({ ...form, vida_util_meses: e.target.value })}
                />
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.descripcion || !form.monto_total || onCreate.isPending}
          >
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
