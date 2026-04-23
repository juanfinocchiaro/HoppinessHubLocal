import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface FormLayoutProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

/**
 * Grid responsive para formularios.
 */
export function FormLayout({ children, columns = 1, className }: FormLayoutProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return <div className={cn('grid gap-4', gridClasses[columns], className)}>{children}</div>;
}
