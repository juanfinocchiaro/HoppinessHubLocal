/**
 * CajaFuerteCard - Vista de Caja Fuerte (solo franquiciado/contador/superadmin)
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Banknote, Receipt } from 'lucide-react';
import { CashRegister, CashRegisterShift, CashRegisterMovement } from '@/hooks/useCashRegister';

interface CajaFuerteCardProps {
  register: CashRegister;
  shift: CashRegisterShift | null;
  movements: CashRegisterMovement[];
  localRole: string | null;
  isSuperadmin: boolean;
  onRetiroClick: () => void;
  onExpenseClick?: () => void;
  expensesList?: React.ReactNode;
}

export function CajaFuerteCard({
  register: _register,
  shift,
  movements,
  localRole,
  isSuperadmin,
  onRetiroClick,
  onExpenseClick,
  expensesList,
}: CajaFuerteCardProps) {
  const canRetire = isSuperadmin || localRole === 'franquiciado';

  const balance = useMemo(() => {
    if (!shift) return 0;
    let amount = Number(shift.opening_amount);
    for (const mov of movements) {
      if (mov.type === 'income' || mov.type === 'deposit') amount += Number(mov.amount);
      else amount -= Number(mov.amount);
    }
    return amount;
  }, [shift, movements]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Caja Fuerte
          <Badge variant="outline" className="ml-auto">
            Acumulador
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Saldo acumulado</p>
            <p className="text-2xl font-bold">$ {balance.toLocaleString('es-AR')}</p>
          </div>

          {canRetire && balance > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onRetiroClick}>
                <Banknote className="h-4 w-4 mr-2" />
                Registrar Retiro
              </Button>
              {onExpenseClick && (
                <Button variant="outline" onClick={onExpenseClick}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Egreso
                </Button>
              )}
            </div>
          )}

          {movements.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Últimos movimientos</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {movements.slice(0, 10).map((m) => (
                  <li key={m.id}>
                    {m.type === 'deposit' ? '+' : '-'} $ {Number(m.amount).toLocaleString('es-AR')}{' '}
                    — {m.concept}
                    <span className="text-xs ml-2">
                      {new Date(m.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expensesList}
        </div>
      </CardContent>
    </Card>
  );
}
