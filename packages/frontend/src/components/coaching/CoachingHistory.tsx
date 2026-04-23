import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmployeeCoachings } from '@/hooks/useCoachings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Star, ChevronRight, CheckCircle } from 'lucide-react';

interface CoachingHistoryProps {
  userId: string;
  branchId?: string | null;
  maxItems?: number;
  onViewCoaching?: (coachingId: string) => void;
}

export function CoachingHistory({
  userId,
  branchId = null,
  maxItems = 6,
  onViewCoaching,
}: CoachingHistoryProps) {
  const { data: coachings, isLoading } = useEmployeeCoachings(userId, branchId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const displayCoachings = coachings?.slice(0, maxItems) ?? [];

  if (displayCoachings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Historial de Coachings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no hay coachings registrados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Historial de Coachings
        </CardTitle>
        <CardDescription>{coachings?.length ?? 0} evaluaciones registradas</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] pr-4">
          <div className="space-y-3">
            {displayCoachings.map((coaching) => {
              const date = new Date(coaching.coaching_date);
              const monthName = format(date, 'MMMM yyyy', { locale: es });

              return (
                <div
                  key={coaching.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{monthName}</span>
                      {coaching.acknowledged_at ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Sin confirmar
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {coaching.overall_score && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{coaching.overall_score.toFixed(1)}/4</span>
                        </div>
                      )}
                      {coaching.evaluator && (
                        <span className="truncate">Por: {coaching.evaluator.full_name}</span>
                      )}
                    </div>
                  </div>

                  {onViewCoaching && (
                    <Button variant="ghost" size="icon" onClick={() => onViewCoaching(coaching.id)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
