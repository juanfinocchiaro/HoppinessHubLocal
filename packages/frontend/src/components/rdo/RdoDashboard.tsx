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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
} from 'lucide-react';
import { getCurrentPeriodo } from '@/types/compra';
import { RDO_SECTIONS } from '@/types/rdo';
import type { RdoReportLine } from '@/types/rdo';
import { useRdoUnifiedReport } from '@/hooks/useRdoUnifiedReport';
import { formatCurrency } from '@/lib/formatters';

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
  const formatted = `$ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pl = indent === 1 ? 'pl-5' : indent === 2 ? 'pl-10' : indent === 3 ? 'pl-14' : '';
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
          {formatted}
        </span>
      </div>
    </div>
  );
}

function CollapsibleRow({
  label,
  value,
  pct,
  indent = 0,
  bold = false,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  value: number;
  pct?: number;
  indent?: number;
  bold?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const formatted = `$ ${Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pl = indent === 1 ? 'pl-4' : indent === 2 ? 'pl-8' : '';
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex justify-between items-center py-1.5 w-full text-left hover:bg-muted/40 rounded-sm transition-colors ${pl} ${bold ? 'font-semibold text-base' : 'text-sm font-medium'}`}
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
            {formatted}
          </span>
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

function SectionBlock({
  title,
  lines,
  ventas,
}: {
  title: string;
  lines: RdoReportLine[];
  ventas: number;
}) {
  const level2 = lines.filter((l) => l.level === 2);
  const level3 = lines.filter((l) => l.level === 3);
  const sectionTotal = level3.reduce((s, l) => s + l.total, 0);
  const sectionPct = ventas > 0 ? (sectionTotal / ventas) * 100 : 0;
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(
    Object.fromEntries(level2.map((p) => [p.category_code, true])),
  );

  return (
    <CollapsibleRow
      label={title}
      value={sectionTotal}
      pct={sectionPct}
      bold
      expanded={sectionExpanded}
      onToggle={() => setSectionExpanded((e) => !e)}
    >
      {level2.map((parent) => {
        const children = level3.filter((c) => c.parent_code === parent.category_code);
        const parentTotal = children.reduce((s, c) => s + c.total, 0);
        const parentPct = ventas > 0 ? (parentTotal / ventas) * 100 : 0;
        return (
          <CollapsibleRow
            key={parent.category_code}
            label={parent.category_name}
            value={parentTotal}
            pct={parentPct}
            indent={1}
            bold
            expanded={!!expandedParents[parent.category_code]}
            onToggle={() =>
              setExpandedParents((prev) => ({
                ...prev,
                [parent.category_code]: !prev[parent.category_code],
              }))
            }
          >
            {children.map((child) => (
              <RdoLine
                key={child.category_code}
                label={child.category_name}
                value={child.total}
                pct={child.percentage}
                indent={2}
              />
            ))}
          </CollapsibleRow>
        );
      })}
    </CollapsibleRow>
  );
}

interface RdoDashboardProps {
  branchId: string;
}

export function RdoDashboard({ branchId }: RdoDashboardProps) {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [ventasExpanded, setVentasExpanded] = useState(true);
  const [cmvExpanded, setCmvExpanded] = useState(true);
  const [cmvRubrosExpanded, setCmvRubrosExpanded] = useState<Record<string, boolean>>({});
  const [ivaExpanded, setIvaExpanded] = useState(true);

  const { data, isLoading, isError, error } = useRdoUnifiedReport(branchId, periodo, {
    canales: [],
    mediosPago: [],
    categorias: [],
    productos: [],
  });

  const periodos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const totalVentas = data?.multivista.totales.total_ventas || 0;
  const totalVentasNetas = data?.fiscal.ventas_netas_rdo || totalVentas;
  const ivaVentas = data?.fiscal.iva_ventas || 0;
  const ivaVentasBruto = data?.fiscal.iva_ventas_bruto || ivaVentas;
  const ivaNotasCredito = data?.fiscal.iva_notas_credito || 0;
  const ivaCompras = data?.fiscal.iva_compras || 0;
  const saldoIva = data?.fiscal.saldo_iva || 0;
  const rdoLines = data?.rdo_lines || [];
  const fijos = rdoLines.filter((l) => l.rdo_section === 'costos_fijos');

  // CMV data
  const cmvAuto = data?.cmv.cmv_auto || 0;
  const cmvAjuste = data?.cmv.cmv_manual_ajuste || 0;
  const cmvPorRubro = data?.cmv.por_rubro || [];
  const cmvTotal = cmvAuto + cmvAjuste;

  // Other variable costs (excluding CMV lines that come from rdo_lines to avoid duplication)
  const variablesNoCmv = rdoLines.filter(
    (l) =>
      l.rdo_section === 'costos_variables' && !(l.level === 3 && l.category_code.startsWith('cmv')),
  );
  const totalVariablesNoCmv = variablesNoCmv
    .filter((l) => l.level === 3)
    .reduce((s, l) => s + l.total, 0);

  // Unified total: CMV + other variable costs
  const totalVariables = cmvTotal + totalVariablesNoCmv;
  const totalFijos = fijos.filter((l) => l.level === 3).reduce((s, l) => s + l.total, 0);
  const totalCostos = totalVariables + totalFijos;
  const resultadoOperativo = totalVentasNetas - totalCostos;
  const resultadoEconomico = resultadoOperativo - saldoIva;
  const margenOperativo = totalVentasNetas > 0 ? (resultadoOperativo / totalVentasNetas) * 100 : 0;

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar Resultado Económico: {(error as Error)?.message || 'desconocido'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resultado Económico</h2>
          <p className="text-sm text-muted-foreground">
            Estado de resultados mensual (base devengado)
          </p>
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

      {(totalVentas > 0 && cmvAuto === 0) ||
      (data?.diagnostico_costos.items_sin_costo_count || 0) > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {totalVentas > 0 && cmvAuto === 0
              ? 'Hay ventas en el período pero el CMV automático es 0. Revisá costos de carta y mapeo de items.'
              : 'Se detectaron productos vendidos sin costo cargado.'}{' '}
            Items sin costo: <strong>{data?.diagnostico_costos.items_sin_costo_count || 0}</strong>{' '}
            · Ventas afectadas:{' '}
            <strong>{formatCurrency(data?.diagnostico_costos.ventas_afectadas || 0)}</strong>.{' '}
            Corregi costos en{' '}
            <a href="/mimarca/carta" className="underline">
              Mi Marca {'>'} Carta
            </a>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {/* KPI Cards — flujo del P&L */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" /> Ventas Netas
            </div>
            <div className="text-2xl font-bold font-mono mt-1">
              {formatCurrency(totalVentasNetas)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDown className="w-4 h-4" /> Costos Totales
            </div>
            <div className="text-2xl font-bold font-mono mt-1">{formatCurrency(totalCostos)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalVentasNetas > 0 ? ((totalCostos / totalVentasNetas) * 100).toFixed(1) : 0}%
              s/ventas
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUp className="w-4 h-4" /> Margen Operativo
            </div>
            <div className="text-2xl font-bold font-mono mt-1">{margenOperativo.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(resultadoOperativo)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {resultadoEconomico >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              Resultado Económico
            </div>
            <div
              className={`text-2xl font-bold font-mono mt-1 ${resultadoEconomico < 0 ? 'text-destructive' : ''}`}
            >
              {formatCurrency(resultadoEconomico)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Operativo - IVA neto</div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Cascada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Estado de Resultados — {periodo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Ventas Netas */}
          <CollapsibleRow
            label="Ventas Netas"
            value={totalVentasNetas}
            pct={100}
            bold
            expanded={ventasExpanded}
            onToggle={() => setVentasExpanded((e) => !e)}
          >
            <RdoLine
              label="Ventas facturadas (total c/IVA antes NC)"
              value={data?.fiscal.ventas_facturadas_brutas_original || 0}
              indent={1}
            />
            <RdoLine
              label="Base imponible facturada (neto antes NC)"
              value={(data?.fiscal.ventas_facturadas_brutas_original || 0) - ivaVentasBruto}
              indent={2}
            />
            <RdoLine
              label="(-) Notas de Crédito (total c/IVA)"
              value={-(data?.fiscal.notas_credito_brutas || 0)}
              indent={1}
            />
            <RdoLine
              label="Ventas facturadas vigentes (total c/IVA)"
              value={data?.fiscal.ventas_facturadas_brutas || 0}
              indent={1}
            />
            <RdoLine label="(-) IVA facturado neto de NC" value={-ivaVentas} indent={1} />
            <RdoLine label="   • IVA facturas emitidas" value={-ivaVentasBruto} indent={2} />
            <RdoLine label="   • Reverso IVA por NC" value={ivaNotasCredito} indent={2} />
            <RdoLine
              label="Ventas facturadas (neto)"
              value={data?.fiscal.ventas_facturadas_netas || 0}
              indent={1}
            />
            <RdoLine
              label="Ventas sin facturar (neto)"
              value={data?.fiscal.ventas_no_facturadas_netas || 0}
              indent={1}
            />
          </CollapsibleRow>

          <Separator className="my-3" />

          {/* Costos Variables — Unified tree with CMV inside */}
          <CollapsibleRow
            label={RDO_SECTIONS.costos_variables}
            value={totalVariables}
            pct={totalVentasNetas > 0 ? (totalVariables / totalVentasNetas) * 100 : 0}
            bold
            expanded={cmvExpanded}
            onToggle={() => setCmvExpanded((e) => !e)}
          >
            {/* 1. CMV (Costo de Mercadería Vendida) */}
            {cmvTotal > 0 && (
              <CollapsibleRow
                label="CMV (Costo de Mercadería Vendida)"
                value={cmvTotal}
                pct={totalVentasNetas > 0 ? (cmvTotal / totalVentasNetas) * 100 : 0}
                indent={1}
                bold
                expanded={!!cmvRubrosExpanded['_cmv_root']}
                onToggle={() =>
                  setCmvRubrosExpanded((prev) => ({ ...prev, _cmv_root: !prev['_cmv_root'] }))
                }
              >
                {/* CMV Automático: desglose por categoría de carta */}
                {cmvPorRubro.length > 0 ? (
                  cmvPorRubro.map((rubro) => {
                    const expanded = !!cmvRubrosExpanded[rubro.category_code];
                    return (
                      <div key={rubro.category_code} className="pl-8">
                        <button
                          type="button"
                          onClick={() =>
                            setCmvRubrosExpanded((prev) => ({
                              ...prev,
                              [rubro.category_code]: !prev[rubro.category_code],
                            }))
                          }
                          className="w-full flex items-center justify-between py-1.5 text-sm hover:bg-muted/40 rounded-sm transition-colors"
                        >
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            {expanded ? (
                              <Minus className="w-3.5 h-3.5" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            {rubro.category_name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-mono w-14 text-right">
                              {totalVentasNetas > 0
                                ? ((rubro.total / totalVentasNetas) * 100).toFixed(1)
                                : '0.0'}
                              %
                            </span>
                            <span className="font-mono min-w-[100px] text-right">
                              {formatCurrency(rubro.total)}
                            </span>
                          </div>
                        </button>
                        {expanded &&
                          rubro.gastos.map((gasto, idx) => (
                            <RdoLine
                              key={`${rubro.category_code}-${gasto.producto_id || idx}`}
                              label={`${gasto.producto_nombre} (${gasto.cantidad.toFixed(0)} uds)`}
                              value={gasto.total}
                              indent={3}
                            />
                          ))}
                      </div>
                    );
                  })
                ) : cmvAuto > 0 ? (
                  <RdoLine label="CMV Automático (recetas POS)" value={cmvAuto} indent={2} />
                ) : null}

                {/* CMV por Deducción de Stock */}
                {cmvAjuste !== 0 && (
                  <div className="pl-8">
                    <button
                      type="button"
                      onClick={() =>
                        setCmvRubrosExpanded((prev) => ({ ...prev, _stock: !prev['_stock'] }))
                      }
                      className="w-full flex items-center justify-between py-1.5 text-sm hover:bg-muted/40 rounded-sm transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {cmvRubrosExpanded['_stock'] ? (
                          <Minus className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        Consumo por Deducción de Stock
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono w-14 text-right">
                          {totalVentasNetas > 0
                            ? ((cmvAjuste / totalVentasNetas) * 100).toFixed(1)
                            : '0.0'}
                          %
                        </span>
                        <span className="font-mono min-w-[100px] text-right">
                          {formatCurrency(cmvAjuste)}
                        </span>
                      </div>
                    </button>
                    {cmvRubrosExpanded['_stock'] && (
                      <div className="pl-6 py-1.5 text-xs text-muted-foreground space-y-1 border-l-2 border-border/50 ml-2">
                        <p className="font-medium">
                          Packaging, Descartables, Insumos no en receta.
                        </p>
                        <p>Fórmula: Stock Inicial + Compras − Stock Final = Consumo</p>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleRow>
            )}

            {/* 2. Other variable costs from rdo_lines (non-CMV) */}
            {(() => {
              const level2 = variablesNoCmv.filter((l) => l.level === 2);
              const level3 = variablesNoCmv.filter((l) => l.level === 3);
              return level2.map((parent) => {
                const children = level3.filter((c) => c.parent_code === parent.category_code);
                const parentTotal = children.reduce((s, c) => s + c.total, 0);
                if (parentTotal === 0 && children.length === 0) return null;
                const parentPct = totalVentasNetas > 0 ? (parentTotal / totalVentasNetas) * 100 : 0;
                return (
                  <CollapsibleRow
                    key={parent.category_code}
                    label={parent.category_name}
                    value={parentTotal}
                    pct={parentPct}
                    indent={1}
                    bold
                    expanded={!!cmvRubrosExpanded[parent.category_code]}
                    onToggle={() =>
                      setCmvRubrosExpanded((prev) => ({
                        ...prev,
                        [parent.category_code]: !prev[parent.category_code],
                      }))
                    }
                  >
                    {children.map((child) => (
                      <RdoLine
                        key={child.category_code}
                        label={child.category_name}
                        value={child.total}
                        pct={child.percentage}
                        indent={2}
                      />
                    ))}
                  </CollapsibleRow>
                );
              });
            })()}
          </CollapsibleRow>

          <Separator className="my-3" />

          {/* Contribución Marginal */}
          <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded-md">
            <span className="font-bold">Contribución Marginal</span>
            <div className="flex items-center gap-3">
              <Badge variant={totalVentasNetas - totalVariables >= 0 ? 'default' : 'destructive'}>
                {totalVentasNetas > 0
                  ? (((totalVentasNetas - totalVariables) / totalVentasNetas) * 100).toFixed(1)
                  : 0}
                %
              </Badge>
              <span
                className={`font-mono font-bold ${totalVentasNetas - totalVariables < 0 ? 'text-destructive' : ''}`}
              >
                {formatCurrency(totalVentasNetas - totalVariables)}
              </span>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Costos Fijos */}
          <SectionBlock title={RDO_SECTIONS.costos_fijos} lines={fijos} ventas={totalVentasNetas} />

          <Separator className="my-3" />

          {/* Resultado Operativo */}
          <div className="flex justify-between items-center py-3 bg-muted/30 px-3 rounded-md">
            <span className="font-bold text-lg">Resultado Operativo</span>
            <div className="flex items-center gap-3">
              <Badge
                variant={resultadoOperativo >= 0 ? 'default' : 'destructive'}
                className="text-sm"
              >
                {margenOperativo.toFixed(1)}%
              </Badge>
              <span
                className={`font-mono font-bold text-lg ${resultadoOperativo < 0 ? 'text-destructive' : ''}`}
              >
                {formatCurrency(resultadoOperativo)}
              </span>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Control Fiscal IVA */}
          <CollapsibleRow
            label="Control Fiscal IVA"
            value={saldoIva}
            pct={totalVentasNetas > 0 ? (saldoIva / totalVentasNetas) * 100 : 0}
            bold
            expanded={ivaExpanded}
            onToggle={() => setIvaExpanded((e) => !e)}
          >
            <RdoLine label="IVA Ventas (débito fiscal bruto)" value={ivaVentasBruto} indent={1} />
            <RdoLine label="(-) Notas de Crédito (IVA)" value={-ivaNotasCredito} indent={1} />
            <RdoLine label="IVA Ventas Neto" value={ivaVentas} indent={1} />
            <RdoLine label="IVA Compras (crédito fiscal)" value={-ivaCompras} indent={1} />
            <RdoLine label="Saldo IVA (a pagar / favor)" value={saldoIva} indent={1} bold />
          </CollapsibleRow>

          <Separator className="my-3" />

          {/* Resultado Económico (bottom line) */}
          <div className="flex justify-between items-center py-3 bg-primary/10 px-3 rounded-md border border-primary/20">
            <span className="font-bold text-lg">Resultado Económico</span>
            <div className="flex items-center gap-3">
              <Badge
                variant={resultadoEconomico >= 0 ? 'default' : 'destructive'}
                className="text-sm"
              >
                {totalVentasNetas > 0
                  ? ((resultadoEconomico / totalVentasNetas) * 100).toFixed(1)
                  : '0.0'}
                %
              </Badge>
              <span
                className={`font-mono font-bold text-lg ${resultadoEconomico < 0 ? 'text-destructive' : ''}`}
              >
                {formatCurrency(resultadoEconomico)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
