import type { Tables } from '@/integrations/supabase/types';
import type { useModificadoresMutations } from '@/hooks/useModificadores';
import type { DeepIngredientGroup } from '@/hooks/useItemIngredientesDeepList';

export type Modificador = any;
export type Insumo = any;
export type Preparacion = any;
export type CreateMutation = ReturnType<typeof useModificadoresMutations>['create'];

export interface FlatIngredient {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costo_por_unidad_base: number;
  _fromItem: boolean;
  _recetaOrigen: string;
}

export type ComposicionWithJoins = any;

export interface InsumoLike {
  id: string;
  nombre: string;
  costo_por_unidad_base?: number | null;
  cantidad?: number;
  unidad?: string;
  unidad_base?: string;
  _fromItem?: boolean;
}

export interface SelectedExtraItem {
  id: string;
  nombre: string;
  costo_por_unidad_base?: number | null;
  costo_calculado?: number | null;
}

export interface NewRemovibleFormProps {
  itemId: string;
  ingredientes: FlatIngredient[];
  deepGroups: DeepIngredientGroup[];
  insumos: InsumoLike[];
  composicion: ComposicionWithJoins[];
  onCreate: CreateMutation;
  onClose: () => void;
}

export interface NewExtraFormProps {
  itemId: string;
  ingredientes: FlatIngredient[];
  deepGroups: DeepIngredientGroup[];
  insumos: InsumoLike[];
  recetas: Preparacion[];
  onCreate: CreateMutation;
  onClose: () => void;
}

export interface NewSustitucionFormProps {
  itemId: string;
  ingredientes: FlatIngredient[];
  insumos: InsumoLike[];
  onCreate: CreateMutation;
  onClose: () => void;
}
