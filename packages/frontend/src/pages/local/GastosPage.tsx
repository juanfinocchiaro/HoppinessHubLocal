/**
 * GastosPage â€” Módulo de Gastos completo
 *
 * Registro de gastos tanto desde caja (efectivo) como transferencias bancarias.
 * Categorización alineada al RDO para alimentar automáticamente el resultado económico.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Receipt,
  Search,
  Download,
  Trash2,
  Pencil,
  Building2,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGastos, softDeleteGasto, saveGasto } from '@/services/rdoService';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(v);

const CATEGORIAS_GASTO = [
  { value: 'comision_mp_point', label: 'Comisión MP Point', rdo: 'costos_variables' },
  { value: 'comision_rappi', label: 'Comisión Rappi', rdo: 'costos_variables' },
  { value: 'comision_pedidos_ya', label: 'Comisión Pedidos Ya', rdo: 'costos_variables' },
  { value: 'pago_rappiboys', label: 'Pago a RappiBoys', rdo: 'costos_variables' },
  { value: 'pago_cadetes', label: 'Cadetes terceros', rdo: 'costos_variables' },
  { value: 'mantenimiento', label: 'Mantenimiento', rdo: 'costos_fijos' },
  { value: 'uniformes', label: 'Uniformes', rdo: 'costos_fijos' },
  { value: 'sueldos', label: 'Sueldos', rdo: 'costos_fijos' },
  { value: 'cargas_sociales', label: 'Cargas sociales', rdo: 'costos_fijos' },
  { value: 'comida_personal', label: 'Comida para el personal', rdo: 'costos_fijos' },
  { value: 'software_gestion', label: 'Software de Gestión', rdo: 'costos_fijos' },
  { value: 'estudio_contable', label: 'Estudio contable', rdo: 'costos_fijos' },
  { value: 'bromatologia', label: 'Bromatología', rdo: 'costos_fijos' },
  { value: 'alquiler', label: 'Alquiler', rdo: 'costos_fijos' },
  { value: 'expensas', label: 'Expensas', rdo: 'costos_fijos' },
  { value: 'gas', label: 'Gas', rdo: 'costos_fijos' },
  { value: 'internet_telefonia', label: 'Internet y Telefonía', rdo: 'costos_fijos' },
  { value: 'energia_electrica', label: 'Energía Eléctrica', rdo: 'costos_fijos' },
  { value: 'otros', label: 'Otros', rdo: 'costos_fijos' },
];

const MEDIOS_PAGO_GASTO = [
  { value: 'efectivo_caja', label: 'Efectivo (de caja)' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'tarjeta', label: 'Tarjeta de débito/crédito' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'cheque', label: 'Cheque' },
];

interface Gasto {
  id: string;
  date: string;
  categoria_principal: string;
  concept: string;
  amount: number;
  payment_method: string | null;
  tipo_pago: string | null;
  afecta_caja: boolean;
  costo_transferencia: number;
  notes: string | null;
  proveedor_id: string | null;
  estado: string | null;
  created_at: string;
}

export default function GastosPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { user: _user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [periodo, setPeriodo] = useState(() => format(new Date(), 'yyyy-MM'));

  const periodoStart = startOfMonth(new Date(periodo + '-01'));
  const periodoEnd = endOfMonth(new Date(periodo + '-01'));

  const { data: gastos, isLoading } = useQuery({
    queryKey: ['gastos', branchId, periodo],
    queryFn: async () => {
      const data = await fetchGastos(
        branchId!,
        format(periodoStart, 'yyyy-MM-dd'),
        format(periodoEnd, 'yyyy-MM-dd'),
      );
      return data as unknown as Gasto[];
    },
    enabled: !!branchId,
  });

  const filteredGastos = useMemo(() => {
    if (!gastos) return [];
    let filtered = gastos;
    if (filterCategoria !== 'all') {
      filtered = filtered.filter((g) => g.categoria_principal === filterCategoria);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.concept.toLowerCase().includes(q) || g.categoria_principal.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [gastos, filterCategoria, debouncedSearch]);

  const totals = useMemo(() => {
    if (!filteredGastos.length) return { total: 0, efectivo: 0, transferencia: 0 };
    return filteredGastos.reduce(
      (acc, g) => ({
        total: acc.total + Number(g.amount) + Number(g.costo_transferencia || 0),
        efectivo: acc.efectivo + (g.afecta_caja ? Number(g.amount) : 0),
        transferencia: acc.transferencia + (!g.afecta_caja ? Number(g.amount) : 0),
      }),
      { total: 0, efectivo: 0, transferencia: 0 },
    );
  }, [filteredGastos]);

  const deleteGasto = useMutation({
    mutationFn: (id: string) => softDeleteGasto(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos', branchId] });
      toast.success('Gasto eliminado');
    },
  });

  const handleExport = () => {
    if (!filteredGastos.length) return;
    exportToExcel(
      filteredGastos.map((g) => ({
        fecha: g.date,
        categoria:
          CATEGORIAS_GASTO.find((c) => c.value === g.categoria_principal)?.label ||
          g.categoria_principal,
        concepto: g.concept,
        monto: g.amount,
        costo_transferencia: g.costo_transferencia || 0,
        medio_pago:
          MEDIOS_PAGO_GASTO.find((m) => m.value === g.tipo_pago)?.label || g.tipo_pago || '',
        afecta_caja: g.afecta_caja ? 'Sí' : 'No',
      })),
      {
        fecha: 'Fecha',
        categoria: 'Categoría',
        concepto: 'Concepto',
        monto: 'Monto',
        costo_transferencia: 'Costo transf.',
        medio_pago: 'Medio',
        afecta_caja: 'Afecta caja',
      },
      { filename: `gastos-${periodo}` },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        subtitle="Registro y seguimiento de gastos del local"
        breadcrumb={[{ label: 'Dashboard', href: `/milocal/${branchId}` }, { label: 'Gastos' }]}
        actions={
          <Button
            onClick={() => {
              setEditingGasto(null);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Registrar gasto
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total período</p>
                <p className="text-lg font-bold">{fmtCurrency(totals.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Salió de caja</p>
                <p className="text-lg font-bold">{fmtCurrency(totals.efectivo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Transferencias</p>
                <p className="text-lg font-bold">{fmtCurrency(totals.transferencia)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-40"
        />
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIAS_GASTO.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!filteredGastos.length}
        >
          <Download className="w-4 h-4 mr-1" /> Excel
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredGastos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay gastos registrados en este período</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead className="text-center">Caja</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGastos.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-sm">
                      {format(new Date(g.date + 'T12:00:00'), 'dd/MM', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIAS_GASTO.find((c) => c.value === g.categoria_principal)?.label ||
                          g.categoria_principal}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{g.concept}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtCurrency(Number(g.amount))}
                      {Number(g.costo_transferencia) > 0 && (
                        <span className="text-xs text-muted-foreground block">
                          +{fmtCurrency(Number(g.costo_transferencia))} transf.
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {MEDIOS_PAGO_GASTO.find((m) => m.value === g.tipo_pago)?.label ||
                        g.payment_method ||
                        '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={g.afecta_caja ? 'default' : 'secondary'} className="text-xs">
                        {g.afecta_caja ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingGasto(g);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteGasto.mutate(g.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GastoFormModal
        open={showForm}
        onOpenChange={setShowForm}
        branchId={branchId!}
        editing={editingGasto}
      />
    </div>
  );
}

function GastoFormModal({
  open,
  onOpenChange,
  branchId,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId: string;
  editing: Gasto | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoria_principal: '',
    concept: '',
    amount: '',
    tipo_pago: 'efectivo_caja',
    afecta_caja: true,
    costo_transferencia: '',
    notes: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        date: editing.date,
        categoria_principal: editing.categoria_principal,
        concept: editing.concept,
        amount: String(editing.amount),
        tipo_pago: editing.tipo_pago || 'efectivo_caja',
        afecta_caja: editing.afecta_caja,
        costo_transferencia: String(editing.costo_transferencia || 0),
        notes: editing.notes || '',
      });
    } else {
      setForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        categoria_principal: '',
        concept: '',
        amount: '',
        tipo_pago: 'efectivo_caja',
        afecta_caja: true,
        costo_transferencia: '',
        notes: '',
      });
    }
  }, [editing]);

  const set = (p: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...p }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        branch_id: branchId,
        date: form.date,
        period: form.date.substring(0, 7),
        categoria_principal: form.categoria_principal,
        concept: form.concept,
        amount: parseFloat(form.amount),
        tipo_pago: form.tipo_pago,
        payment_method: form.tipo_pago,
        afecta_caja: form.afecta_caja,
        costo_transferencia: form.costo_transferencia ? parseFloat(form.costo_transferencia) : 0,
        notes: form.notes || null,
        rdo_section:
          CATEGORIAS_GASTO.find((c) => c.value === form.categoria_principal)?.rdo || 'costos_fijos',
        created_by: user?.id,
        estado: 'pagado',
      };

      await saveGasto(payload, editing?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos', branchId] });
      toast.success(editing ? 'Gasto actualizado' : 'Gasto registrado');
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error('Error: ' + err.message);
    },
  });

  const handleTipoPagoChange = (v: string) => {
    set({
      tipo_pago: v,
      afecta_caja: v === 'efectivo_caja',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Modificá los datos del gasto'
              : 'Cargá un nuevo gasto. Si salió de caja, se registra como movimiento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={form.categoria_principal}
                onValueChange={(v) => set({ categoria_principal: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_GASTO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Concepto</Label>
            <Input
              placeholder="Ej: Pago a cadete, factura de gas..."
              value={form.concept}
              onChange={(e) => set({ concept: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label>Medio de pago</Label>
              <Select value={form.tipo_pago} onValueChange={handleTipoPagoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO_GASTO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.tipo_pago === 'transferencia' && (
            <div>
              <Label>Costo de transferencia</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.costo_transferencia}
                  onChange={(e) => set({ costo_transferencia: e.target.value })}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Si la transferencia tuvo un costo asociado
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>¿Afecta caja?</Label>
              <p className="text-xs text-muted-foreground">
                {form.afecta_caja
                  ? 'La plata salió de la caja del local'
                  : 'No salió plata de la caja (transferencia, etc.)'}
              </p>
            </div>
            <Switch checked={form.afecta_caja} onCheckedChange={(v) => set({ afecta_caja: v })} />
          </div>

          <div>
            <Label>Observaciones (opcional)</Label>
            <Textarea
              placeholder="Detalles adicionales..."
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.categoria_principal || !form.concept || !form.amount}
          >
            {save.isPending ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
