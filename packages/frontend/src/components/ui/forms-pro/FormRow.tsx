import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';

interface FormRowProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Fila de formulario con label, input, hint y error.
 */
export function FormRow({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FormRowProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
