/**
 * LaborHoursSummary Component
 *
 * Resumen de horas trabajadas con cards individuales por empleado.
 * Cada card muestra mini-tabla de puestos + métricas globales como badges.
 */
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  UtensilsCrossed,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useLaborHours,
  formatHoursDecimal,
  type EmployeeLaborSummary,
} from '@/hooks/useLaborHours';
import { useWorkPositions } from '@/hooks/useWorkPositions';
import { exportLaborPDF, exportLaborExcel } from '@/utils/laborExport';
import { exportEmployeePDF, exportEmployeeExcel, EmployeeFinancialData } from '@/utils/laborEmployeeExport';
import {
  useEmployeeConsumptionsByMonth,
  useSalaryAdvancesByMonth,
  aggregateByUser,
  EmployeeConsumption,
} from '@/hooks/useEmployeeConsumptions';
import { EmployeeConsumptionModal } from '@/components/local/EmployeeConsumptionModal';
import { EmployeeConsumptionListModal } from '@/components/local/EmployeeConsumptionListModal';

interface LaborHoursSummaryProps {
  branchId: string;
}

function PositionLabel({ posKey, positions }: { posKey: string; positions: { key: string; label: string }[] }) {
  const pos = positions.find((p) => p.key === posKey);
  return <>{pos?.label || posKey.charAt(0).toUpperCase() + posKey.slice(1)}</>;
}

function CellValue({ value, decimals = 1, color }: { value: number; decimals?: number; color?: string }) {
  if (value <= 0) return <span className="text-muted-foreground">-</span>;
  return <span className={color || ''}>{value.toFixed(decimals)}</span>;
}

