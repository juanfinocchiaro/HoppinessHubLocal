/**
 * SupervisorPinDialog - Validación de PIN de encargado (Fase 5)
 */
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { useOperatorVerification, type OperatorInfo } from '@/hooks/useOperatorVerification';

interface SupervisorPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onSuccess: (supervisor: OperatorInfo) => void;
  title?: string;
  description?: string;
}

export function SupervisorPinDialog({
  open,
  onOpenChange,
  branchId,
  onSuccess,
  title = 'Autorización requerida',
  description = 'Esta operación requiere autorización de un encargado.',
}: SupervisorPinDialogProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OperatorInfo | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { validateSupervisorPin } = useOperatorVerification(branchId);

  useEffect(() => {
    if (open) {
      setPin(['', '', '', '']);
      setError(null);
      setSuccess(null);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(null);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('');
      if (fullPin.length === 4) {
        handleValidate(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidate = async (fullPin?: string) => {
    const pinToValidate = fullPin || pin.join('');
    if (pinToValidate.length !== 4) {
      setError('Ingrese los 4 dígitos');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const supervisor = await validateSupervisorPin(pinToValidate);

      if (supervisor) {
        setSuccess(supervisor);
        setTimeout(() => {
          onSuccess(supervisor);
          onOpenChange(false);
        }, 1000);
      } else {
        setError('PIN inválido o sin permisos');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Error al validar PIN');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-green-700 dark:text-green-400">
                Autorizado por {success.fullName}
              </p>
              {success.role && <p className="text-sm text-muted-foreground">({success.role})</p>}
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">PIN del encargado:</p>
                <div className="flex justify-center gap-3">
                  {pin.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-14 h-14 text-center text-2xl font-mono"
                      disabled={isValidating}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <ShieldX className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isValidating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleValidate()}
                  disabled={isValidating || pin.join('').length !== 4}
                >
                  {isValidating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Validar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
