/**
 * WorkSidebar - Componentes reutilizables para navegación por dominios
 *
 * Incluye:
 * - WorkSidebarNav: Contenedor principal
 * - NavSectionGroup: Sección colapsable
 * - NavItemButton: Item de navegación
 */
import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown, LucideIcon } from 'lucide-react';

// ===== WorkSidebarNav =====
interface WorkSidebarNavProps {
  children: ReactNode;
  className?: string;
}

export function WorkSidebarNav({ children, className }: WorkSidebarNavProps) {
  return <nav className={cn('space-y-1', className)}>{children}</nav>;
}

// ===== NavSectionGroup =====
interface NavSectionGroupProps {
  id: string;
  label: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
}

export function NavSectionGroup({
  label,
  icon: Icon,
  children,
  defaultOpen = false,
  forceOpen = false,
}: NavSectionGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || forceOpen);

  // Sync open state with active item — collapse when navigating away
  useEffect(() => {
    setIsOpen(forceOpen);
  }, [forceOpen]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start font-semibold text-sm uppercase tracking-wider text-muted-foreground',
            forceOpen && 'text-primary',
          )}
        >
          <Icon className="w-[18px] h-[18px] mr-3 shrink-0" />
          {label}
          {isOpen ? (
            <ChevronDown className="w-4 h-4 ml-auto" />
          ) : (
            <ChevronRight className="w-4 h-4 ml-auto" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-0.5 mt-1.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ===== NavItemButton =====
interface NavItemButtonProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number | string;
  badgeVariant?: 'default' | 'destructive' | 'warning';
  exact?: boolean;
}

export function NavItemButton({
  to,
  icon: Icon,
  label,
  badge,
  badgeVariant = 'default',
  exact = false,
}: NavItemButtonProps) {
  const location = useLocation();

  const isActive = exact
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const badgeClasses = {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    warning: 'bg-orange-500 text-white',
  };

  return (
    <Link to={to}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start h-9',
          isActive && 'bg-primary/10 text-primary border-l-2 border-primary rounded-l-none',
        )}
      >
        <Icon className="w-[18px] h-[18px] mr-3" />
        {label}
        {badge !== undefined && badge !== 0 && (
          <Badge className={cn('ml-auto text-xs px-1.5 py-0.5', badgeClasses[badgeVariant])}>
            {badge}
          </Badge>
        )}
      </Button>
    </Link>
  );
}

// ===== NavActionButton =====
interface NavActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'ghost' | 'primary';
}

export function NavActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost',
}: NavActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'w-full justify-start',
        variant === 'primary' && 'text-primary hover:bg-primary/10',
      )}
      onClick={onClick}
    >
      <Icon className="w-4 h-4 mr-3" />
      {label}
    </Button>
  );
}

// ===== NavDashboardLink =====
interface NavDashboardLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

export function NavDashboardLink({ to, icon: Icon, label }: NavDashboardLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn('w-full justify-start', isActive && 'bg-primary/10 text-primary')}
      >
        <Icon className="w-[18px] h-[18px] mr-3" />
        {label}
      </Button>
    </Link>
  );
}

// Helper hook to check if section has active item
export function useIsSectionActive(basePath: string, paths: string[]) {
  const location = useLocation();
  return paths.some((path) => {
    const fullPath = `${basePath}/${path}`.replace(/\/+/g, '/');
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  });
}
