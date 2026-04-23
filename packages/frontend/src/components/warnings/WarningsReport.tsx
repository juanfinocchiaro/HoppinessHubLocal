/**
 * WarningsReport - Informes mensuales de apercibimientos
 */
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';

interface Warning {
  id: string;
  user_id: string;
  warning_type: string;
  description: string;
  warning_date: string;
  acknowledged_at: string | null;
  signed_document_url: string | null;
  employee_name?: string;
}

interface WarningsReportProps {
  warnings?: Warning[];
}

export function WarningsReport({ warnings }: WarningsReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Filtrar por mes seleccionado
  const monthWarnings = useMemo(() => {
    if (!warnings) return [];
    return warnings.filter((w) => w.warning_date.startsWith(selectedMonth));
  }, [warnings, selectedMonth]);

  // Calcular estadísticas
  const stats = useMemo(
    () => ({
      total: monthWarnings.length,
      byType: monthWarnings.reduce(
        (acc, w) => {
          acc[w.warning_type] = (acc[w.warning_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      uniqueEmployees: new Set(monthWarnings.map((w) => w.user_id)).size,
      pendingSignature: monthWarnings.filter((w) => !w.signed_document_url).length,
      pendingAck: monthWarnings.filter((w) => !w.acknowledged_at).length,
    }),
    [monthWarnings],
  );

  // Empleados con más incidencias
  const topEmployees = useMemo(() => {
    const byEmployee = monthWarnings.reduce(
      (acc, w) => {
        acc[w.user_id] = acc[w.user_id] || { count: 0, name: w.employee_name || 'Sin nombre' };
        acc[w.user_id].count++;
        return acc;
      },
      {} as Record<string, { count: number; name: string }>,
    );

    return Object.entries(byEmployee)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);
  }, [monthWarnings]);

  return (
    <div className="space-y-6">
      {/* Selector de mes */}
      <div className="flex items-center gap-4">
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-auto"
        />
        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF (próximamente)
        </Button>
      </div>

      {/* Stats del mes */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.uniqueEmployees}</p>
            <p className="text-sm text-muted-foreground">Empleados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.pendingAck}</p>
            <p className="text-sm text-muted-foreground">Sin ver</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.pendingSignature}</p>
            <p className="text-sm text-muted-foreground">Sin firma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{Object.keys(stats.byType).length}</p>
            <p className="text-sm text-muted-foreground">Tipos</p>
          </CardContent>
        </Card>
      </div>

      {/* Por tipo */}
      {Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empleados con más incidencias */}
      {topEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empleados con más incidencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topEmployees.map(([userId, data], index) => (
                <div key={userId} className="flex items-center justify-between">
                  <span>
                    {index + 1}. {data.name}
                  </span>
                  <Badge variant="outline">{data.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {monthWarnings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay apercibimientos en el período seleccionado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
