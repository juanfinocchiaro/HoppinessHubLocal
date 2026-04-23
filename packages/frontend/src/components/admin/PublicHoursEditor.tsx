import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';

// Día de la semana: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
const DAYS = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
];

export interface DayHours {
  opens: string;
  closes: string;
  closed?: boolean;
}

export type PublicHours = Record<string, DayHours>;

const DEFAULT_HOURS: PublicHours = {
  '0': { opens: '19:30', closes: '00:00' },
  '1': { opens: '19:30', closes: '23:30' },
  '2': { opens: '19:30', closes: '23:30' },
  '3': { opens: '19:30', closes: '00:00' },
  '4': { opens: '19:30', closes: '00:00' },
  '5': { opens: '19:30', closes: '00:30' },
  '6': { opens: '19:30', closes: '00:30' },
};

interface PublicHoursEditorProps {
  value: PublicHours | null;
  onChange: (hours: PublicHours) => void;
}

export default function PublicHoursEditor({ value, onChange }: PublicHoursEditorProps) {
  const [hours, setHours] = useState<PublicHours>(value || DEFAULT_HOURS);

  useEffect(() => {
    if (value) {
      setHours(value);
    }
  }, [value]);

  const updateDay = (day: string, field: keyof DayHours, fieldValue: string | boolean) => {
    const updated = {
      ...hours,
      [day]: {
        ...hours[day],
        [field]: fieldValue,
      },
    };
    setHours(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Horario Público por Día
        <span className="text-xs text-muted-foreground font-normal">(visible en la web)</span>
      </div>

      <div className="border rounded-lg divide-y">
        {DAYS.map(({ key, label }) => {
          const dayData = hours[key] || DEFAULT_HOURS[key];
          const isClosed = dayData.closed || false;

          return (
            <div key={key} className="flex items-center gap-3 p-3">
              {/* Día */}
              <div className="w-24 font-medium text-sm">{label}</div>

              {/* Switch abierto/cerrado */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={!isClosed}
                  onCheckedChange={(checked) => updateDay(key, 'closed', !checked)}
                  aria-label={`${label} abierto`}
                />
                <span className="text-xs text-muted-foreground w-14">
                  {isClosed ? 'Cerrado' : 'Abierto'}
                </span>
              </div>

              {/* Horarios */}
              {!isClosed && (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={dayData.opens}
                    onChange={(e) => updateDay(key, 'opens', e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    type="time"
                    value={dayData.closes}
                    onChange={(e) => updateDay(key, 'closes', e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                </div>
              )}

              {isClosed && (
                <div className="flex-1 text-sm text-muted-foreground italic">No abre este día</div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Nota: Si el cierre es después de medianoche (ej: 00:30), indica la hora del día siguiente.
      </p>
    </div>
  );
}
