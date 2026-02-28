import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import type { Promocion } from '@/hooks/usePromociones';
import { PromoCard } from './PromoCard';
import { DIAS_FULL, DAY_ORDER } from './constants';

interface PromosByDayProps {
  promos: Promocion[];
  openPromoIds: string[];
  renderInlineForm: (promo: Promocion) => React.ReactNode;
  onEdit: (p: Promocion) => void;
  onDuplicate: (p: Promocion) => void;
  onDelete: (p: Promocion) => void;
  onToggle: (id: string, activa: boolean) => void;
}

export function PromosByDay({ promos, openPromoIds, renderInlineForm, onEdit, onDuplicate, onDelete, onToggle }: PromosByDayProps) {
  const today = new Date().getDay();

  const { allDaysPromos, dayGroups } = useMemo(() => {
    const allDays: Promocion[] = [];
    const byDay = new Map<number, Promocion[]>();
    for (const p of promos) {
      if (p.dias_semana.length === 7) { allDays.push(p); }
      else { for (const d of p.dias_semana) { const list = byDay.get(d) || []; list.push(p); byDay.set(d, list); } }
    }
    const groups: { day: number; promos: Promocion[] }[] = [];
    for (const d of DAY_ORDER) { const list = byDay.get(d); if (list && list.length > 0) groups.push({ day: d, promos: list }); }
    return { allDaysPromos: allDays, dayGroups: groups };
  }, [promos]);

  const renderedInline = new Set<string>();

  const renderGroup = (label: string, items: Promocion[], isToday: boolean, key: string) => (
    <Card key={key} className={isToday ? 'border-primary/50 shadow-card' : ''}>
      <div className={`flex items-center justify-between px-4 py-2 border-b rounded-t-lg ${isToday ? 'bg-primary/5' : 'bg-muted/40'}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">{label}</h3>
          {isToday && <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase">Hoy</span>}
        </div>
        <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? 'promo' : 'promos'}</span>
      </div>
      {items.map((promo) => {
        const showInline = openPromoIds.includes(promo.id) && !renderedInline.has(promo.id);
        if (showInline) renderedInline.add(promo.id);
        return (
          <div key={promo.id}>
            <PromoCard promo={promo} isEditing={openPromoIds.includes(promo.id)} onEdit={() => onEdit(promo)} onDuplicate={() => onDuplicate(promo)} onDelete={() => onDelete(promo)} onToggle={(checked) => onToggle(promo.id, checked)} />
            {showInline && <div className="border-t-2 border-primary/30 bg-muted/10 px-5 py-4">{renderInlineForm(promo)}</div>}
          </div>
        );
      })}
    </Card>
  );

  return (
    <div className="space-y-4">
      {allDaysPromos.length > 0 && renderGroup('Todos los días', allDaysPromos, true, 'all')}
      {dayGroups.map((g) => renderGroup(DIAS_FULL[g.day], g.promos, g.day === today, `day-${g.day}`))}
    </div>
  );
}
