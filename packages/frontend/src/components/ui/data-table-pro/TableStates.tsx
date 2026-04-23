import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states/empty-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

/**
 * Skeleton animado para tablas durante la carga.
 */
export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

interface TableEmptyProps {
  columns: number;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

/**
 * Estado vacío dentro de una tabla.
 */
export function TableEmpty({
  columns,
  icon,
  title = 'Sin datos',
  description = 'No hay elementos para mostrar.',
  action,
  children,
}: TableEmptyProps) {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={columns}>
          <EmptyState icon={icon} title={title} description={description} action={action}>
            {children}
          </EmptyState>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

interface TableErrorProps {
  columns: number;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Estado de error dentro de una tabla.
 */
export function TableError({ columns, title, description, onRetry }: TableErrorProps) {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={columns}>
          <ErrorState title={title} description={description} onRetry={onRetry} />
        </TableCell>
      </TableRow>
    </TableBody>
  );
}
