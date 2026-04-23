/**
 * Fase 4 follow-up: badge de "tipo de impresión" de una categoría de carta.
 * Valor de `menu_categories.print_type`: 'comanda' | 'vale' | 'no_imprimir'.
 *
 * Antes vivía sólo en CategoriasCartaPage. Lo extraigo para consolidar la
 * edición en MenuCartaPage y poder borrar la página dedicada.
 */
import { ChefHat, Ticket, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TipoImpresion = 'comanda' | 'vale' | 'no_imprimir';

export const TIPO_IMPRESION_OPTIONS: {
  value: TipoImpresion;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: 'comanda', label: 'Comanda', icon: ChefHat, color: 'text-orange-600 bg-orange-50' },
  { value: 'vale', label: 'Vale', icon: Ticket, color: 'text-blue-600 bg-blue-50' },
  {
    value: 'no_imprimir',
    label: 'No imprimir',
    icon: Ban,
    color: 'text-muted-foreground bg-muted',
  },
];

export function TipoImpresionBadge({ tipo }: { tipo: TipoImpresion | null | undefined }) {
  const effective = (tipo ?? 'comanda') as TipoImpresion;
  const opt = TIPO_IMPRESION_OPTIONS.find((o) => o.value === effective) || TIPO_IMPRESION_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${opt.color}`}
    >
      <Icon className="w-3 h-3" />
      {opt.label}
    </span>
  );
}
