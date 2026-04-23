import { addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthNavigatorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
  disableFuture?: boolean;
  className?: string;
}

export function MonthNavigator({ currentDate, onChange, disableFuture = true, className }: MonthNavigatorProps) {
  const now = new Date();
  const isCurrent = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
  const label = format(currentDate, 'MMMM yyyy', { locale: es });

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(subMonths(currentDate, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{label}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(addMonths(currentDate, 1))}
        disabled={disableFuture && isCurrent}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
