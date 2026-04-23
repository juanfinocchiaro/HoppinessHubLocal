/**
 * EmployeeWarningsHistory - Historial de apercibimientos por empleado
 */
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, FileText, Clock, UserX, AlertTriangle, CheckCircle } from 'lucide-react';

const WARNING_TYPES = [
  {
    value: 'verbal',
    label: 'Llamado de atención verbal',
    icon: MessageSquare,
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'written',
    label: 'Apercibimiento escrito',
    icon: FileText,
    color: 'bg-orange-100 text-orange-800',
  },
  { value: 'lateness', label: 'Llegada tarde', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  { value: 'absence', label: 'Inasistencia', icon: UserX, color: 'bg-red-100 text-red-800' },
  {
    value: 'suspension',
    label: 'Suspensión',
    icon: AlertTriangle,
    color: 'bg-red-200 text-red-900',
  },
  { value: 'other', label: 'Otro', icon: AlertTriangle, color: 'bg-gray-100 text-gray-800' },
];

interface Warning {
  id: string;
  user_id: string;
  warning_type: string;
  description: string;
  warning_date: string;
  acknowledged_at: string | null;
  signed_document_url: string | null;
  employee_name?: string;
}

interface TeamMember {
  user_id: string;
  full_name: string;
}

interface EmployeeWarningsHistoryProps {
  teamMembers?: TeamMember[];
  warnings?: Warning[];
}

export function EmployeeWarningsHistory({ teamMembers, warnings }: EmployeeWarningsHistoryProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const employeeWarnings = useMemo(() => {
    if (!selectedUserId || !warnings) return [];
    return warnings.filter((w) => w.user_id === selectedUserId);
  }, [selectedUserId, warnings]);

  const getEmployeeStats = (userId: string) => {
    const userWarnings = warnings?.filter((w) => w.user_id === userId) || [];
    const byType = userWarnings.reduce(
      (acc, w) => {
        acc[w.warning_type] = (acc[w.warning_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: userWarnings.length,
      byType,
      lastDate: userWarnings[0]?.warning_date,
      pendingSignature: userWarnings.filter((w) => !w.signed_document_url).length,
      pendingAck: userWarnings.filter((w) => !w.acknowledged_at).length,
    };
  };

  const getWarningTypeBadge = (type: string) => {
    const config = WARNING_TYPES.find((t) => t.value === type) || WARNING_TYPES[5];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = selectedUserId ? getEmployeeStats(selectedUserId) : null;
  const selectedMember = teamMembers?.find((m) => m.user_id === selectedUserId);

  return (
    <div className="space-y-4">
      {/* Selector de empleado */}
      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Seleccionar empleado" />
        </SelectTrigger>
        <SelectContent>
          {teamMembers?.map((member) => {
            const memberStats = getEmployeeStats(member.user_id);
            return (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name}
                {memberStats.total > 0 && (
                  <span className="text-muted-foreground ml-2">({memberStats.total})</span>
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedUserId && stats && (
        <>
          {/* Resumen del empleado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Resumen de {selectedMember?.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingAck}</p>
                  <p className="text-xs text-muted-foreground">Sin ver</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingSignature}</p>
                  <p className="text-xs text-muted-foreground">Sin firma</p>
                </div>
                <div>
                  <p className="text-sm">
                    {stats.lastDate
                      ? format(new Date(stats.lastDate), 'd MMM yyyy', { locale: es })
                      : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Último</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de apercibimientos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              {employeeWarnings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay apercibimientos registrados para este empleado
                </p>
              ) : (
                <div className="space-y-4">
                  {employeeWarnings.map((warning, index) => (
                    <div key={warning.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {index < employeeWarnings.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {getWarningTypeBadge(warning.warning_type)}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(warning.warning_date), 'd MMM yyyy', { locale: es })}
                          </span>
                          {warning.acknowledged_at && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Visto
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{warning.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Seleccioná un empleado para ver su historial</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
