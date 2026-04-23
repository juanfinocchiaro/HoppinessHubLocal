import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreEvolutionChart, calculateTrend } from './ScoreEvolutionChart';
import { useEmployeeCoachings } from '@/hooks/useCoachings';
import { useEmployeeScoreHistory } from '@/hooks/useCoachingStats';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  User,
} from 'lucide-react';

interface EmployeeCoachingCardProps {
  employee: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  branchId: string;
  onViewDetail: (coachingId: string) => void;
}

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function EmployeeCoachingCard({
  employee,
  branchId,
  onViewDetail,
}: EmployeeCoachingCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: coachings, isLoading: loadingCoachings } = useEmployeeCoachings(
    employee.id,
    branchId,
  );
  const { data: scoreHistory, isLoading: loadingHistory } = useEmployeeScoreHistory(
    employee.id,
    branchId,
    12,
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calcular promedio histórico
  const averageScore =
    coachings && coachings.length > 0
      ? coachings.reduce((sum, c) => sum + (c.overall_score || 0), 0) /
        coachings.filter((c) => c.overall_score).length
      : null;

  const trend = scoreHistory ? calculateTrend(scoreHistory) : null;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'up':
        return 'Mejorando';
      case 'down':
        return 'Bajando';
      case 'stable':
        return 'Estable';
      default:
        return null;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 4.5) return 'text-purple-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-green-600';
    if (score >= 1.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatMonth = (month: number, year: number) => {
    return `${MONTH_LABELS[month - 1]} ${year}`;
  };

  if (loadingCoachings || loadingHistory) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No mostrar si no tiene coachings
  if (!coachings || coachings.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={isOpen ? 'border-primary' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{employee.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {coachings.length} coaching{coachings.length !== 1 ? 's' : ''} registrado
                    {coachings.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Promedio histórico */}
                <div className="text-right">
                  <div className={`text-xl font-bold ${getScoreColor(averageScore)}`}>
                    {averageScore?.toFixed(1) || '-'}
                  </div>
                  <span className="text-xs text-muted-foreground">promedio</span>
                </div>

                {/* Tendencia */}
                {trend && (
                  <div className="flex flex-col items-center gap-0.5">
                    {getTrendIcon()}
                    <span className="text-[10px] text-muted-foreground">{getTrendLabel()}</span>
                  </div>
                )}

                {/* Chevron */}
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Gráfico de evolución */}
            {scoreHistory && scoreHistory.length >= 2 && (
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Evolución del Score</p>
                <ScoreEvolutionChart data={scoreHistory} height={100} />
              </div>
            )}

            {/* Lista de coachings */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Historial de Evaluaciones</p>
              {coachings.map((coaching) => (
                <div
                  key={coaching.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs text-muted-foreground">
                        {formatMonth(coaching.coaching_month, coaching.coaching_year)}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${getScoreColor(coaching.overall_score)}`}>
                      {coaching.overall_score?.toFixed(1) || '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {coaching.evaluator && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {coaching.evaluator.full_name}
                      </div>
                    )}

                    {coaching.acknowledged_at ? (
                      <Badge variant="secondary" className="text-xs">
                        Confirmado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Pendiente
                      </Badge>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => onViewDetail(coaching.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
