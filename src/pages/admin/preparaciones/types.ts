import type { Tables } from '@/integrations/supabase/types';
import type { usePreparacionMutations } from '@/hooks/usePreparaciones';
export { formatCurrency } from '@/lib/formatters';

export type Preparacion = any;
export type CategoriaPreparacion = any;
export type PreparacionMutations = ReturnType<typeof usePreparacionMutations>;

export interface IngredienteLine {
  tipo_linea: string;
  insumo_id: string;
  sub_preparacion_id: string;
  cantidad: number;
  unidad: string;
  insumo: {
    id: string;
    nombre: string;
    unidad_base: string;
    costo_por_unidad_base: number | null;
  } | null;
  sub_preparacion: {
    id: string;
    nombre: string;
    costo_calculado: number | null;
  } | null;
}



export const UNIDADES = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades' },
];

export function calcSubtotal(cantidad: number, costoUnit: number, unidad: string) {
  if (!cantidad || !costoUnit) return 0;
  const mult = unidad === 'kg' || unidad === 'l' ? 1000 : 1;
  return cantidad * costoUnit * mult;
}
