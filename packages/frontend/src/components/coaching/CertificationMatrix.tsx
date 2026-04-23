import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CertificationBadge } from './CertificationBadge';
import { useWorkStations } from '@/hooks/useStationCompetencies';
import { useTeamCertifications } from '@/hooks/useCertifications';
import type { CertificationLevel } from '@/types/coaching';
import { Award } from 'lucide-react';

interface CertificationMatrixProps {
  branchId: string;
  employees: { id: string; full_name: string; avatar_url?: string | null }[];
}

export function CertificationMatrix({ branchId, employees }: CertificationMatrixProps) {
  const { data: stations, isLoading: loadingStations } = useWorkStations();
  const { data: certData, isLoading: loadingCerts } = useTeamCertifications(branchId);

  const isLoading = loadingStations || loadingCerts;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Matriz de Certificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stations?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Matriz de Certificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No hay estaciones configuradas</p>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Matriz de Certificaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Empleado</TableHead>
                {stations.map((station) => (
                  <TableHead key={station.id} className="text-center min-w-[80px]">
                    {station.name.split('/')[0]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const userCerts = certData?.byUser[employee.id] || {};

                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {employee.full_name}
                        </span>
                      </div>
                    </TableCell>
                    {stations.map((station) => {
                      const cert = userCerts[station.id];
                      const level = (cert?.level ?? 0) as CertificationLevel;

                      return (
                        <TableCell key={station.id} className="text-center">
                          <div className="flex justify-center">
                            <CertificationBadge
                              level={level}
                              stationName={station.name}
                              size="md"
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CertificationBadge level={0} size="sm" />
            <span>Sin entrenar</span>
          </div>
          <div className="flex items-center gap-1">
            <CertificationBadge level={1} size="sm" />
            <span>En entrenamiento</span>
          </div>
          <div className="flex items-center gap-1">
            <CertificationBadge level={2} size="sm" />
            <span>Certificado</span>
          </div>
          <div className="flex items-center gap-1">
            <CertificationBadge level={3} size="sm" />
            <span>Experto</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
