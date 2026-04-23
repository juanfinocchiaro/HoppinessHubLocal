import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';

interface DangerConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  consequences: string[];
  confirmWord: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

/**
 * Diálogo de confirmación de alta fricción para acciones destructivas.
 * Requiere que el usuario escriba una palabra exacta para habilitar el botón de confirmación.
 */
export function DangerConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  confirmWord,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
}: DangerConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) setInputValue('');
  }, [open]);

  const isMatch = inputValue.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleConfirm = () => {
    if (!isMatch) return;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {consequences.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Consecuencias:</p>
            <ul className="space-y-1.5">
              {consequences.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Label htmlFor="danger-confirm-input" className="text-sm">
            Para confirmar, escribí{' '}
            <span className="font-bold text-destructive">"{confirmWord}"</span>:
          </Label>
          <Input
            id="danger-confirm-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isMatch) handleConfirm();
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={!isMatch}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