function EmployeeCard({
  summary,
  expanded,
  onToggle,
  monthLabel,
  branchTag,
  monthOnly,
  yearStr,
  positions,
  consumos,
  adelantos,
  onAddConsumo,
  onViewConsumos,
}: {
  summary: EmployeeLaborSummary;
  expanded: boolean;
  onToggle: () => void;
  monthLabel: string;
  branchTag: string;
  monthOnly: string;
  yearStr: string;
  positions: { key: string; label: string }[];
  consumos: number;
  adelantos: number;
  onAddConsumo: () => void;
  onViewConsumos: () => void;
}) {
  const initials = summary.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasMultiplePositions = summary.positionBreakdown.length > 1;
  const hasSinglePosition = summary.positionBreakdown.length === 1;

  return (
    <Card className={summary.hasUnpairedEntries ? 'border-amber-300' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Avatar + Name + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={summary.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="font-semibold text-sm">{summary.userName}</span>
              {summary.hasUnpairedEntries && (
                <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-300">
                  {summary.unpairedCount} sin salida
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const empName = summary.userName.toUpperCase().replace(/\s+/g, '_');
                  const empFin = { consumos, adelantos };
                  exportEmployeePDF(summary, monthLabel, `${branchTag}_LIQUIDACION_${monthOnly}_${yearStr}_${empName}`, empFin);
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF individual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const empName = summary.userName.toUpperCase().replace(/\s+/g, '_');
                  exportEmployeeExcel(summary, monthLabel, `${branchTag}_LIQUIDACION_${monthOnly}_${yearStr}_${empName}`);
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel individual
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mini-table: hours by position */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs py-1.5 px-2">Puesto</TableHead>
                <TableHead className="text-xs py-1.5 px-2 text-center">Hs Trab</TableHead>
                <TableHead className="text-xs py-1.5 px-2 text-center">Hs Reg</TableHead>
                <TableHead className="text-xs py-1.5 px-2 text-center">Feriados</TableHead>
                <TableHead className="text-xs py-1.5 px-2 text-center">Franco</TableHead>
                <TableHead className="text-xs py-1.5 px-2 text-center">Ext. Háb</TableHead>
                <TableHead className="text-xs py-1.5 px-2 text-center">Ext. Inh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Single position: one row, no TOTAL */}
              {hasSinglePosition && (
                <TableRow>
                  <TableCell className="py-1.5 px-2 text-sm">
                    <PositionLabel posKey={summary.positionBreakdown[0].position} positions={positions} />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm font-semibold">{summary.hsTrabajadasMes.toFixed(1)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsRegulares} /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.feriadosHs} /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsFrancoTrabajado} color="text-blue-600" /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsExtrasDiaHabil} color="text-amber-600" /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsExtrasInhabil} color="text-purple-600" /></TableCell>
                </TableRow>
              )}

              {/* Multiple positions: sub-rows + TOTAL */}
              {hasMultiplePositions && (
                <>
                  {summary.positionBreakdown.map((pb) => (
                    <TableRow key={pb.position} className="hover:bg-muted/30">
                      <TableCell className="py-1.5 px-2 text-sm">
                        <PositionLabel posKey={pb.position} positions={positions} />
                      </TableCell>
                      <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={pb.hsTrabajadas} /></TableCell>
                      <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={pb.hsRegulares} /></TableCell>
                      <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={pb.feriadosHs} /></TableCell>
                      <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={pb.hsFrancoTrabajado} color="text-blue-600" /></TableCell>
                      <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={pb.hsExtrasDiaHabil} color="text-amber-600" /></TableCell>
                      <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={pb.hsExtrasInhabil} color="text-purple-600" /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 border-t">
                    <TableCell className="py-1.5 px-2 text-sm font-bold">TOTAL</TableCell>
                    <TableCell className="py-1.5 px-2 text-center text-sm font-bold">{summary.hsTrabajadasMes.toFixed(1)}</TableCell>
                    <TableCell className="py-1.5 px-2 text-center text-sm font-semibold"><CellValue value={summary.hsRegulares} /></TableCell>
                    <TableCell className="py-1.5 px-2 text-center text-sm font-semibold"><CellValue value={summary.feriadosHs} /></TableCell>
                    <TableCell className="py-1.5 px-2 text-center text-sm font-semibold"><CellValue value={summary.hsFrancoTrabajado} color="text-blue-600" /></TableCell>
                    <TableCell className="py-1.5 px-2 text-center text-sm font-semibold"><CellValue value={summary.hsExtrasDiaHabil} color="text-amber-600" /></TableCell>
                    <TableCell className="py-1.5 px-2 text-center text-sm font-semibold"><CellValue value={summary.hsExtrasInhabil} color="text-purple-600" /></TableCell>
                  </TableRow>
                </>
              )}

              {/* No position breakdown at all */}
              {summary.positionBreakdown.length === 0 && (
                <TableRow>
                  <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">Sin puesto</TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm font-semibold">{summary.hsTrabajadasMes.toFixed(1)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsRegulares} /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.feriadosHs} /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsFrancoTrabajado} color="text-blue-600" /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsExtrasDiaHabil} color="text-amber-600" /></TableCell>
                  <TableCell className="py-1.5 px-2 text-center text-sm"><CellValue value={summary.hsExtrasInhabil} color="text-purple-600" /></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Metrics bar: global employee data as badges */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs pt-1 border-t">
          <span className="text-muted-foreground">
            Vacaciones: {summary.diasVacaciones > 0 ? <span className="text-cyan-600 font-medium">{summary.diasVacaciones}d</span> : '-'}
          </span>
          <span className="text-muted-foreground">
            Faltas Inj: {summary.faltasInjustificadas > 0 ? <span className="text-destructive font-medium">{summary.faltasInjustificadas}</span> : '0'}
          </span>
          <span className="text-muted-foreground">
            F. Just: {summary.hsLicencia > 0 ? <span className="text-orange-600 font-medium">{summary.hsLicencia.toFixed(1)}h</span> : '-'}
          </span>
          <span className="text-muted-foreground">
            Tardanza: {summary.tardanzaAcumuladaMin > 0 ? <span className="text-amber-600 font-medium">{summary.tardanzaAcumuladaMin}m</span> : '0m'}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            Consumos:{' '}
            {consumos > 0 ? (
              <button
                className="text-violet-600 font-medium underline underline-offset-2 hover:text-violet-800 cursor-pointer bg-transparent border-none p-0"
                onClick={onViewConsumos}
              >
                ${consumos.toLocaleString('es-AR')}
              </button>
            ) : '-'}
            <Button variant="ghost" size="icon" className="h-5 w-5 ml-0.5" onClick={onAddConsumo} title="Registrar consumo">
              <UtensilsCrossed className="h-3 w-3" />
            </Button>
          </span>
          <span className="text-muted-foreground">
            Adelantos: {adelantos > 0 ? <span className="text-indigo-600 font-medium">${adelantos.toLocaleString('es-AR')}</span> : '-'}
          </span>
          <span className="ml-auto">
            {summary.presentismo ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Presentismo: SI</Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">Presentismo: NO</Badge>
            )}
          </span>
        </div>

        {/* Expandable: clock-in detail */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
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
                      {entry.isHoliday && <Badge variant="outline" className="text-xs">Feriado</Badge>}
                      {entry.isDayOff && <Badge variant="outline" className="text-xs">Franco</Badge>}
                      {entry.earlyLeaveAuthorized && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">Retiro autorizado</Badge>
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
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Sin salida</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {summary.alertasDiarias.length > 0 && (
              <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs font-medium text-amber-700">
                  ⚠️ {summary.diasConExceso} día(s) con más de el límite diario
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LaborHoursSummary({ branchId }: LaborHoursSummaryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [consumptionTarget, setConsumptionTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [consumptionListTarget, setConsumptionListTarget] = useState<{ userId: string; userName: string } | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { summaries, stats, config, loading } = useLaborHours({ branchId, year, month });
  const { data: workPositions = [] } = useWorkPositions();
  const positionsList = workPositions.map((p) => ({ key: p.key, label: p.label }));

  const { data: consumptions = [] } = useEmployeeConsumptionsByMonth(branchId, year, month);
  const { data: advances = [] } = useSalaryAdvancesByMonth(branchId, year, month);
  const financialMap = aggregateByUser(consumptions, advances);

  const { data: branchName = '' } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
      return data?.name || '';
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });

  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const monthOnly = format(currentDate, 'MMMM', { locale: es }).toUpperCase();
  const yearStr = format(currentDate, 'yyyy');
  const branchTag = branchName.toUpperCase().replace(/\s+/g, '_');

  const configInfo = { dailyLimit: config.daily_hours_limit, lateTolerance: config.late_tolerance_total_min };

  const handleExportPDF = () => {
    const filename = `${branchTag}_LIQUIDACION_${monthOnly}_${yearStr}_FULL`;
    exportLaborPDF(summaries, stats, monthLabelCapitalized, configInfo, filename, financialMap);
  };

  const handleExportExcel = () => {
    const filename = `${branchTag}_LIQUIDACION_${monthOnly}_${yearStr}_FULL`;
    exportLaborExcel(summaries, stats, monthLabelCapitalized, configInfo, filename, financialMap);
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
      {/* Config alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Scale className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Configuración laboral activa</AlertTitle>
        <AlertDescription className="text-blue-700 text-sm">
          Límite diario: <strong>{config.daily_hours_limit} hs</strong> · 
          Tolerancia tardanza: <strong>{config.late_tolerance_total_min} min acum.</strong> · 
          Extras = exceso diario sobre {config.daily_hours_limit}hs
        </AlertDescription>
      </Alert>

      {/* Month navigation */}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={summaries.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Liquidación
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar como PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar como Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      {(() => {
        const totals = summaries.reduce(
          (acc, s) => ({
            hsTrabajadas: acc.hsTrabajadas + s.hsTrabajadasMes,
            hsRegulares: acc.hsRegulares + s.hsRegulares,
            vacaciones: acc.vacaciones + s.diasVacaciones,
            faltasInj: acc.faltasInj + s.faltasInjustificadas,
            faltaJust: acc.faltaJust + s.hsLicencia,
            tardanza: acc.tardanza + s.tardanzaAcumuladaMin,
            hsFeriados: acc.hsFeriados + s.feriadosHs,
            hsFranco: acc.hsFranco + s.hsFrancoTrabajado,
            extrasHabil: acc.extrasHabil + s.hsExtrasDiaHabil,
            extrasInhabil: acc.extrasInhabil + s.hsExtrasInhabil,
          }),
          { hsTrabajadas: 0, hsRegulares: 0, vacaciones: 0, faltasInj: 0, faltaJust: 0, tardanza: 0, hsFeriados: 0, hsFranco: 0, extrasHabil: 0, extrasInhabil: 0 },
        );
        const cards: { label: string; value: string; color?: string }[] = [
          { label: 'Hs Trabajadas', value: formatHoursDecimal(totals.hsTrabajadas) },
          { label: 'Hs Regulares', value: formatHoursDecimal(totals.hsRegulares) },
          { label: 'Vacaciones', value: `${totals.vacaciones}d`, color: 'text-blue-600' },
          { label: 'Faltas Inj.', value: totals.faltasInj.toString(), color: totals.faltasInj > 0 ? 'text-destructive' : undefined },
          { label: 'Falta Just.', value: totals.faltaJust > 0 ? `${totals.faltaJust.toFixed(1)}h` : '-' },
          { label: 'Tardanza', value: `${totals.tardanza}m`, color: totals.tardanza > 0 ? 'text-orange-600' : undefined },
          { label: 'Hs Feriados', value: totals.hsFeriados > 0 ? `${totals.hsFeriados.toFixed(1)}h` : '-' },
          { label: 'Hs Franco', value: totals.hsFranco > 0 ? `${totals.hsFranco.toFixed(1)}h` : '-' },
          { label: 'Extras Hábil', value: totals.extrasHabil > 0 ? `${totals.extrasHabil.toFixed(1)}h` : '-', color: totals.extrasHabil > 0 ? 'text-green-600' : undefined },
          { label: 'Extras Inhábil', value: totals.extrasInhabil > 0 ? `${totals.extrasInhabil.toFixed(1)}h` : '-', color: totals.extrasInhabil > 0 ? 'text-green-600' : undefined },
          { label: 'Con Presentismo', value: stats.empleadosConPresentismo.toString(), color: 'text-green-600' },
          { label: 'Sin Presentismo', value: stats.empleadosSinPresentismo.toString(), color: 'text-destructive' },
        ];
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-2.5 text-center">
                  <div className={`text-xl font-bold ${c.color || ''}`}>{c.value}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{c.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

      {/* Legend */}
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
                <p className="max-w-xs">Exceso sobre {config.daily_hours_limit}hs en Lunes a Viernes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Extras Inhábil
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Exceso sobre {config.daily_hours_limit}hs en Sábados y Domingos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Presentismo
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">SI = Sin faltas injustificadas y tardanza acumulada ≤ {config.late_tolerance_total_min} min.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Vacaciones
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Días de vacaciones programadas en los horarios del mes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>

      {/* Employee cards */}
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
        <div className="space-y-3">
          {summaries.map((summary) => (
            <EmployeeCard
              key={summary.userId}
              summary={summary}
              expanded={expandedUserId === summary.userId}
              onToggle={() => setExpandedUserId(expandedUserId === summary.userId ? null : summary.userId)}
              monthLabel={monthLabelCapitalized}
              branchTag={branchTag}
              monthOnly={monthOnly}
              yearStr={yearStr}
              positions={positionsList}
              consumos={financialMap.get(summary.userId)?.consumos ?? 0}
              adelantos={financialMap.get(summary.userId)?.adelantos ?? 0}
              onAddConsumo={() => setConsumptionTarget({ userId: summary.userId, userName: summary.userName })}
              onViewConsumos={() => setConsumptionListTarget({ userId: summary.userId, userName: summary.userName })}
            />
          ))}
        </div>
      )}

      {consumptionTarget && (
        <EmployeeConsumptionModal
          open={!!consumptionTarget}
          onOpenChange={(open) => { if (!open) setConsumptionTarget(null); }}
          branchId={branchId}
          userId={consumptionTarget.userId}
          userName={consumptionTarget.userName}
        />
      )}

      {consumptionListTarget && (
        <EmployeeConsumptionListModal
          open={!!consumptionListTarget}
          onOpenChange={(open) => { if (!open) setConsumptionListTarget(null); }}
          branchId={branchId}
          userId={consumptionListTarget.userId}
          userName={consumptionListTarget.userName}
          year={year}
          month={month}
        />
      )}
    </div>
  );
}
