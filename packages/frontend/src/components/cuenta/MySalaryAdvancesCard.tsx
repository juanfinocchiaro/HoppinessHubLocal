import { useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useQuery } from '@tanstack/react-query';
import { fetchMySalaryAdvancesForCard } from '@/services/hrService';
import { useRequestAdvance } from '@/hooks/useSalaryAdvances';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { DollarSign, TrendingDown, Plus, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

interface SalaryAdvance {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function MySalaryAdvancesCard() {
  const { id: userId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();
  const requestAdvance = useRequestAdvance();

  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const hasOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');

  const isOperationalStaff = branchRoles.length > 0 && !hasOnlyFranquiciado;
  const firstBranchId = branchRoles.find((r) => r.local_role !== 'franquiciado')?.branch_id;

  const { data: advances, isLoading } = useQuery({
    queryKey: ['my-salary-advances-v2', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        return (await fetchMySalaryAdvancesForCard(userId)) as SalaryAdvance[];
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Could not fetch salary advances:', error);
        return [];
      }
    },
    enabled: !!userId,
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthAdvances =
    advances?.filter((a) => {
      const date = new Date(a.created_at);
      return date >= monthStart && date <= monthEnd;
    }) || [];

  const pendingRequests = advances?.filter((a) => a.status === 'pending') || [];

  const thisMonthTotal = thisMonthAdvances
    .filter((a) => a.status !== 'cancelled' && a.status !== 'pending')
    .reduce((acc, a) => acc + Number(a.amount), 0);

  

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Pagado</Badge>;
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50">
            <Clock className="w-3 h-3" />
            Pendiente
          </Badge>
        );
      case 'pending_transfer':
        return <Badge variant="outline">Pend. transferencia</Badge>;
      case 'transferred':
        return <Badge variant="secondary">Transferido</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleRequest = async () => {
    if (!amount || parseFloat(amount) <= 0 || !firstBranchId) return;

    try {
      await requestAdvance.mutateAsync({
        branchId: firstBranchId,
        amount: parseFloat(amount),
        reason: reason || undefined,
      });
      setShowRequest(false);
      setAmount('');
      setReason('');
    } catch {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (hasOnlyFranquiciado) return null;

  if (!advances || advances.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Mis Adelantos</CardTitle>
            </div>
            {isOperationalStaff && firstBranchId && (
              <Dialog open={showRequest} onOpenChange={setShowRequest}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Solicitar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitar Adelanto</DialogTitle>
                    <DialogDescription>
                      Tu encargado recibirá la solicitud y podrá aprobarla o rechazarla.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
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
                      <Label>Motivo (opcional)</Label>
                      <Textarea
                        placeholder="¿Para qué necesitás el adelanto?"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRequest(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleRequest}
                      disabled={!amount || parseFloat(amount) <= 0 || requestAdvance.isPending}
                    >
                      Enviar solicitud
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No tenés adelantos registrados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mis Adelantos</CardTitle>
          </div>
          {isOperationalStaff && firstBranchId && (
            <Dialog open={showRequest} onOpenChange={setShowRequest}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Solicitar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Adelanto</DialogTitle>
                  <DialogDescription>
                    Tu encargado recibirá la solicitud y podrá aprobarla o rechazarla.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
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
                    <Label>Motivo (opcional)</Label>
                    <Textarea
                      placeholder="¿Para qué necesitás el adelanto?"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRequest(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleRequest}
                    disabled={!amount || parseFloat(amount) <= 0 || requestAdvance.isPending}
                  >
                    Enviar solicitud
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending requests alert */}
        {pendingRequests.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">
              Tenés {pendingRequests.length} solicitud{pendingRequests.length > 1 ? 'es' : ''}{' '}
              pendiente{pendingRequests.length > 1 ? 's' : ''} de aprobación
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Total recibido este mes</p>
          <p className="text-lg font-bold">{formatCurrency(thisMonthTotal)}</p>
        </div>

        {/* History */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            Historial
          </h4>
          <div className="space-y-1">
            {advances.slice(0, 10).map((advance) => (
              <div
                key={advance.id}
                className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">
                    {format(new Date(advance.created_at), 'd MMM', { locale: es })}
                  </span>
                  <span className="font-medium">{formatCurrency(advance.amount)}</span>
                </div>
                {getStatusBadge(advance.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
