/**
 * CajaExpensesList - Lista de egresos de una caja con filtros, exportación y aprobación
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Search, CheckCircle, XCircle } from 'lucide-react';
import { CATEGORIA_GASTO_OPTIONS } from '@/types/compra';
import { fetchShiftExpenses, updateExpenseApproval } from '@/services/posService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cashRegisterKeys } from '@/hooks/useCashRegister';
import { useDebounce } from '@/hooks/useDebounce';
import * as XLSX from 'xlsx';

interface ExpenseMovement {
  id: string;
  amount: number;
  concept: string;
  payment_method: string;
  created_at: string;
  categoria_gasto?: string | null;
  rdo_category_code?: string | null;
  estado_aprobacion?: string | null;
  notes?: string | null;
}

interface CajaExpensesListProps {
  shiftId: string | undefined;
  branchId: string;
  registerLabel: string;
  canApprove: boolean;
}

export function CajaExpensesList({
  shiftId,
  branchId: _branchId,
  registerLabel,
  canApprove,
}: CajaExpensesListProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [expenses, setExpenses] = useState<ExpenseMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const loadExpenses = async () => {
    if (!shiftId) return;
    setLoading(true);
    try {
      const data = await fetchShiftExpenses(shiftId);
      setExpenses(data as unknown as ExpenseMovement[]);
      setLoaded(true);
    } catch {
      toast.error('Error al cargar egresos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!expanded && !loaded) loadExpenses();
    setExpanded(!expanded);
  };

  const getCategoriaLabel = (key: string) =>
    CATEGORIA_GASTO_OPTIONS.find((c) => c.value === key)?.label || key;

  const filtered = useMemo(() => {
    if (!debouncedSearch) return expenses;
    const s = debouncedSearch.toLowerCase();
    return expenses.filter(
      (e) =>
        e.concept.toLowerCase().includes(s) ||
        (e.categoria_gasto && getCategoriaLabel(e.categoria_gasto).toLowerCase().includes(s)),
    );
  }, [expenses, debouncedSearch]);

  const pendingCount = expenses.filter(
    (e) => e.estado_aprobacion === 'pendiente_aprobacion',
  ).length;

  const handleApprove = async (id: string) => {
    try {
      await updateExpenseApproval(id, 'aprobado');
      toast.success('Gasto aprobado');
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, estado_aprobacion: 'aprobado' } : e)),
      );
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    } catch {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateExpenseApproval(id, 'rechazado');
      toast.success('Gasto rechazado');
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, estado_aprobacion: 'rechazado' } : e)),
      );
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    } catch {
      toast.error('Error al rechazar');
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map((e) => ({
      Fecha: new Date(e.created_at).toLocaleDateString('es-AR'),
      Concepto: e.concept,
      Monto: e.amount,
      Categoría: e.categoria_gasto ? getCategoriaLabel(e.categoria_gasto) : '',
      Estado: e.estado_aprobacion || 'aprobado',
      Observaciones: e.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Egresos');
    XLSX.writeFile(wb, `egresos_${registerLabel.replace(/\s/g, '_')}.xlsx`);
  };

  const getEstadoBadge = (estado: string | null | undefined) => {
    switch (estado) {
      case 'pendiente_aprobacion':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Pendiente
          </Badge>
        );
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">Aprobado</Badge>;
    }
  };

  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" onClick={handleToggle} className="text-muted-foreground">
        {expanded ? 'â–¾' : 'â–¸'} Ver egresos {pendingCount > 0 && `(${pendingCount} pendientes)`}
      </Button>

      {expanded && (
        <Card className="mt-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm">Egresos â€” {registerLabel}</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={filtered.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin egresos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Estado</TableHead>
                      {canApprove && <TableHead>Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(e.created_at).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.concept}
                          {e.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {e.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          $ {Number(e.amount).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.categoria_gasto ? getCategoriaLabel(e.categoria_gasto) : 'â€”'}
                        </TableCell>
                        <TableCell>{getEstadoBadge(e.estado_aprobacion)}</TableCell>
                        {canApprove && (
                          <TableCell>
                            {e.estado_aprobacion === 'pendiente_aprobacion' && (
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleApprove(e.id)}
                                  title="Aprobar"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleReject(e.id)}
                                  title="Rechazar"
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
