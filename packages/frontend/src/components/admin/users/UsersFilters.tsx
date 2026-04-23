import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UsersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  accessFilter: string;
  onAccessFilterChange: (value: string) => void;
}

export function UsersFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  accessFilter,
  onAccessFilterChange,
}: UsersFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>

            {/* Roles de Marca */}
            <SelectItem
              disabled
              value="__brand_header"
              className="text-xs font-semibold text-muted-foreground py-1"
            >
              ── Marca ──
            </SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
            <SelectItem value="coordinador">Coordinador</SelectItem>
            <SelectItem value="informes">Informes</SelectItem>
            <SelectItem value="contador_marca">Contador Marca</SelectItem>

            {/* Roles Locales */}
            <SelectItem
              disabled
              value="__local_header"
              className="text-xs font-semibold text-muted-foreground py-1"
            >
              ── Locales ──
            </SelectItem>
            <SelectItem value="franquiciado">Franquiciado</SelectItem>
            <SelectItem value="encargado">Encargado</SelectItem>
            <SelectItem value="contador_local">Contador Local</SelectItem>
            <SelectItem value="cajero">Cajero</SelectItem>
            <SelectItem value="empleado">Empleado</SelectItem>

            <SelectItem value="sin_rol">Sin rol asignado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accessFilter} onValueChange={onAccessFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Acceso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="brand">Con acceso Mi Marca</SelectItem>
            <SelectItem value="local">Con acceso Mi Local</SelectItem>
            <SelectItem value="none">Sin accesos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
