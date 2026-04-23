import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReactNode, createElement } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode | React.ComponentType<any>;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Header de página con título, subtítulo, breadcrumb y acciones.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumb,
  actions,
  variant = 'default',
  className,
}: PageHeaderProps) {
  const isCompact = variant === 'compact';

  return (
    <div className={cn('mb-6 animate-fade-in', className)}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          {breadcrumb.map((item, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {item.href ? (
                <Link to={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className={cn(
              'font-bold text-foreground flex items-center gap-2',
              isCompact ? 'text-xl' : 'text-2xl',
            )}
          >
            {icon && (
              <span className="shrink-0">
                {typeof icon === 'function' ? createElement(icon, { className: 'w-6 h-6' }) : icon}
              </span>
            )}
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
