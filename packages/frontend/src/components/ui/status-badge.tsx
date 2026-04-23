import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        active: 'bg-success/15 text-success dark:bg-success/20',
        pending: 'bg-warning/20 text-warning-foreground dark:bg-warning/25',
        validated: 'bg-info/15 text-info dark:bg-info/20',
        blocked: 'bg-destructive/15 text-destructive dark:bg-destructive/20',
        inactive: 'bg-muted text-muted-foreground',
        info: 'bg-info/15 text-info dark:bg-info/20',
        warning: 'bg-accent/15 text-accent dark:bg-accent/20',
      },
    },
    defaultVariants: {
      variant: 'inactive',
    },
  },
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

/**
 * Badge de estado con variantes de color semánticas.
 */
export function StatusBadge({ className, variant, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
