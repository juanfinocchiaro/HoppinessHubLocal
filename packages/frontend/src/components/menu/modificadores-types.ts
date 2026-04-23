import type { useModificadoresMutations } from '@/hooks/useModificadores';
import type { DeepIngredientGroup } from '@/hooks/useItemIngredientesDeepList';

export type Modificador = any;
export type Insumo = any;
export type Preparacion = any;
export type CreateMutation = ReturnType<typeof useModificadoresMutations>['create'];

export interface FlatIngredient {
  id: string;
  name: string;
  quantity: number;
  unidad: string;
  base_unit_cost: number;
  _fromItem: boolean;
  _recetaOrigen: string;
}

export type ComposicionWithJoins = any;

export interface InsumoLike {
  id: string;
  name: string;
  base_unit_cost?: number | null;
  quantity?: number;
  unidad?: string;
  base_unit?: string;
  _fromItem?: boolean;
}

export interface SelectedExtraItem {
  id: string;
  name: string;
  base_unit_cost?: number | null;
  calculated_cost?: number | null;
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
