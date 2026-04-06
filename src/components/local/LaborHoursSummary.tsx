/**
 * LaborHoursSummary Component
 *
 * Resumen de horas trabajadas con cálculos dinámicos desde labor_config.
 * Columnas: Empleado, Hs Trabajadas, Hs Regulares, Vacaciones, Faltas Inj.,
 *           Falta Just., Tardanza, Hs Feriados, Hs Franco, Extras Hábil,
 *           Extras Inhábil, Presentismo.
 */
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  CalendarDays,
  Scale,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useLaborHours,
  formatHoursDecimal,
  generateLaborCSV,
  type EmployeeLaborSummary,
} from '@/hooks/useLaborHours';
import { LOCAL_ROLE_LABELS } from '@/hooks/usePermissions';

interface LaborHoursSummaryProps {
  branchId: string;
}

function EmployeeRow({
  summary,
  expanded,
  onToggle,
}: {
  summary: EmployeeLaborSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const initials = summary.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-muted/50 ${summary.hasUnpairedEntries ? 'bg-amber-50/50' : ''}`}
        onClick={onToggle}
      >
        {/* 1. Empleado */}
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={summary.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">{summary.userName}</div>
              <div className="text-xs text-muted-foreground">
                {LOCAL_ROLE_LABELS[summary.localRole as keyof typeof LOCAL_ROLE_LABELS] || '-'}
              </div>
            </div>
          </div>
        </TableCell>
        {/* 2. Hs Trabajadas */}
        <TableCell className="text-center">
          <span className="font-bold">{summary.hsTrabajadasMes.toFixed(1)}</span>
        </TableCell>
        {/* 3. Hs Regulares */}
        <TableCell className="text-center">
          {summary.hsRegulares > 0 ? summary.hsRegulares.toFixed(1) : '-'}
        </TableCell>
        {/* 4. Vacaciones (días) */}
        <TableCell className="text-center">
          {summary.diasVacaciones > 0 ? (
            <span className="text-cyan-600 font-medium">{summary.diasVacaciones}d</span>
          ) : (
            '-'
          )}
        </TableCell>
        {/* 5. Faltas Inj. */}
        <TableCell className="text-center">
          {summary.faltasInjustificadas > 0 ? (
            <span className="text-destructive font-medium">{summary.faltasInjustificadas}</span>
          ) : (
            '0'
          )}
        </TableCell>
        {/* 6. Falta Justificada (horas) */}
        <TableCell className="text-center">
          {summary.hsLicencia > 0 ? (
            <span className="text-orange-600 font-medium">{summary.hsLicencia.toFixed(1)}h</span>
          ) : (
            '-'
          )}
        </TableCell>
        {/* 7. Tardanza (minutos) */}
        <TableCell className="text-center">
          {summary.tardanzaAcumuladaMin > 0 ? (
            <span className="text-amber-600 font-medium">{summary.tardanzaAcumuladaMin}m</span>
          ) : (
            '0'
          )}
        </TableCell>
        {/* 8. Hs Feriados */}
        <TableCell className="text-center">
          {summary.feriadosHs > 0 ? summary.feriadosHs.toFixed(1) : '-'}
        </TableCell>
        {/* 9. Hs Franco */}
        <TableCell className="text-center">
          {summary.hsFrancoTrabajado > 0 ? (
            <span className="text-blue-600 font-medium">
              {summary.hsFrancoTrabajado.toFixed(1)}
            </span>
          ) : (
            '-'
          )}
        </TableCell>
        {/* 10. Extras Hábil */}
        <TableCell className="text-center">
          {summary.hsExtrasDiaHabil > 0 ? (
            <span className="text-amber-600 font-medium">
              {summary.hsExtrasDiaHabil.toFixed(1)}
            </span>
          ) : (
            '-'
          )}
        </TableCell>
        {/* 11. Extras Inhábil */}
        <TableCell className="text-center">
          {summary.hsExtrasInhabil > 0 ? (
            <span className="text-purple-600 font-medium">
              {summary.hsExtrasInhabil.toFixed(1)}
            </span>
          ) : (
            '-'
          )}
        </TableCell>
        {/* 12. Presentismo */}
        <TableCell className="text-center">
          {summary.presentismo ? (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              SI
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
              NO
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-center">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={14} className="bg-muted/30 p-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Detalle de fichajes</h4>
              <div className="grid gap-1 max-h-48 overflow-y-auto">
                {summary.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin fichajes</p>
                ) : (
                  summary.entries.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-sm p-2 rounded ${
                        !entry.checkOut
                          ? 'bg-amber-50 border border-amber-200'
                          : entry.isHoliday
                            ? 'bg-purple-50 border border-purple-200'
                            : entry.isDayOff
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-background border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {format(new Date(entry.date + 'T12:00:00'), 'EEE d MMM', { locale: es })}
                        </span>
                        {entry.isHoliday && (
                          <Badge variant="outline" className="text-xs">
                            Feriado
                          </Badge>
                        )}
                        {entry.isDayOff && (
                          <Badge variant="outline" className="text-xs">
                            Franco
                          </Badge>
                        )}
                        {entry.earlyLeaveAuthorized && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            Retiro autorizado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600">
                          {format(new Date(entry.checkIn), 'HH:mm')}
                        </span>
                        {entry.checkOut ? (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-red-600">
                              {format(new Date(entry.checkOut), 'HH:mm')}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {entry.hoursDecimal.toFixed(1)}h
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Sin salida
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {summary.alertasDiarias.length > 0 && (
                <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                  <p className="text-xs font-medium text-amber-700">
                    ⚠️ {summary.diasConExceso} día(s) con más de {summary.alertasDiarias.length > 0 ? 'el límite diario' : '9 horas'}
                  </p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function LaborHoursSummary({ branchId }: LaborHoursSummaryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { summaries, stats, config, loading } = useLaborHours({ branchId, year, month });

  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const handleExportCSV = () => {
    const csv = generateLaborCSV(summaries, monthLabelCapitalized);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `liquidacion-${format(currentDate, 'yyyy-MM')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nota sobre configuración */}
      <Alert className="border-blue-200 bg-blue-50">
        <Scale className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Configuración laboral activa</AlertTitle>
        <AlertDescription className="text-blue-700 text-sm">
          Límite diario: <strong>{config.daily_hours_limit} hs</strong> · 
          Tolerancia tardanza: <strong>{config.late_tolerance_total_min} min acum.</strong> · 
          Extras = exceso diario sobre {config.daily_hours_limit}hs
        </AlertDescription>
      </Alert>

      {/* Header con navegación de mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {monthLabelCapitalized}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={month === new Date().getMonth() && year === new Date().getFullYear()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" onClick={handleExportCSV} disabled={summaries.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Liquidación
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalEmpleados}</div>
            <div className="text-xs text-muted-foreground">Empleados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{formatHoursDecimal(stats.totalHsEquipo)}</div>
            <div className="text-xs text-muted-foreground">Total horas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {stats.totalExtrasMes.toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground">Horas extras</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.empleadosConPresentismo}</div>
            <div className="text-xs text-muted-foreground">Con presentismo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.empleadosSinPresentismo}</div>
            <div className="text-xs text-muted-foreground">Sin presentismo</div>
          </CardContent>
        </Card>
      </div>

      {/* Leyenda de columnas */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Hs Regulares
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Primeras {config.daily_hours_limit}hs de cada día (sin feriado ni franco)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Extras Hábil
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Exceso sobre {config.daily_hours_limit}hs en Lunes a Viernes
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Extras Inhábil
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Exceso sobre {config.daily_hours_limit}hs en Sábados y Domingos
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Presentismo
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  SI = Sin faltas injustificadas y tardanza acumulada ≤ {config.late_tolerance_total_min} min.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Vacaciones
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Días de vacaciones programadas en los horarios del mes.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>

      {/* Tabla de empleados */}
      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium">Sin fichajes este mes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No hay registros de fichaje para {monthLabelCapitalized.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-center">Hs Trabajadas</TableHead>
                  <TableHead className="text-center">Hs Regulares</TableHead>
                  <TableHead className="text-center">Vacaciones</TableHead>
                  <TableHead className="text-center">Faltas Inj.</TableHead>
                  <TableHead className="text-center">Falta Just.</TableHead>
                  <TableHead className="text-center">Tardanza</TableHead>
                  <TableHead className="text-center">Hs Feriados</TableHead>
                  <TableHead className="text-center">Hs Franco</TableHead>
                  <TableHead className="text-center">Extras Hábil</TableHead>
                  <TableHead className="text-center">Extras Inhábil</TableHead>
                  <TableHead className="text-center">Presentismo</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <EmployeeRow
                    key={summary.userId}
                    summary={summary}
                    expanded={expandedUserId === summary.userId}
                    onToggle={() =>
                      setExpandedUserId(expandedUserId === summary.userId ? null : summary.userId)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
