/**
 * AdvancesPage - Gestión de adelantos de sueldo
 * V2: Sin pending_transfer, con filtro mensual
 */
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchTeamMembersBasic } from '@/services/warningsService';
import {
  useSalaryAdvances,
  useCreateAdvance,
  useCancelAdvance,
  useApproveAdvance,
  useRejectAdvance,
} from '@/hooks/useSalaryAdvances';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  DollarSign,
  Banknote,
  CreditCard,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  X,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/formatters';

type Branch = Tables<'branches'>;

export default function AdvancesPage() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const { user: _user } = useAuth();
  const { local } = useDynamicPermissions(branchId);

  const [showNewAdvance, setShowNewAdvance] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: advances, isLoading } = useSalaryAdvances(branchId, selectedMonth);
  const createAdvance = useCreateAdvance();
  const cancelAdvance = useCancelAdvance();
  const approveAdvance = useApproveAdvance();
  const rejectAdvance = useRejectAdvance();

  const { data: teamMembers } = useQuery({
    queryKey: ['branch-team-members', branchId],
    queryFn: () => fetchBranchTeamMembersBasic(branchId!),
    enabled: !!branchId,
  });

  

  const handleCreateAdvance = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0 || !branchId) {
      toast.error('Completá los campos requeridos');
      return;
    }

    try {
      await createAdvance.mutateAsync({
        branchId,
        userId: selectedUser,
        amount: parseFloat(amount),
        reason,
        paymentMethod,
      });

      setShowNewAdvance(false);
      resetForm();
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setAmount('');
    setReason('');
    setPaymentMethod('cash');
  };

  const pendingAdvances = advances?.filter((a) => a.status === 'pending') || [];

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      {
        label: string;
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        icon: React.ElementType;
      }
    > = {
      pending: { label: 'Pendiente', variant: 'outline', icon: Clock },
      paid: { label: 'Efectivo', variant: 'default', icon: Banknote },
      transferred: { label: 'Transferencia', variant: 'default', icon: CreditCard },
      deducted: { label: 'Descontado', variant: 'secondary', icon: DollarSign },
      cancelled: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
    };

    const {
      label,
      variant,
      icon: Icon,
    } = config[status] || { label: status, variant: 'outline' as const, icon: CheckCircle };
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  // Stats
  const thisMonthTotal =
    advances?.filter((a) => a.status !== 'cancelled').reduce((sum, a) => sum + a.amount, 0) || 0;
  const cashTotal =
    advances
      ?.filter((a) => a.payment_method === 'cash' && a.status !== 'cancelled')
      .reduce((sum, a) => sum + a.amount, 0) || 0;
  const transferTotal =
    advances
      ?.filter((a) => a.payment_method === 'transfer' && a.status !== 'cancelled')
      .reduce((sum, a) => sum + a.amount, 0) || 0;

  const goToPrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const goToNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Adelantos de Sueldo"
        subtitle={branch?.name}
        actions={
          local.canCreateSalaryAdvance ? (
            <Dialog open={showNewAdvance} onOpenChange={setShowNewAdvance}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Adelanto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Adelanto</DialogTitle>
                  <DialogDescription>
                    Registrá un adelanto ya entregado al empleado
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Empleado *</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers?.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id!}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {member.full_name || 'Sin nombre'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Monto *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Forma de pago</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('cash')}
                        className="justify-start"
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Efectivo
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('transfer')}
                        className="justify-start"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Transferencia
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo (opcional)</Label>
                    <Textarea
                      placeholder="Motivo del adelanto..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewAdvance(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateAdvance}
                    disabled={!selectedUser || !amount || createAdvance.isPending}
                  >
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {/* Month Navigator */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium capitalize">
              {format(selectedMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total del mes</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(thisMonthTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Banknote className="h-4 w-4" /> Efectivo
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(cashTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Transferencia
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(transferTotal)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingAdvances.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Solicitudes Pendientes ({pendingAdvances.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingAdvances.map((adv) => (
              <div
                key={adv.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{adv.user_name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(adv.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                      {adv.reason && ` · ${adv.reason}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{formatCurrency(adv.amount)}</span>
                  {local.canCreateSalaryAdvance && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() =>
                          approveAdvance.mutate({ advanceId: adv.id, paymentMethod: 'cash' })
                        }
                        disabled={approveAdvance.isPending}
                      >
                        <Banknote className="h-4 w-4 mr-1" />
                        Efectivo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() =>
                          approveAdvance.mutate({ advanceId: adv.id, paymentMethod: 'transfer' })
                        }
                        disabled={approveAdvance.isPending}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Transferir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectAdvance.mutate(adv.id)}
                        disabled={rejectAdvance.isPending}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Advances List */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay adelantos en este mes
                </TableCell>
              </TableRow>
            ) : (
              advances?.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(advance.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium">{advance.user_name || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(advance.amount)}</TableCell>
                  <TableCell>{getStatusBadge(advance.status)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {advance.reason || '-'}
                  </TableCell>
                  <TableCell>
                    {local.canCancelSalaryAdvance && advance.status !== 'cancelled' && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelId(advance.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancelar adelanto"
        description="¿Estás seguro de que querés cancelar este adelanto? Esta acción no se puede deshacer."
        confirmLabel="Cancelar adelanto"
        variant="destructive"
        onConfirm={() => {
          if (cancelId) cancelAdvance.mutate(cancelId);
          setCancelId(null);
        }}
      />
    </div>
  );
}
