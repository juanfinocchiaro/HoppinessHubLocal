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
import { EmployeeExpandedRow } from './EmployeeExpandedRow';
import type { TeamMember } from './types';
import { LOCAL_ROLE_LABELS, formatHours, formatClockIn } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWorkPositions } from '@/hooks/useWorkPositions';

interface TeamTableProps {
  team: TeamMember[];
  branchId: string;
  onMemberUpdated: () => void;
}

export function TeamTable({ team, branchId, onMemberUpdated }: TeamTableProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const { data: positions = [] } = useWorkPositions();

  // Helper para obtener label de posición
  const getPositionLabel = (key: string | null): string => {
    if (!key) return '-';
    const position = positions.find((p) => p.key === key);
    return position?.label || key;
  };

  // Separate franchisees from employees (franchisees are owners, not employees)
  const employees = team.filter((m) => m.local_role !== 'franquiciado');
  const franchisees = team.filter((m) => m.local_role === 'franquiciado');

  const handleRowClick = (memberId: string) => {
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  return (
    <div className="space-y-4">
      {/* Franchisees Section - shown at top if any */}
      {franchisees.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Propietario{franchisees.length > 1 ? 's' : ''} del Local
          </h3>
          <div className="space-y-2">
            {franchisees.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.full_name}</span>
                <span className="text-amber-600 dark:text-amber-400">{f.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[90px]">Ingreso</TableHead>
                <TableHead className="min-w-[150px]">Nombre</TableHead>
                <TableHead className="min-w-[180px]">Email</TableHead>
                <TableHead className="w-[100px]">Permisos</TableHead>
                <TableHead className="w-[100px]">Posición</TableHead>
                <TableHead className="w-[90px] text-right">Horas mes</TableHead>
                <TableHead className="w-[110px]">Últ. fichaje</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((member) => {
                const isExpanded = expandedMemberId === member.id;
                const permissionLabel = LOCAL_ROLE_LABELS[member.local_role || ''] || 'Empleado';
                const positionLabel = getPositionLabel(member.default_position);

                return (
                  <>
                    <TableRow
                      key={member.id}
                      onClick={() => handleRowClick(member.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isExpanded && 'bg-muted/50',
                      )}
                    >
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(member.hire_date), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[200px]">
                        {member.full_name || 'Sin nombre'}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px] text-muted-foreground">
                              {member.email}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{member.email}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            member.local_role === 'encargado' && 'text-success',
                            (member.local_role === 'cajero' || member.local_role === 'empleado') &&
                              'text-muted-foreground',
                          )}
                        >
                          {permissionLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {positionLabel}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatHours(member.hours_this_month)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatClockIn(member.last_clock_in)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge member={member} />
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${member.id}-expanded`}>
                        <TableCell colSpan={8} className="p-0 bg-muted/30">
                          <EmployeeExpandedRow
                            member={member}
                            branchId={branchId}
                            onClose={() => setExpandedMemberId(null)}
                            onMemberUpdated={onMemberUpdated}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay empleados en este local
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ member }: { member: TeamMember }) {
  if (member.active_warnings > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        {member.active_warnings} aperc.
      </span>
    );
  }

  if (member.is_working) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-success">
        <span className="w-2 h-2 rounded-full bg-success" />
        Trabajando
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      Fuera
    </span>
  );
}
