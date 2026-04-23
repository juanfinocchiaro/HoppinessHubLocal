/**
 * InspectionSummary - Resumen y puntaje de una inspección
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, MinusCircle, Clock, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { TYPE_SHORT_LABELS, STATUS_LABELS, CATEGORY_LABELS } from '@/types/inspection';
import type { BranchInspection, InspectionItem } from '@/types/inspection';

interface InspectionSummaryProps {
  inspection: BranchInspection;
  items?: InspectionItem[];
}

export function InspectionSummary({ inspection, items = [] }: InspectionSummaryProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const applicable = items.filter((i) => i.complies !== null);
    const compliant = applicable.filter((i) => i.complies === true).length;
    const nonCompliant = applicable.filter((i) => i.complies === false).length;
    const pending = items.filter((i) => i.complies === null).length;
    const total = items.length;
    const score = applicable.length > 0 ? Math.round((compliant / applicable.length) * 100) : 0;

    return { total, applicable: applicable.length, compliant, nonCompliant, pending, score };
  }, [items]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { compliant: number; total: number }> = {};

    items.forEach((item) => {
      if (!breakdown[item.category]) {
        breakdown[item.category] = { compliant: 0, total: 0 };
      }
      if (item.complies !== null) {
        breakdown[item.category].total++;
        if (item.complies) {
          breakdown[item.category].compliant++;
        }
      }
    });

    return breakdown;
  }, [items]);

  // Non-compliant items for critical findings
  const nonCompliantItems = useMemo(() => {
    return items.filter((i) => i.complies === false);
  }, [items]);

  const score = inspection.score_total ?? stats.score;
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-destructive';

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="w-4 h-4" />
                {inspection.branch?.name || 'Sucursal'}
              </div>
              <CardTitle className="text-xl flex items-center gap-2">
                Visita {TYPE_SHORT_LABELS[inspection.inspection_type]}
                <Badge
                  variant={
                    inspection.status === 'completada'
                      ? 'default'
                      : inspection.status === 'en_curso'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {STATUS_LABELS[inspection.status]}
                </Badge>
              </CardTitle>
            </div>
            <div className={cn('text-4xl font-bold', scoreColor)}>
              {score}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {format(new Date(inspection.started_at), "d 'de' MMMM, HH:mm", { locale: es })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              {inspection.inspector?.full_name || 'Coordinador'}
            </div>
          </div>
          {inspection.present_manager && (
            <div className="mt-2 text-sm text-muted-foreground">
              Encargado presente: {inspection.present_manager.full_name}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={score} className="h-3" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-2xl font-bold">{stats.compliant}</span>
              </div>
              <span className="text-xs text-muted-foreground">Cumple</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="text-2xl font-bold">{stats.nonCompliant}</span>
              </div>
              <span className="text-xs text-muted-foreground">No Cumple</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MinusCircle className="w-5 h-5" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(categoryBreakdown).map(([category, data]) => {
              const pct = data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0;
              return (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-medium',
                        pct >= 80
                          ? 'text-green-600'
                          : pct >= 60
                            ? 'text-yellow-600'
                            : 'text-destructive',
                      )}
                    >
                      {pct}%
                    </span>
                    <span className="text-muted-foreground">
                      ({data.compliant}/{data.total})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Non-compliant items */}
      {nonCompliantItems.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {nonCompliantItems.map((item) => (
                <li key={item.id} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{item.item_label}</span>
                      {item.observations && (
                        <p className="text-muted-foreground mt-0.5">{item.observations}</p>
                      )}
                    </div>
                  </div>
                  {item.photo_urls && item.photo_urls.length > 0 && (
                    <div className="ml-6 flex flex-wrap gap-2 mt-1">
                      {item.photo_urls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Evidencia ${idx + 1}`}
                            className="h-16 w-16 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* General notes */}
      {inspection.general_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observaciones Generales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{inspection.general_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action items */}
      {inspection.action_items && inspection.action_items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acciones a Tomar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {inspection.action_items.map((action, idx) => (
                <li
                  key={action.id || idx}
                  className="flex items-start gap-2 p-2 bg-muted/50 rounded"
                >
                  <span className="font-medium shrink-0">{idx + 1}.</span>
                  <div className="flex-1">
                    <p>{action.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Responsable: {action.responsible_name || 'Sin asignar'}</span>
                      {action.due_date && (
                        <span>• Vence: {format(new Date(action.due_date), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
