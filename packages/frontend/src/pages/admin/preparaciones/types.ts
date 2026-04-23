// Tables type removed - using any for renamed tables
import type { usePreparacionMutations } from '@/hooks/usePreparaciones';
export { formatCurrency } from '@/lib/formatters';

export type Preparacion = any;
export type CategoriaPreparacion = any;
export type PreparacionMutations = ReturnType<typeof usePreparacionMutations>;

export interface IngredienteLine {
  tipo_linea: string;
  insumo_id: string;
  sub_preparacion_id: string;
  quantity: number;
  unidad: string;
  insumo: {
    id: string;
    name: string;
    base_unit: string;
    base_unit_cost: number | null;
  } | null;
  sub_preparacion: {
    id: string;
    name: string;
    calculated_cost: number | null;
  } | null;
}



export const UNIDADES = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades' },
];

export function calcSubtotal(quantity: number, costoUnit: number, unidad: string) {
  if (!quantity || !costoUnit) return 0;
  const mult = unidad === 'kg' || unidad === 'l' ? 1000 : 1;
  return quantity * costoUnit * mult;
}
