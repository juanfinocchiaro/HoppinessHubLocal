import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  Calendar,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Clock,
  Receipt,
  ShieldCheck,
  BadgeDollarSign,
  Download,
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { useResumenProveedor, useMovimientosProveedor } from '@/hooks/useCuentaCorrienteProveedor';
import { useProveedores } from '@/hooks/useProveedores';
import { usePagoProveedorMutations, useFacturaById } from '@/hooks/useCompras';
import { PagoProveedorModal } from '@/components/finanzas/PagoProveedorModal';
import { ProveedorFormModal } from '@/components/finanzas/ProveedorFormModal';
import { ProveedorDocumentos } from '@/components/finanzas/ProveedorDocumentos';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { formatCurrency } from '@/lib/formatters';

const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

/** Format YYYY-MM-DD as "1 Feb 2026" */
function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CuentaCorrienteProveedorPage() {
  const { branchId, proveedorId } = useParams<{ branchId: string; proveedorId: string }>();
  const navigate = useNavigate();
  const { data: proveedores } = useProveedores(branchId);
  const proveedor = proveedores?.find((p) => p.id === proveedorId);
  const { data: resumen, isLoading: loadingResumen } = useResumenProveedor(branchId, proveedorId);
  const { data: movimientos, isLoading: loadingMov } = useMovimientosProveedor(
    branchId,
    proveedorId,
  );
  const { softDeletePago } = usePagoProveedorMutations();
  const [payingFacturaId, setPayingFacturaId] = useState<string | null>(null);
  const [payingAccountLevel, setPayingAccountLevel] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(false);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);
  const { data: facturaData } = useFacturaById(payingFacturaId);

  const saldoAFavor = resumen
    ? resumen.saldo_a_favor_facturas > 0
      ? resumen.saldo_a_favor_facturas
      : resumen.saldo_actual < 0
        ? Math.abs(resumen.saldo_actual)
        : 0
    : 0;

  const payingFactura =
    payingFacturaId && facturaData && proveedorId && branchId
      ? {
          ...facturaData,
          proveedor_id: proveedorId,
          branch_id: branchId,
        }
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={proveedor?.business_name || 'Proveedor'}
        subtitle={proveedor?.cuit ? `CUIT: ${proveedor.cuit}` : undefined}
        actions={
          <div className="flex gap-2">
            {movimientos && movimientos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToExcel(
                    movimientos.map((m: any) => ({
                      fecha: m.fecha ? formatLocalDate(m.fecha) : '-',
                      tipo: m.tipo || '-',
                      detalle: m.detalle || '-',
                      importe: m.importe || 0,
                      saldo: m.saldo_acumulado ?? '-',
                    })),
                    {
                      fecha: 'Fecha',
                      tipo: 'Tipo',
                      detalle: 'Detalle',
                      importe: 'Importe',
                      saldo: 'Saldo',
                    },
                    { filename: `cc-${proveedor?.business_name || 'proveedor'}` },
                  )
                }
              >
                <Download className="w-4 h-4 mr-1" /> Excel
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setPayingAccountLevel(true)}>
              <Plus className="w-4 h-4 mr-1" /> Registrar Pago
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/milocal/${branchId}/finanzas/proveedores`)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
          </div>
        }
      />

      {/* Alerta de facturas vencidas */}
      {resumen && resumen.facturas_vencidas > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tenés {resumen.facturas_vencidas} factura(s) vencida(s) por{' '}
            {formatCurrency(resumen.monto_vencido)}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loadingResumen ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))
        ) : resumen ? (
          <>
            {/* Card 1: Saldo Actual */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {resumen.saldo_actual > 0
                    ? 'Saldo Actual'
                    : resumen.saldo_actual < 0
                      ? 'Saldo a Favor'
                      : 'Saldo'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold font-mono ${resumen.saldo_actual < 0 ? 'text-green-600' : resumen.saldo_actual === 0 ? 'text-green-600' : ''}`}
                >
                  {formatCurrency(Math.abs(resumen.saldo_actual))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumen.saldo_actual > 0
                    ? 'Deuda total'
                    : resumen.saldo_actual < 0
                      ? 'Crédito disponible'
                      : 'Sin deuda'}
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Vencido */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Vencido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-lg font-semibold font-mono ${resumen.monto_vencido > 0 ? 'text-destructive' : ''}`}
                >
                  {formatCurrency(resumen.monto_vencido)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumen.facturas_vencidas > 0
                    ? `${resumen.facturas_vencidas} factura(s)`
                    : 'Sin vencimientos'}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Por Vencer */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Por Vencer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold font-mono">
                  {formatCurrency(resumen.monto_por_vencer)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumen.todas_vencidas
                    ? 'Todas vencidas'
                    : resumen.proximo_vencimiento
                      ? `Próx: ${formatLocalDate(resumen.proximo_vencimiento)}`
                      : 'Sin vencimientos'}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Pagos Pendientes de Verificación */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Pagos Pend. Verif.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-lg font-semibold font-mono ${resumen.pagos_pendientes_verif > 0 ? 'text-amber-600' : ''}`}
                >
                  {formatCurrency(resumen.total_pagado_pendiente_verif)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumen.pagos_pendientes_verif > 0
                    ? `${resumen.pagos_pendientes_verif} pago(s) verificando`
                    : 'Todo verificado'}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Datos del Proveedor */}
      {proveedor && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Datos del Proveedor</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditingProveedor(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>Razón Social:</strong> {proveedor.business_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>Teléfono:</strong> {proveedor.phone || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>Email:</strong> {proveedor.email || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>Cuenta Corriente:</strong>{' '}
                  {proveedor.permite_cuenta_corriente
                    ? `Sí (${proveedor.dias_pago_habitual || '-'} días)`
                    : 'No'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentos del proveedor */}
      {proveedorId && (
        <Card>
          <CardContent className="pt-6">
            <ProveedorDocumentos proveedorId={proveedorId} />
          </CardContent>
        </Card>
      )}

      {/* Historial de Movimientos - Redesigned */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Cuenta Corriente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMov ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !movimientos?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32">
                    <EmptyState
                      icon={CreditCard}
                      title="Sin movimientos"
                      description="No hay facturas ni pagos registrados"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => {
                  const isFactura = mov.tipo === 'factura';
                  const isOverdue =
                    isFactura &&
                    mov.due_date &&
                    parseLocalDate(mov.due_date) < new Date();
                  const isImputacion = !isFactura && mov.payment_method === 'imputacion_saldo';

                  return (
                    <TableRow key={`${mov.tipo}-${mov.id}`}>
                      {/* Fecha */}
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatLocalDate(mov.date)}
                      </TableCell>

                      {/* Tipo */}
                      <TableCell>
                        {isFactura ? (
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">Factura</span>
                          </div>
                        ) : isImputacion ? (
                          <div className="flex items-center gap-1.5">
                            <BadgeDollarSign className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-sm font-medium">Imputación</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-sm font-medium">Pago</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Detalle */}
                      <TableCell>
                        {isFactura ? (
                          <div>
                            <p className="text-sm font-medium">{mov.invoice_number}</p>
                            {mov.due_date && (
                              <p
                                className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                              >
                                Venc: {formatLocalDate(mov.due_date)}
                              </p>
                            )}
                          </div>
                        ) : isImputacion ? (
                          <div>
                            <p className="text-sm font-medium">Saldo a favor imputado</p>
                            <p className="text-xs text-muted-foreground">
                              Aplicado de mes anterior
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium capitalize">{mov.payment_method}</p>
                            {mov.referencia && (
                              <p className="text-xs text-muted-foreground">{mov.referencia}</p>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Importe (signed) */}
                      <TableCell className="text-right font-mono text-sm">
                        {isFactura ? (
                          <span className="text-destructive">+{formatCurrency(mov.amount)}</span>
                        ) : (
                          <span className="text-green-600">-{formatCurrency(mov.amount)}</span>
                        )}
                      </TableCell>

                      {/* Saldo running */}
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {mov.cumulative_balance < 0 ? (
                          <span className="text-green-600">
                            -{formatCurrency(Math.abs(mov.cumulative_balance))}
                          </span>
                        ) : (
                          <span>{formatCurrency(mov.cumulative_balance)}</span>
                        )}
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        {isFactura &&
                          (mov.estado === 'pagado' ? (
                            <Badge variant="default" className="text-xs">
                              Pagado
                            </Badge>
                          ) : isOverdue ? (
                            <Badge variant="destructive" className="text-xs">
                              Vencida
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Pendiente
                            </Badge>
                          ))}
                        {!isFactura && mov.is_verified === false && (
                          <Badge
                            variant="outline"
                            className="text-xs text-amber-600 border-amber-300 gap-1"
                          >
                            <Clock className="w-3 h-3" />
                            Verificando
                          </Badge>
                        )}
                        {!isFactura && mov.is_verified === true && (
                          <Badge variant="default" className="text-xs gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Verificado
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex gap-1 justify-end items-center">
                          {isFactura && mov.estado !== 'pagado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setPayingFacturaId(mov.id)}
                            >
                              Registrar Pago
                            </Button>
                          )}
                          {!isFactura && !mov.is_verified && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Eliminar pago"
                              onClick={() => setDeletingPagoId(mov.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PagoProveedorModal
        open={!!payingFacturaId}
        onOpenChange={() => setPayingFacturaId(null)}
        factura={payingFactura as any}
        proveedorNombre={proveedor?.business_name}
        saldoAFavor={saldoAFavor}
      />

      <PagoProveedorModal
        open={payingAccountLevel}
        onOpenChange={setPayingAccountLevel}
        factura={null}
        proveedorNombre={proveedor?.business_name}
        proveedorId={proveedorId}
        branchId={branchId}
      />

      <ConfirmDialog
        open={!!deletingPagoId}
        onOpenChange={() => setDeletingPagoId(null)}
        title="Eliminar pago"
        description="¿Estás seguro de eliminar este pago? El saldo de la factura se actualizará automáticamente."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deletingPagoId) await softDeletePago.mutateAsync(deletingPagoId);
          setDeletingPagoId(null);
        }}
      />

      {proveedor && (
        <ProveedorFormModal
          open={editingProveedor}
          onOpenChange={setEditingProveedor}
          proveedor={proveedor}
        />
      )}
    </div>
  );
}
