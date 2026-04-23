import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserExpandedRow } from './UserExpandedRow';
import type { UserWithStats, Branch } from './types';
import { formatShortDate } from './types';
import { useWorkPositions } from '@/hooks/useWorkPositions';

// Labels específicos para roles de marca
const BRAND_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  coordinador: 'Coordinador',
  contador_marca: 'Contador',
  informes: 'Informes',
};

// Labels específicos para roles locales
const LOCAL_ROLE_LABELS: Record<string, string> = {
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  contador_local: 'Contador',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

interface UsersTableProps {
  users: UserWithStats[];
  branches: Branch[];
  onUserUpdated: () => void;
}

export function UsersTable({ users, branches, onUserUpdated }: UsersTableProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const { data: positions = [] } = useWorkPositions();

  // Helper para obtener label de posición
  const getPositionLabel = (key: string | null): string => {
    if (!key) return '-';
    const position = positions.find((p) => p.key === key);
    return position?.label || key;
  };

  // Obtener la posición del usuario (primera que tenga en cualquier local)
  const getUserPosition = (user: UserWithStats): string => {
    for (const br of user.branch_roles) {
      if (br.default_position) {
        return getPositionLabel(br.default_position);
      }
    }
    return '-';
  };

  // Formatear conteo de sucursales
  const getBranchesLabel = (user: UserWithStats): string => {
    // Si es superadmin, tiene acceso a todas
    if (user.brand_role === 'superadmin') return 'Todas';

    const count = user.branch_roles.length;
    if (count === 0) return '-';
    if (count === 1) return '1 local';
    return `${count} locales`;
  };

  const handleRowClick = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[90px]">Registro</TableHead>
              <TableHead className="min-w-[150px]">Nombre</TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="w-[100px]">Mi Marca</TableHead>
              <TableHead className="w-[100px]">Mi Local</TableHead>
              <TableHead className="w-[100px]">Posición</TableHead>
              <TableHead className="w-[90px]">Sucursales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isExpanded = expandedUserId === user.id;
              const brandLabel = user.brand_role
                ? BRAND_ROLE_LABELS[user.brand_role] || user.brand_role
                : '-';
              const localLabel = user.primaryLocalRole
                ? LOCAL_ROLE_LABELS[user.primaryLocalRole] || user.primaryLocalRole
                : '-';
              const positionLabel = getUserPosition(user);
              const branchesLabel = getBranchesLabel(user);

              return (
                <>
                  <TableRow
                    key={user.id}
                    onClick={() => handleRowClick(user.id)}
                    className={cn('cursor-pointer transition-colors', isExpanded && 'bg-muted/50')}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {formatShortDate(user.created_at)}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {user.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[200px] text-muted-foreground">
                            {user.email}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{user.email}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm',
                          user.brand_role === 'superadmin' && 'font-medium text-primary',
                          user.brand_role === 'coordinador' && 'font-medium text-info',
                          user.brand_role &&
                            !['superadmin', 'coordinador'].includes(user.brand_role) &&
                            'text-muted-foreground',
                          !user.brand_role && 'text-muted-foreground',
                        )}
                      >
                        {brandLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm',
                          user.primaryLocalRole === 'franquiciado' && 'font-medium text-accent',
                          user.primaryLocalRole === 'encargado' && 'font-medium text-success',
                          user.primaryLocalRole &&
                            !['franquiciado', 'encargado'].includes(user.primaryLocalRole) &&
                            'text-muted-foreground',
                          !user.primaryLocalRole && 'text-muted-foreground',
                        )}
                      >
                        {localLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{positionLabel}</TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={cn(
                          user.brand_role === 'superadmin' && 'text-primary font-medium',
                          user.branch_roles.length > 0 &&
                            user.brand_role !== 'superadmin' &&
                            'text-success',
                          user.branch_roles.length === 0 &&
                            user.brand_role !== 'superadmin' &&
                            'text-muted-foreground',
                        )}
                      >
                        {branchesLabel}
                      </span>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${user.id}-expanded`}>
                      <TableCell colSpan={7} className="p-0 bg-muted/30">
                        <UserExpandedRow
                          user={user}
                          branches={branches}
                          onClose={() => setExpandedUserId(null)}
                          onUserUpdated={onUserUpdated}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
