/**
 * LocationSwitcher — Sprint 4
 *
 * Dropdown in the header that lets multi-location users switch between their
 * accessible locations (and the "All Locations" aggregate view when they have
 * account-level access).
 *
 * Only renders when `showSwitcher` is true (i.e., user has access to >1 location
 * or has account-level access). Single-location users never see this.
 */

import { MapPin, ChevronDown, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentLocation, ALL_LOCATIONS_ID } from '@/contexts/CurrentLocationContext';
import { cn } from '@/lib/utils';

export function LocationSwitcher({ className }: { className?: string }) {
  const { current, availableLocations, accountAccess, showSwitcher, setLocationId } =
    useCurrentLocation();

  if (!showSwitcher || !current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('flex items-center gap-2 max-w-[200px]', className)}
        >
          {current.isAggregate ? (
            <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">{current.name}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {accountAccess && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Vista agregada
            </DropdownMenuLabel>
            <DropdownMenuItem
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                current.isAggregate && 'bg-accent'
              )}
              onSelect={() => setLocationId(ALL_LOCATIONS_ID)}
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>Todos los locales</span>
              {current.isAggregate && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  activo
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Locales
        </DropdownMenuLabel>

        {availableLocations.map((loc) => (
          <DropdownMenuItem
            key={loc.id}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              !current.isAggregate && current.id === loc.id && 'bg-accent'
            )}
            onSelect={() => setLocationId(loc.id)}
          >
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{loc.name}</span>
            {!current.isAggregate && current.id === loc.id && (
              <Badge variant="secondary" className="ml-auto text-xs">
                activo
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
