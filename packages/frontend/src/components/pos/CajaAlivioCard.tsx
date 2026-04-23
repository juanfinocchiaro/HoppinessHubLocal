/**
 * CajaAlivioCard - Vista de Caja de Alivio con restricción por rol
 * Cajeros/Encargados: solo ven cantidad de depósitos, NO saldo
 * Franquiciado/Contador/Superadmin: ven saldo + movimientos + retiro a Caja Fuerte
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDownToLine, Vault, Receipt } from 'lucide-react';
import {
  CashRegister,
  CashRegisterShift,
  CashRegisterMovement,
  canViewBalance,
  canViewMovements,
} from '@/hooks/useCashRegister';

interface CajaAlivioCardProps {
  register: CashRegister;
  shift: CashRegisterShift | null;
  movements: CashRegisterMovement[];
  localRole: string | null;
  isSuperadmin: boolean;
  onRetiroClick: () => void;
  onExpenseClick?: () => void;
  expensesList?: React.ReactNode;
}

export function CajaAlivioCard({
  register: _register,
  shift,
  movements,
  localRole,
  isSuperadmin,
  onRetiroClick,
  onExpenseClick,
  expensesList,
}: CajaAlivioCardProps) {
  const showBalance = canViewBalance('alivio', localRole, isSuperadmin);
  const showMovements = canViewMovements('alivio', localRole, isSuperadmin);
  const canRetire = isSuperadmin || ['franquiciado', 'contador_local'].includes(localRole ?? '');

  const depositCount = movements.filter((m) => m.type === 'deposit').length;

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
          <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
          Caja de Alivio
          <Badge variant="outline" className="ml-auto">
            Acumulador
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showBalance ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo actual</p>
              <p className="text-2xl font-bold">$ {balance.toLocaleString('es-AR')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {depositCount} depósito{depositCount !== 1 ? 's' : ''}
              </p>
            </div>

            {canRetire && balance > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onRetiroClick}>
                  <Vault className="h-4 w-4 mr-2" />
                  Retirar a Caja Fuerte
                </Button>
                {onExpenseClick && (
                  <Button variant="outline" onClick={onExpenseClick}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Egreso
                  </Button>
                )}
              </div>
            )}

            {showMovements && movements.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Últimos movimientos</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {movements.slice(0, 5).map((m) => (
                    <li key={m.id}>
                      {m.type === 'deposit' ? '+' : '-'} ${' '}
                      {Number(m.amount).toLocaleString('es-AR')} — {m.concept}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-3xl font-bold">{depositCount}</p>
            <p className="text-sm text-muted-foreground mt-1">
              depósito{depositCount !== 1 ? 's' : ''} realizado{depositCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        {expensesList}
      </CardContent>
    </Card>
  );
}
