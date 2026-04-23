import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { fetchEmployeesWithCoachingCounts } from '@/services/coachingService';
import { EmployeeCoachingCard } from './EmployeeCoachingCard';
import { CoachingDetailModal } from './CoachingDetailModal';
import { Search, History, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CoachingHistoryTabProps {
  branchId: string;
}

interface EmployeeWithCoachingCount {
  id: string;
  full_name: string;
  avatar_url: string | null;
  coaching_count: number;
  latest_score: number | null;
}

export function CoachingHistoryTab({ branchId }: CoachingHistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoachingId, setSelectedCoachingId] = useState<string | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-with-coachings', branchId],
    queryFn: (): Promise<EmployeeWithCoachingCount[]> =>
      fetchEmployeesWithCoachingCounts(branchId),
    enabled: !!branchId,
  });

  // Filtrar por búsqueda
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!searchTerm) return employees.filter((e) => e.coaching_count > 0);

    const term = searchTerm.toLowerCase();
    return employees
      .filter((e) => e.coaching_count > 0)
      .filter((e) => e.full_name.toLowerCase().includes(term));
  }, [employees, searchTerm]);

  // Stats agregados
  const stats = useMemo(() => {
    if (!employees) return { totalCoachings: 0, avgScore: null, employeesWithCoachings: 0 };

    const withCoachings = employees.filter((e) => e.coaching_count > 0);
    const totalCoachings = withCoachings.reduce((sum, e) => sum + e.coaching_count, 0);
    const scoresSum = withCoachings.reduce((sum, e) => sum + (e.latest_score || 0), 0);
    const avgScore =
      withCoachings.length > 0
        ? scoresSum / withCoachings.filter((e) => e.latest_score !== null).length
        : null;

    return {
      totalCoachings,
      avgScore,
      employeesWithCoachings: withCoachings.length,
    };
  }, [employees]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalCoachings}</p>
              <p className="text-xs text-muted-foreground">Coachings totales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgScore?.toFixed(1) || '-'}</p>
              <p className="text-xs text-muted-foreground">Score promedio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.employeesWithCoachings}</p>
              <p className="text-xs text-muted-foreground">Empleados evaluados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empleado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de empleados con historial */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {searchTerm ? (
              <p>No se encontraron empleados con ese nombre</p>
            ) : (
              <p>No hay coachings registrados en este local</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCoachingCard
              key={employee.id}
              employee={employee}
              branchId={branchId}
              onViewDetail={setSelectedCoachingId}
            />
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      <CoachingDetailModal
        coachingId={selectedCoachingId}
        open={!!selectedCoachingId}
        onOpenChange={(open) => !open && setSelectedCoachingId(null)}
      />
    </div>
  );
}
