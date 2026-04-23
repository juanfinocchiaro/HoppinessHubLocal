import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronDown,
  Wallet,
  Building2,
} from 'lucide-react';
import { useRdoFinanciero } from '@/hooks/useRdoFinanciero';
import { getCurrentPeriodo } from '@/types/compra';

const METODO_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit_card: 'Tarjeta Débito',
  credit_card: 'Tarjeta Crédito',
  mercadopago_qr: 'MercadoPago QR',
  transfer: 'Transferencia',
};

const GASTO_CAT_LABELS: Record<string, string> = {
  servicios: 'Servicios',
  alquiler: 'Alquiler',
  impuestos: 'Impuestos',
  mantenimiento: 'Mantenimiento',
  marketing: 'Marketing',
  administracion: 'Administración',
  otros: 'Otros',
};

function fmtCurrency(value: number) {
  return `$ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

function RdoLine({
  label,
  value,
  pct,
  indent = 0,
  bold = false,
}: {
  label: string;
  value: number;
  pct?: number;
  indent?: number;
  bold?: boolean;
}) {
  const pl = indent === 1 ? 'pl-5' : indent === 2 ? 'pl-10' : '';
  return (
    <div
      className={`flex justify-between items-center py-1.5 ${pl} ${bold ? 'font-semibold text-base' : 'text-sm'}`}
    >
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <div className="flex items-center gap-3">
        {pct !== undefined && (
          <span className="text-xs text-muted-foreground font-mono w-14 text-right">
            {pct.toFixed(1)}%
          </span>
        )}
        <span
          className={`font-mono min-w-[100px] text-right ${value < 0 ? 'text-destructive' : ''}`}
        >
          {fmtCurrency(value)}
        </span>
      </div>
    </div>
  );
}

function CollapsibleSection({
  label,
  value,
  pct,
  bold,
  children,
}: {
  label: string;
  value: number;
  pct?: number;
  bold?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex justify-between items-center py-1.5 w-full text-left hover:bg-muted/40 rounded-sm transition-colors ${bold ? 'font-semibold text-base' : 'text-sm font-medium'}`}
      >
        <span className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          {label}
        </span>
        <div className="flex items-center gap-3">
          {pct !== undefined && (
            <span className="text-xs text-muted-foreground font-mono w-14 text-right">
              {pct.toFixed(1)}%
            </span>
          )}
          <span className={`font-mono min-w-[100px] text-right ${bold ? 'font-bold' : ''}`}>
            {fmtCurrency(value)}
          </span>
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

interface RdoFinancieroDashboardProps {
  branchId: string;
}

