import { Package, CheckCircle, AlertTriangle, XCircle, CircleDot } from 'lucide-react';
import type { StockResumen } from '@/hooks/pos/useStock';

interface StockResumenBarProps {
  resumen: StockResumen;
}

const cards = [
  { key: 'total', label: 'Total', icon: Package, color: 'text-foreground', bg: 'bg-muted' },
  { key: 'ok', label: 'OK', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  { key: 'bajo', label: 'Bajo', icon: CircleDot, color: 'text-warning', bg: 'bg-warning/10' },
  {
    key: 'critico',
    label: 'Crítico',
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
  {
    key: 'sin_stock',
    label: 'Sin stock',
    icon: XCircle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
] as const;

export function StockResumenBar({ resumen }: StockResumenBarProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = resumen[c.key as keyof StockResumen];
        return (
          <div key={c.key} className={`flex items-center gap-2 p-3 rounded-lg ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.color} flex-shrink-0`} />
            <div>
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
