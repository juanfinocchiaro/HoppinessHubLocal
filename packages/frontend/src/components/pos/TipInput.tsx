/**
 * TipInput - Propina opcional en checkout (Fase 4)
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TipInputProps {
  value: number;
  onChange: (value: number) => void;
  orderTotal: number;
  disabled?: boolean;
}

const QUICK_PERCENT = [10, 15, 20];

export function TipInput({ value, onChange, orderTotal, disabled }: TipInputProps) {
  const handlePercent = (pct: number) => {
    const amount = Math.round(((orderTotal * pct) / 100) * 100) / 100;
    onChange(amount);
  };

  return (
    <div className="space-y-2">
      <Label>Propina (opcional)</Label>
      <div className="flex gap-2 flex-wrap">
        {QUICK_PERCENT.map((p) => {
          const amount = Math.round((orderTotal * p) / 100);
          return (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePercent(p)}
              disabled={disabled || orderTotal <= 0}
            >
              {p}% · ${amount.toLocaleString('es-AR')}
            </Button>
          );
        })}
      </div>
      <Input
        type="number"
        min={0}
        step={1}
        placeholder="0"
        value={value > 0 ? value : ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
      />
    </div>
  );
}
