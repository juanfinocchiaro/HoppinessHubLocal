import { useMemo, useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayrollReport } from '@/hooks/usePayrollReport';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';

interface PayrollClosingPanelProps {
  branchId: string;
  currentDate?: Date;
  onDateChange?: (d: Date) => void;
}

export default function PayrollClosingPanel({ branchId, currentDate: externalDate, onDateChange }: PayrollClosingPanelProps) {
  const [internalDate, setInternalDate] = useState(new Date());
  const selectedMonth = externalDate ?? internalDate;
  const setSelectedMonth = onDateChange ?? setInternalDate;
  const [notes, setNotes] = useState('');
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();

  const { rows, closing, closeMonth, reopenMonth, isLoading } = usePayrollReport({
    branchId,
    year,
    month,
  });

  const totals = useMemo(
    () => ({
      worked: rows.reduce((sum, r) => sum + r.workedHours, 0),
      overtime: rows.reduce((sum, r) => sum + r.overtimeHours, 0),
      advances: rows.reduce((sum, r) => sum + r.advances, 0),
      consumptions: rows.reduce((sum, r) => sum + r.consumptions, 0),
      review: rows.filter((r) => r.status === 'Revisar').length,
    }),
    [rows],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Cierre mensual contable</CardTitle>
        <div className="flex items-center gap-2">
          {!externalDate && (
            <>
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[130px] text-center">
                {format(selectedMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {externalDate && (
            <span className="text-sm font-medium min-w-[130px] text-center">
              {format(selectedMonth, 'MMMM yyyy', { locale: es })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="rounded border px-2.5 py-2">Hs: <strong>{totals.worked.toFixed(1)}</strong></div>
          <div className="rounded border px-2.5 py-2">Extras: <strong>{totals.overtime.toFixed(1)}</strong></div>
          <div className="rounded border px-2.5 py-2">Adelantos: <strong>${totals.advances.toFixed(2)}</strong></div>
          <div className="rounded border px-2.5 py-2">Consumos: <strong>${totals.consumptions.toFixed(2)}</strong></div>
          <div className="rounded border px-2.5 py-2">Revisar: <strong>{totals.review}</strong></div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-center">Hs</TableHead>
              <TableHead className="text-center">Hs extra</TableHead>
              <TableHead className="text-center">Adelantos</TableHead>
              <TableHead className="text-center">Consumos</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.userId}>
                <TableCell>{r.userName}</TableCell>
                <TableCell className="text-center">{r.workedHours.toFixed(1)}</TableCell>
                <TableCell className="text-center">{r.overtimeHours.toFixed(1)}</TableCell>
                <TableCell className="text-center">${r.advances.toFixed(2)}</TableCell>
                <TableCell className="text-center">${r.consumptions.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={r.status === 'OK' ? 'secondary' : 'destructive'}>{r.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Nota (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="max-w-md"
          />
          {closing?.closed_at ? (
            <Button
              variant="outline"
              onClick={() => reopenMonth(notes)}
              disabled={isLoading}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Reabrir
            </Button>
          ) : (
            <Button onClick={() => closeMonth(notes)} disabled={isLoading}>
              <Lock className="h-4 w-4 mr-2" />
              Cerrar mes
            </Button>
          )}
          {closing?.closed_at && (
            <span className="text-xs text-muted-foreground">
              Cerrado: {new Date(closing.closed_at).toLocaleString('es-AR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

