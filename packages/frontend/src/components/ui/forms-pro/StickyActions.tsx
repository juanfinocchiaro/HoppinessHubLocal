import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StickyActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Barra sticky para botones de submit en formularios.
 */
export function StickyActions({ children, className }: StickyActionsProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 bg-background border-t py-4 px-6 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
