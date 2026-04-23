import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoachingStats } from '@/hooks/useCoachingStats';
import { ClipboardList, Users, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface CoachingPendingCardProps {
  branchId: string;
  onStartCoaching?: () => void;
}

export function CoachingPendingCard({ branchId, onStartCoaching }: CoachingPendingCardProps) {
  const { data: stats, isLoading } = useCoachingStats(branchId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalEmployees === 0) {
    return null;
  }

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long' });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Coaching del Mes
        </CardTitle>
        <CardDescription className="capitalize">{currentMonth}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Completados</span>
          <span className="font-medium">
            {stats.coachingsThisMonth} / {stats.totalEmployees}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{stats.totalEmployees} empleados</span>
          </div>

          {stats.pendingCoachings > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600">{stats.pendingCoachings} pendientes</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Completo</span>
            </div>
          )}

          {stats.pendingAcknowledgments > 0 && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Badge variant="outline" className="text-xs">
                {stats.pendingAcknowledgments} sin confirmar por empleados
              </Badge>
            </div>
          )}

          {stats.averageScore && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>
                Promedio: <strong>{stats.averageScore.toFixed(1)}</strong>/4
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {stats.pendingCoachings > 0 && onStartCoaching && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={onStartCoaching}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Hacer Coaching
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
