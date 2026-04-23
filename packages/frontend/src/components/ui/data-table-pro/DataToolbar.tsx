import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface DataToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Barra de herramientas para tablas: búsqueda + filtros + acciones.
 */
export function DataToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  actions,
  className,
}: DataToolbarProps) {
  const showSearch = onSearchChange !== undefined;
  const hasSearchValue = searchValue && searchValue.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4',
        className,
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        {showSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-9"
            />
            {hasSearchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onSearchChange('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        {filters}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
