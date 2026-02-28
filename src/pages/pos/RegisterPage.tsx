/**
 * RegisterPage - Sistema de 3 Cajas: Ventas, Alivio, Fuerte
 */
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Receipt, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePrinting } from '@/hooks/usePrinting';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { generateCashClosingReport, type CashClosingReportData } from '@/lib/escpos';
import {
  useCashRegistersByType,
  useCashShifts,
  useCashMovements,
  useCloseShift,
  useTransferBetweenRegisters,
  calculateExpectedCash,
  canViewSection,
} from '@/hooks/useCashRegister';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { RegisterOpenModal } from '@/components/pos/RegisterOpenModal';
import { ManualIncomeModal } from '@/components/pos/ManualIncomeModal';
import { QuickExpenseModal } from '@/components/pos/QuickExpenseModal';
import { CajaExpensesList } from '@/components/pos/CajaExpensesList';
import { CashierDiscrepancyStats } from '@/components/pos/CashierDiscrepancyStats';
import { CajaAlivioCard } from '@/components/pos/CajaAlivioCard';
import { CajaFuerteCard } from '@/components/pos/CajaFuerteCard';
import { CashTransferModal } from '@/components/pos/CashTransferModal';
import { fetchBranchName } from '@/services/posService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const { localRole, isSuperadmin } = useDynamicPermissions(branchId);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseAlivioModal, setShowExpenseAlivioModal] = useState(false);
  const [showExpenseFuerteModal, setShowExpenseFuerteModal] = useState(false);
  const [showAlivioModal, setShowAlivioModal] = useState(false);
  const [showRetiroAlivioModal, setShowRetiroAlivioModal] = useState(false);
  const [showRetiroFuerteModal, setShowRetiroFuerteModal] = useState(false);
  const [alivioAmount, setAlivioAmount] = useState('');
  const [alivioNotes, setAlivioNotes] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const canApproveExpenses =
    isSuperadmin || ['franquiciado', 'encargado'].includes(localRole ?? '');

  const printing = usePrinting(branchId);
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);

  const { data: branchData } = useQuery({
    queryKey: ['branch-basic', branchId],
    queryFn: () => fetchBranchName(branchId!),
    enabled: !!branchId,
  });

  // Get the 3 registers
  const { ventas, alivio, fuerte, isLoading: loadingRegisters } = useCashRegistersByType(branchId);

  // Shifts for alivio & fuerte (perpetual)
  const alivioShiftIds = alivio ? [alivio.id] : [];
  const fuerteShiftIds = fuerte ? [fuerte.id] : [];
  const { data: alivioShifts } = useCashShifts(branchId, alivioShiftIds);
  const { data: fuerteShifts } = useCashShifts(branchId, fuerteShiftIds);
  const alivioShift = alivio && alivioShifts ? (alivioShifts[alivio.id] ?? null) : null;
  const fuerteShift = fuerte && fuerteShifts ? (fuerteShifts[fuerte.id] ?? null) : null;

  // Movements for alivio & fuerte
  const { data: alivioMovements = [] } = useCashMovements(alivioShift?.id);
  const { data: fuerteMovements = [] } = useCashMovements(fuerteShift?.id);

  // Ventas shift (existing logic)
  const shiftStatus = useShiftStatus(branchId);
  const activeShift = shiftStatus.activeCashShift;
  const { data: movements = [] } = useCashMovements(activeShift?.id ?? undefined);

  const expectedCash = useMemo(
    () => (activeShift ? calculateExpectedCash(activeShift, movements) : 0),
    [activeShift, movements],
  );

  const closeShiftMutation = useCloseShift(branchId ?? '');
  const transferMutation = useTransferBetweenRegisters(branchId ?? '');

  const alivioBalance = useMemo(() => {
    if (!alivioShift) return 0;
    if (alivioShift.current_balance != null) return Number(alivioShift.current_balance);
    let amount = Number(alivioShift.opening_amount);
    for (const mov of alivioMovements) {
      if (mov.type === 'income' || mov.type === 'deposit') amount += Number(mov.amount);
      else amount -= Number(mov.amount);
    }
    return amount;
  }, [alivioShift, alivioMovements]);

  const fuerteBalance = useMemo(() => {
    if (!fuerteShift) return 0;
    if (fuerteShift.current_balance != null) return Number(fuerteShift.current_balance);
    let amount = Number(fuerteShift.opening_amount);
    for (const mov of fuerteMovements) {
      if (mov.type === 'income' || mov.type === 'deposit') amount += Number(mov.amount);
      else amount -= Number(mov.amount);
    }
    return amount;
  }, [fuerteShift, fuerteMovements]);

  const handleAlivio = async () => {
    if (!user || !activeShift || !alivioAmount || !alivioShift) return;
    const amount = parseFloat(alivioAmount);
    if (amount <= 0 || amount > expectedCash) {
      toast.error('Monto inválido');
      return;
    }
    try {
      await transferMutation.mutateAsync({
        sourceShiftId: activeShift.id,
        destShiftId: alivioShift.id,
        amount,
        concept: `Alivio a Caja de Alivio${alivioNotes ? ` - ${alivioNotes}` : ''}`,
        userId: user.id,
      });
      toast.success(`Alivio realizado: $ ${amount.toLocaleString('es-AR')}`);
      setShowAlivioModal(false);
      setAlivioAmount('');
      setAlivioNotes('');
    } catch (e: any) {
      toast.error(e?.message || 'Error al realizar alivio');
    }
  };

  const printClosingReport = async (shift: typeof activeShift, counted: number) => {
    if (!shift || !branchData || printing.bridgeStatus !== 'connected') return;
    const ticketPrinter = printConfig?.ticket_printer_id
      ? (printersData ?? []).find((p: any) => p.id === printConfig.ticket_printer_id && p.is_active)
      : null;
    if (!ticketPrinter) return;

    const totalIncome = movements
      .filter((m) => m.type === 'income' || m.type === 'deposit')
      .reduce((s, m) => s + Number(m.amount), 0);
    const totalExpenses = movements
      .filter((m) => m.type === 'expense' || m.type === 'withdrawal')
      .reduce((s, m) => s + Number(m.amount), 0);

    const reportData: CashClosingReportData = {
      register_name: 'Caja de Ventas',
      opened_at: shift.opened_at,
      closed_at: new Date().toISOString(),
      opened_by: user?.email?.split('@')[0] || 'Operador',
      closed_by: user?.email?.split('@')[0] || 'Operador',
      opening_amount: Number(shift.opening_amount),
      total_income: totalIncome,
      total_expenses: totalExpenses,
      expected_amount: expectedCash,
      closing_amount: counted,
      difference: counted - expectedCash,
      movements: movements.slice(0, 30).map((m) => ({
        time: m.created_at,
        concept: m.concept,
        type:
          m.type === 'income' || m.type === 'deposit' ? ('income' as const) : ('expense' as const),
        amount: Number(m.amount),
      })),
    };

    try {
      const data = generateCashClosingReport(
        reportData,
        branchData.name,
        ticketPrinter.paper_width,
      );
      const { printRawBase64 } = await import('@/lib/qz-print');
      await printRawBase64(ticketPrinter.ip_address!, ticketPrinter.port, data);
      toast.success('Informe de cierre impreso');
    } catch {
      toast.error('No se pudo imprimir el informe de cierre');
    }
  };

  const handleConfirmClose = async () => {
    if (!user || !activeShift) return;
    const counted = parseFloat(closingAmount) || 0;
    await closeShiftMutation.mutateAsync({
      shiftId: activeShift.id,
      userId: user.id,
      closingAmount: counted,
      expectedAmount: expectedCash,
      notes: closingNotes.trim() || undefined,
    });

    await printClosingReport(activeShift, counted);

    setClosingAmount('');
    setClosingNotes('');
    setShowCloseModal(false);
    shiftStatus.refetch();
  };

  const isLoading = loadingRegisters || shiftStatus.loading;
  if (isLoading && !shiftStatus.hasChecked) return <Skeleton className="h-48 w-full" />;

  const showAlivioSection = alivio && canViewSection('alivio', localRole, isSuperadmin);
  const showFuerteSection = fuerte && canViewSection('fuerte', localRole, isSuperadmin);

  return (
    <div className="space-y-6">
      <PageHeader title="Cajas" subtitle="Gestión de efectivo por turno" />

      {/* â”€â”€ Modals â”€â”€ */}
      <RegisterOpenModal
        open={showOpenModal}
        onOpenChange={setShowOpenModal}
        branchId={branchId!}
        onOpened={() => shiftStatus.refetch()}
      />
      <ManualIncomeModal
        open={showIncomeModal}
        onOpenChange={setShowIncomeModal}
        branchId={branchId!}
        shiftId={activeShift?.id}
      />
      <QuickExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        branchId={branchId!}
        shiftId={activeShift?.id}
        registerLabel="Caja de Ventas"
      />
      <QuickExpenseModal
        open={showExpenseAlivioModal}
        onOpenChange={setShowExpenseAlivioModal}
        branchId={branchId!}
        shiftId={alivioShift?.id}
        registerLabel="Caja de Alivio"
      />
      <QuickExpenseModal
        open={showExpenseFuerteModal}
        onOpenChange={setShowExpenseFuerteModal}
        branchId={branchId!}
        shiftId={fuerteShift?.id}
        registerLabel="Caja Fuerte"
      />

      {/* Close modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Monto esperado (calculado)</Label>
              <p className="text-2xl font-semibold mt-1">
                $ {expectedCash.toLocaleString('es-AR')}
              </p>
            </div>
            <div>
              <Label>Monto contado</Label>
              <Input
                type="number"
                placeholder="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Motivo de diferencia..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmClose}
              disabled={closeShiftMutation.isPending || closingAmount === ''}
            >
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alivio modal */}
      <Dialog open={showAlivioModal} onOpenChange={setShowAlivioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hacer Alivio</DialogTitle>
            <DialogDescription>Transferir efectivo a Caja de Alivio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Efectivo disponible</p>
              <p className="text-2xl font-bold">$ {expectedCash.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <Label>Monto a aliviar</Label>
              <Input
                type="number"
                placeholder="0"
                value={alivioAmount}
                onChange={(e) => setAlivioAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            {parseFloat(alivioAmount) > expectedCash && (
              <p className="text-xs text-destructive">El monto supera el efectivo disponible</p>
            )}
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Ej: Alivio de mediodía"
                value={alivioNotes}
                onChange={(e) => setAlivioNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlivioModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAlivio}
              disabled={
                !alivioAmount ||
                parseFloat(alivioAmount) <= 0 ||
                parseFloat(alivioAmount) > expectedCash ||
                transferMutation.isPending
              }
            >
              Confirmar Alivio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retiro Alivio â†’ Fuerte */}
      <CashTransferModal
        open={showRetiroAlivioModal}
        onOpenChange={setShowRetiroAlivioModal}
        branchId={branchId!}
        sourceShift={alivioShift}
        destShift={fuerteShift}
        maxAmount={alivioBalance}
        title="Retirar a Caja Fuerte"
        description="Transferir efectivo de Caja de Alivio a Caja Fuerte"
        conceptPrefix="Retiro a Caja Fuerte"
      />

      {/* Retiro final Fuerte */}
      <CashTransferModal
        open={showRetiroFuerteModal}
        onOpenChange={setShowRetiroFuerteModal}
        branchId={branchId!}
        sourceShift={fuerteShift}
        destShift={null}
        maxAmount={fuerteBalance}
        title="Registrar Retiro"
        description="Registrar retiro de efectivo de Caja Fuerte"
        conceptPrefix="Retiro de Caja Fuerte"
      />

      {/* â•â•â• SECCIÃ“N 1: CAJA DE VENTAS â•â•â• */}
      {shiftStatus.hasCashOpen && activeShift ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">Caja de Ventas â€” Abierta</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Abierta el {new Date(activeShift.opened_at).toLocaleString('es-AR')}
                </p>
                <p className="text-sm mt-1">
                  Fondo apertura: $ {Number(activeShift.opening_amount).toLocaleString('es-AR')}
                </p>
                <p className="text-sm font-medium mt-2">
                  Efectivo esperado: $ {expectedCash.toLocaleString('es-AR')}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setShowIncomeModal(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ingreso
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowExpenseModal(true)}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Egreso
                  </Button>
                  {alivioShift && (
                    <Button variant="outline" size="sm" onClick={() => setShowAlivioModal(true)}>
                      <Wallet className="h-4 w-4 mr-2" />
                      Alivio
                    </Button>
                  )}
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowCloseModal(true)}
                  disabled={closeShiftMutation.isPending}
                >
                  Cerrar caja
                </Button>
              </div>
            </div>
            {movements.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Ãšltimos movimientos</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {movements.slice(0, 5).map((m) => (
                    <li key={m.id}>
                      {m.type === 'income' || m.type === 'deposit' ? '+' : '-'} ${' '}
                      {Number(m.amount).toLocaleString('es-AR')} â€” {m.concept}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">No hay caja abierta</p>
            <p className="text-sm mb-4">Abrí la caja para poder registrar cobros en el POS.</p>
            <Button onClick={() => setShowOpenModal(true)} disabled={!ventas}>
              Abrir caja
            </Button>
          </CardContent>
        </Card>
      )}

      {shiftStatus.hasCashOpen && activeShift && user && (
        <CashierDiscrepancyStats
          userId={user.id}
          branchId={branchId}
          showCurrentDiscrepancy={false}
        />
      )}

      {/* Expenses list for Ventas */}
      {activeShift && (
        <CajaExpensesList
          shiftId={activeShift.id}
          branchId={branchId!}
          registerLabel="Caja de Ventas"
          canApprove={canApproveExpenses}
        />
      )}

      {/* â•â•â• SECCIÃ“N 2: CAJA DE ALIVIO â•â•â• */}
      {showAlivioSection && alivio && (
        <CajaAlivioCard
          register={alivio}
          shift={alivioShift}
          movements={alivioMovements}
          localRole={localRole}
          isSuperadmin={isSuperadmin}
          onRetiroClick={() => setShowRetiroAlivioModal(true)}
          onExpenseClick={canApproveExpenses ? () => setShowExpenseAlivioModal(true) : undefined}
          expensesList={
            alivioShift && canApproveExpenses ? (
              <CajaExpensesList
                shiftId={alivioShift.id}
                branchId={branchId!}
                registerLabel="Caja de Alivio"
                canApprove={canApproveExpenses}
              />
            ) : undefined
          }
        />
      )}

      {/* â•â•â• SECCIÃ“N 3: CAJA FUERTE â•â•â• */}
      {showFuerteSection && fuerte && (
        <CajaFuerteCard
          register={fuerte}
          shift={fuerteShift}
          movements={fuerteMovements}
          localRole={localRole}
          isSuperadmin={isSuperadmin}
          onRetiroClick={() => setShowRetiroFuerteModal(true)}
          onExpenseClick={canApproveExpenses ? () => setShowExpenseFuerteModal(true) : undefined}
          expensesList={
            fuerteShift && canApproveExpenses ? (
              <CajaExpensesList
                shiftId={fuerteShift.id}
                branchId={branchId!}
                registerLabel="Caja Fuerte"
                canApprove={canApproveExpenses}
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
