/**
 * OperatorVerificationDialog - Verificación/cambio de operador (Fase 5)
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, User, UserCheck, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { useOperatorVerification } from '@/hooks/useOperatorVerification';

interface OperatorVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  triggeredBy: string;
  onConfirm: (operatorId: string) => void;
}

type Step = 'verify' | 'change';

export function OperatorVerificationDialog({
  open,
  onOpenChange,
  branchId,
  triggeredBy,
  onConfirm,
}: OperatorVerificationDialogProps) {
  const [step, setStep] = useState<Step>('verify');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentOperator, changeOperator, logConfirmIdentity } = useOperatorVerification(branchId);

  const handleConfirmIdentity = () => {
    if (!currentOperator) return;
    logConfirmIdentity(triggeredBy);
    onConfirm(currentOperator.userId);
    onOpenChange(false);
  };

  const handleChangeOperator = async () => {
    if (!email || !password) {
      setError('Complete todos los campos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newOperator = await changeOperator(email, password, triggeredBy);
      if (newOperator) {
        onConfirm(newOperator.userId);
        onOpenChange(false);
      }
    } catch {
      setError('Error al cambiar operador');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            ¿Quién está operando?
          </DialogTitle>
          <DialogDescription>Confirme su identidad antes de continuar</DialogDescription>
        </DialogHeader>

        {step === 'verify' ? (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Sesión actual:</p>

              <div className="inline-flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {currentOperator ? getInitials(currentOperator.fullName) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{currentOperator?.fullName || 'Usuario'}</p>
                </div>

                <Button onClick={handleConfirmIdentity} className="w-full mt-2">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Soy yo, continuar
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">¿Sos otra persona?</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setStep('change')}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Cambiar operador
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">
                {currentOperator?.fullName} será deslogueado automáticamente
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="operador@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep('verify');
                  setError(null);
                  setEmail('');
                  setPassword('');
                }}
                disabled={isLoading}
              >
                Volver
              </Button>
              <Button className="flex-1" onClick={handleChangeOperator} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Iniciar y Continuar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
