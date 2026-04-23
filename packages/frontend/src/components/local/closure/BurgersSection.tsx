/**
 * BurgersSection - Burger count inputs for shift closure
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, UtensilsCrossed } from 'lucide-react';
import type { HamburguesasData } from '@/types/shiftClosure';

interface BurgersSectionProps {
  data: HamburguesasData;
  onChange: (data: HamburguesasData) => void;
  totalHamburguesas: number;
}

export function BurgersSection({ data, onChange, totalHamburguesas }: BurgersSectionProps) {
  const handleChange = (path: string, value: number) => {
    const parts = path.split('.');
    const newData = { ...data };

    if (parts.length === 1) {
      (newData as any)[parts[0]] = value;
    } else if (parts.length === 2) {
      (newData as any)[parts[0]] = {
        ...(newData as any)[parts[0]],
        [parts[1]]: value,
      };
    }

    onChange(newData);
  };

  const parseNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    return Math.max(0, val);
  };

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                Hamburguesas Vendidas
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">
                  Total: <span className="font-bold text-foreground">{totalHamburguesas}</span>
                </span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Main categories - 3 columns */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Clásicas</Label>
                <Input
                  type="number"
                  min={0}
                  value={data.clasicas || ''}
                  onChange={(e) => handleChange('clasicas', parseNumber(e))}
                  className="h-9"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Originales</Label>
                <Input
                  type="number"
                  min={0}
                  value={data.originales || ''}
                  onChange={(e) => handleChange('originales', parseNumber(e))}
                  className="h-9"
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Más Sabor</Label>
                <Input
                  type="number"
                  min={0}
                  value={data.mas_sabor || ''}
                  onChange={(e) => handleChange('mas_sabor', parseNumber(e))}
                  className="h-9"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Veggies and Ultrasmash - 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Veggies */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">VEGGIES</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Not American</Label>
                    <Input
                      type="number"
                      min={0}
                      value={data.veggies.not_american || ''}
                      onChange={(e) => handleChange('veggies.not_american', parseNumber(e))}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Not Claudio</Label>
                    <Input
                      type="number"
                      min={0}
                      value={data.veggies.not_claudio || ''}
                      onChange={(e) => handleChange('veggies.not_claudio', parseNumber(e))}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Ultrasmash */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">ULTRASMASH</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Ultra Cheese</Label>
                    <Input
                      type="number"
                      min={0}
                      value={data.ultrasmash.ultra_cheese || ''}
                      onChange={(e) => handleChange('ultrasmash.ultra_cheese', parseNumber(e))}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ultra Bacon</Label>
                    <Input
                      type="number"
                      min={0}
                      value={data.ultrasmash.ultra_bacon || ''}
                      onChange={(e) => handleChange('ultrasmash.ultra_bacon', parseNumber(e))}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Extras */}
            <div className="p-3 rounded-lg border border-dashed space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                EXTRAS (modificadores)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Extra Carne c/Q</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.extras.extra_carne || ''}
                    onChange={(e) => handleChange('extras.extra_carne', parseNumber(e))}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Extra NotBurger</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.extras.extra_not_burger || ''}
                    onChange={(e) => handleChange('extras.extra_not_burger', parseNumber(e))}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Extra NotChicken</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.extras.extra_not_chicken || ''}
                    onChange={(e) => handleChange('extras.extra_not_chicken', parseNumber(e))}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
