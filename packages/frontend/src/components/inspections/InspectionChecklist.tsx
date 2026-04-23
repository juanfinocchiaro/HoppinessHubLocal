/**
 * InspectionChecklist - Formulario de checklist agrupado por categoría
 */

import { useMemo } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InspectionItemRow } from './InspectionItemRow';
import { CATEGORY_LABELS } from '@/types/inspection';
import type { InspectionItem } from '@/types/inspection';

interface InspectionChecklistProps {
  items: InspectionItem[];
  inspectionId: string;
  readOnly?: boolean;
}

export function InspectionChecklist({
  items,
  inspectionId,
  readOnly = false,
}: InspectionChecklistProps) {
  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, InspectionItem[]> = {};

    items.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    // Sort each group by sort_order
    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => a.sort_order - b.sort_order);
    });

    return groups;
  }, [items]);

  // Calculate stats per category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; compliant: number; nonCompliant: number }> = {};

    Object.entries(groupedItems).forEach(([category, categoryItems]) => {
      const applicable = categoryItems.filter((i) => i.complies !== null);
      stats[category] = {
        total: applicable.length,
        compliant: applicable.filter((i) => i.complies === true).length,
        nonCompliant: applicable.filter((i) => i.complies === false).length,
      };
    });

    return stats;
  }, [groupedItems]);

  // Get ordered categories
  const orderedCategories = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      const aFirst = groupedItems[a][0]?.sort_order || 0;
      const bFirst = groupedItems[b][0]?.sort_order || 0;
      return aFirst - bFirst;
    });
  }, [groupedItems]);

  return (
    <div className="space-y-4">
      {orderedCategories.map((category) => {
        const categoryItems = groupedItems[category];
        const stats = categoryStats[category];
        const hasIssues = stats.nonCompliant > 0;
        const isComplete = stats.total > 0 && stats.total === stats.compliant;

        return (
          <Card key={category} className={hasIssues ? 'border-destructive/50' : ''}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {CATEGORY_LABELS[category] || category}
                  {hasIssues && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  {isComplete && <Check className="w-4 h-4 text-green-600" />}
                </CardTitle>
                <Badge
                  variant={hasIssues ? 'destructive' : isComplete ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {stats.compliant}/{stats.total}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              {categoryItems.map((item) => (
                <InspectionItemRow
                  key={item.id}
                  item={item}
                  inspectionId={inspectionId}
                  readOnly={readOnly}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