export function RdoFinancieroDashboard({ branchId }: RdoFinancieroDashboardProps) {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const { data, isLoading } = useRdoFinanciero(branchId, periodo);

  const periodos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const ingresos = data?.ingresos ?? { total: 0, aportes_socios: 0, por_metodo: {} };
  const egresos = data?.egresos ?? {
    proveedores: 0,
    gastos_total: 0,
    adelantos_sueldo: 0,
    retiros_socios: 0,
    inversiones_capex: 0,
    gastos_por_categoria: {},
  };
  const totalIngresos = (ingresos.total ?? 0) + (ingresos.aportes_socios ?? 0);
  const totalEgresos =
    (egresos.proveedores ?? 0) +
    (egresos.gastos_total ?? 0) +
    (egresos.adelantos_sueldo ?? 0) +
    (egresos.retiros_socios ?? 0);
  const resultadoFinanciero = data?.resultado_financiero ?? 0;
  const flujoNeto = data?.flujo_neto ?? 0;
  const margen = totalIngresos > 0 ? (resultadoFinanciero / totalIngresos) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resultado Financiero</h2>
          <p className="text-sm text-muted-foreground">
            Flujo de caja real: ingresos cobrados vs egresos pagados
          </p>
          <Badge variant="outline" className="mt-1 gap-1 text-xs">
            <Wallet className="w-3 h-3" />
            Base percibido (caja)
          </Badge>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodos.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUp className="w-4 h-4" /> Ingresos
                </div>
                <div className="text-2xl font-bold font-mono mt-1">
                  {fmtCurrency(totalIngresos)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Cobrado en caja</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowDown className="w-4 h-4" /> Egresos
                </div>
                <div className="text-2xl font-bold font-mono mt-1">{fmtCurrency(totalEgresos)}</div>
                <div className="text-xs text-muted-foreground mt-1">Pagos efectuados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {resultadoFinanciero >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  Resultado
                </div>
                <div
                  className={`text-2xl font-bold font-mono mt-1 ${resultadoFinanciero < 0 ? 'text-destructive' : ''}`}
                >
                  {fmtCurrency(resultadoFinanciero)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {margen.toFixed(1)}% margen
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" /> Flujo Neto
                </div>
                <div
                  className={`text-2xl font-bold font-mono mt-1 ${flujoNeto < 0 ? 'text-destructive' : ''}`}
                >
                  {fmtCurrency(flujoNeto)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Incluye CAPEX</div>
              </CardContent>
            </Card>
          </div>

          {/* Detail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" />
                Detalle — {periodo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Ingresos */}
              <CollapsibleSection label="Ingresos Cobrados" value={totalIngresos} pct={100} bold>
                {Object.entries(ingresos.por_metodo ?? {}).map(([metodo, monto]) => (
                  <RdoLine
                    key={metodo}
                    label={METODO_LABELS[metodo] || metodo}
                    value={monto as number}
                    pct={totalIngresos > 0 ? ((monto as number) / totalIngresos) * 100 : 0}
                    indent={1}
                  />
                ))}
                {(ingresos.aportes_socios ?? 0) > 0 && (
                  <RdoLine label="Aportes de Socios" value={ingresos.aportes_socios} indent={1} />
                )}
              </CollapsibleSection>

              <Separator className="my-3" />

              {/* Egresos */}
              <CollapsibleSection
                label="Egresos Pagados"
                value={totalEgresos}
                pct={totalIngresos > 0 ? (totalEgresos / totalIngresos) * 100 : 0}
                bold
              >
                <RdoLine
                  label="Pagos a Proveedores"
                  value={egresos.proveedores ?? 0}
                  pct={totalIngresos > 0 ? ((egresos.proveedores ?? 0) / totalIngresos) * 100 : 0}
                  indent={1}
                />

                {Object.keys(egresos.gastos_por_categoria ?? {}).length > 0 && (
                  <CollapsibleSection
                    label="Gastos Pagados"
                    value={egresos.gastos_total ?? 0}
                    pct={
                      totalIngresos > 0 ? ((egresos.gastos_total ?? 0) / totalIngresos) * 100 : 0
                    }
                  >
                    {Object.entries(egresos.gastos_por_categoria ?? {}).map(([cat, monto]) => (
                      <RdoLine
                        key={cat}
                        label={GASTO_CAT_LABELS[cat] || cat}
                        value={monto as number}
                        indent={2}
                      />
                    ))}
                  </CollapsibleSection>
                )}
                {(egresos.gastos_total ?? 0) > 0 &&
                  Object.keys(egresos.gastos_por_categoria ?? {}).length === 0 && (
                    <RdoLine label="Gastos Pagados" value={egresos.gastos_total ?? 0} indent={1} />
                  )}

                <RdoLine
                  label="Adelantos de Sueldo"
                  value={egresos.adelantos_sueldo ?? 0}
                  indent={1}
                />
                <RdoLine label="Retiros de Socios" value={egresos.retiros_socios ?? 0} indent={1} />
              </CollapsibleSection>

              <Separator className="my-3" />

              {/* Resultado Financiero */}
              <div className="flex justify-between items-center py-3 bg-muted/30 px-3 rounded-md">
                <span className="font-bold text-lg">Resultado Financiero</span>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={resultadoFinanciero >= 0 ? 'default' : 'destructive'}
                    className="text-sm"
                  >
                    {margen.toFixed(1)}%
                  </Badge>
                  <span
                    className={`font-mono font-bold text-lg ${resultadoFinanciero < 0 ? 'text-destructive' : ''}`}
                  >
                    {fmtCurrency(resultadoFinanciero)}
                  </span>
                </div>
              </div>

              <Separator className="my-3" />

              {/* CAPEX */}
              <RdoLine
                label="Inversiones (CAPEX) pagadas"
                value={egresos.inversiones_capex ?? 0}
                bold
              />

              <Separator className="my-3" />

              {/* Flujo neto */}
              <div className="flex justify-between items-center py-3 bg-muted/30 px-3 rounded-md">
                <span className="font-bold text-lg">Flujo Neto de Caja</span>
                <div className="flex items-center gap-3">
                  <Badge variant={flujoNeto >= 0 ? 'default' : 'destructive'} className="text-sm">
                    {totalIngresos > 0 ? ((flujoNeto / totalIngresos) * 100).toFixed(1) : '0.0'}%
                  </Badge>
                  <span
                    className={`font-mono font-bold text-lg ${flujoNeto < 0 ? 'text-destructive' : ''}`}
                  >
                    {fmtCurrency(flujoNeto)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
