/**
 * ShiftClosureModal - Main modal for shift closure entry
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { BurgersSection } from './BurgersSection';
import { LocalSalesSection } from './LocalSalesSection';
import { PosnetComparisonSection } from './PosnetComparisonSection';
import { AppSalesSection } from './AppSalesSection';
import { CashCountSection } from './CashCountSection';
import { InvoicingSection } from './InvoicingSection';
import { ClosureSummary } from './ClosureSummary';
import { ClosureHelpManual } from './ClosureHelpManual';

import { useSaveShiftClosure, useShiftClosure, useEnabledShifts } from '@/hooks/useShiftClosures';
import { useAfipConfig } from '@/hooks/useAfipConfig';
import {
  getDefaultHamburguesas,
  getDefaultVentasLocal,
  getDefaultVentasApps,
  getDefaultArqueoCaja,
  calcularTotalesHamburguesas,
  calcularTotalesVentasLocal,
  calcularTotalesVentasApps,
  calcularFacturacionEsperada,
  calcularNoFacturado,
  calcularDiferenciaPosnet,
  calcularDiferenciasApps,
  migrateVentasApps,
  migrateVentasLocal,
} from '@/types/shiftClosure';
import type {
  HamburguesasData,
  VentasLocalData,
  VentasAppsData,
  ArqueoCaja,
  ComparacionPosnet,
  ShiftType,
} from '@/types/shiftClosure';

interface ShiftClosureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  defaultShift?: string;
  defaultDate?: Date;
}

export function ShiftClosureModal({
  open,
  onOpenChange,
  branchId,
  branchName,
  defaultShift = 'mediodía',
  defaultDate,
}: ShiftClosureModalProps) {
  const [fecha, setFecha] = useState<Date>(defaultDate || new Date());
  const [turno, setTurno] = useState<ShiftType>(defaultShift as ShiftType);
  const [hamburguesas, setHamburguesas] = useState<HamburguesasData>(getDefaultHamburguesas());
  const [ventasLocal, setVentasLocal] = useState<VentasLocalData>(getDefaultVentasLocal());
  const [ventasApps, setVentasApps] = useState<VentasAppsData>(getDefaultVentasApps());
  const [arqueoCaja, setArqueoCaja] = useState<ArqueoCaja>(getDefaultArqueoCaja());
  const [totalFacturado, setTotalFacturado] = useState(0);
  const [notas, setNotas] = useState('');

  // Load enabled shifts
  const { data: enabledShifts } = useEnabledShifts(branchId);

  // Load existing closure if any
  const fechaStr = format(fecha, 'yyyy-MM-dd');
  const { data: existingClosure } = useShiftClosure(branchId, fechaStr, turno);

  // Save mutation
  const saveMutation = useSaveShiftClosure();

  // Populate form with existing data (with migration for old format)
  useEffect(() => {
    if (existingClosure) {
      setHamburguesas(existingClosure.hamburguesas);
      // Migrate old format to new format
      setVentasLocal(migrateVentasLocal(existingClosure.ventas_local));
      setVentasApps(migrateVentasApps(existingClosure.ventas_apps));
      setArqueoCaja(existingClosure.arqueo_caja || getDefaultArqueoCaja());
      setTotalFacturado(Number(existingClosure.total_facturado) || 0);
      setNotas(existingClosure.notes || '');
    } else {
      // Reset to defaults when switching to a new shift
      setHamburguesas(getDefaultHamburguesas());
      setVentasLocal(getDefaultVentasLocal());
      setVentasApps(getDefaultVentasApps());
      setArqueoCaja(getDefaultArqueoCaja());
      setTotalFacturado(0);
      setNotas('');
    }
  }, [existingClosure, fechaStr, turno]);

  // Load AFIP config for invoicing rules
  const { data: afipConfig } = useAfipConfig(branchId);
  const reglasFacturacion = afipConfig?.reglas_facturacion ?? null;

  // Calculate totals
  const totals = useMemo(() => {
    const totalHamburguesas = calcularTotalesHamburguesas(hamburguesas);
    const totalesLocal = calcularTotalesVentasLocal(ventasLocal);
    const totalesApps = calcularTotalesVentasApps(ventasApps);

    const totalVendido = totalesLocal.total + totalesApps.total;
    const totalEfectivo = totalesLocal.efectivo + totalesApps.efectivo;
    const totalDigital = totalesLocal.digital + totalesApps.digital;

    const facturacionEsperada = calcularFacturacionEsperada(
      ventasLocal,
      ventasApps,
      reglasFacturacion,
    );
    const noFacturado = calcularNoFacturado(ventasLocal, ventasApps, reglasFacturacion);

    return {
      totalHamburguesas,
      subtotalLocal: totalesLocal.total,
      subtotalApps: totalesApps.total,
      totalVendido,
      totalEfectivo,
      totalDigital,
      noFacturado,
      facturacionEsperada,
    };
  }, [hamburguesas, ventasLocal, ventasApps, reglasFacturacion]);

  // Calculate alerts
  const alertas = useMemo(() => {
    const posnetDiff = calcularDiferenciaPosnet(ventasLocal, ventasApps);
    const appsDiff = calcularDiferenciasApps(ventasApps);
    const cajaAlerta = arqueoCaja.diferencia_caja !== 0;
    const facturacionAlerta =
      totals.facturacionEsperada > 0 &&
      Math.abs(totalFacturado - totals.facturacionEsperada) > totals.facturacionEsperada * 0.1;

    return {
      posnet: posnetDiff.tieneAlerta,
      apps: appsDiff.tieneAlerta,
      caja: cajaAlerta,
      facturacion: facturacionAlerta,
    };
  }, [ventasLocal, ventasApps, arqueoCaja, totalFacturado, totals.facturacionEsperada]);

  // Handle posnet change
  const handlePosnetChange = (data: ComparacionPosnet) => {
    setVentasLocal((prev) => ({
      ...prev,
      comparacion_posnet: data,
    }));
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      branch_id: branchId,
      date: fechaStr,
      shift: turno,
      hamburguesas,
      ventas_local: ventasLocal,
      ventas_apps: ventasApps,
      arqueo_caja: arqueoCaja,
      total_facturado: totalFacturado,
      notes: notas || undefined,
      reglas_facturacion: reglasFacturacion,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Cierre de Turno</DialogTitle>
              <p className="text-sm text-muted-foreground">{branchName}</p>
            </div>
            <ClosureHelpManual />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-4 pb-4">
            {/* Date and Shift selectors */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date picker */}
              <div>
                <Label className="text-xs text-muted-foreground">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !fecha && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fecha ? format(fecha, 'PPP', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(d) => d && setFecha(d)}
                      locale={es}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Shift selector */}
              <div>
                <Label className="text-xs text-muted-foreground">Turno</Label>
                <Select value={turno} onValueChange={(v) => setTurno(v as ShiftType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledShifts?.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="mediodía">Mediodía</SelectItem>
                        <SelectItem value="noche">Noche</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 1. Hamburguesas */}
            <BurgersSection
              data={hamburguesas}
              onChange={setHamburguesas}
              totalHamburguesas={totals.totalHamburguesas}
            />

            {/* 2. Ventas Mostrador */}
            <LocalSalesSection
              data={ventasLocal}
              onChange={setVentasLocal}
              subtotal={totals.subtotalLocal}
              ventasApps={ventasApps}
            />

            {/* 3. Comparación Posnet */}
            <PosnetComparisonSection
              ventasLocal={ventasLocal}
              ventasApps={ventasApps}
              onPosnetChange={handlePosnetChange}
            />

            {/* 4. Ventas Apps */}
            <AppSalesSection
              branchId={branchId}
              data={ventasApps}
              onChange={setVentasApps}
              subtotal={totals.subtotalApps}
            />

            {/* 5. Arqueo de Caja */}
            <CashCountSection data={arqueoCaja} onChange={setArqueoCaja} />

            {/* 6. Facturación */}
            <InvoicingSection
              totalFacturado={totalFacturado}
              onTotalFacturadoChange={setTotalFacturado}
              facturacionEsperada={totals.facturacionEsperada}
              totalVendido={totals.totalVendido}
              noFacturado={totals.noFacturado}
            />

            {/* 7. Resumen */}
            <ClosureSummary
              totalHamburguesas={totals.totalHamburguesas}
              totalVendido={totals.totalVendido}
              totalEfectivo={totals.totalEfectivo}
              totalDigital={totals.totalDigital}
              totalFacturado={totalFacturado}
              alertas={alertas}
            />

            {/* 8. Notas */}
            <div>
              <Label className="text-xs text-muted-foreground">Notas del turno (opcional)</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones, incidentes, novedades..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
