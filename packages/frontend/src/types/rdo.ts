import type { Tables } from '@/types/database';

export type RdoCategory = Tables<'rdo_categories'>;

export interface RdoReportLine {
  category_code: string;
  category_name: string;
  parent_code: string | null;
  level: number;
  rdo_section: string;
  behavior: string;
  sort_order: number;
  total: number;
  percentage: number;
}

export const RDO_SECTIONS = {
  costos_variables: 'Costos Variables',
  costos_fijos: 'Costos Fijos',
} as const;

export const RDO_BEHAVIORS = {
  variable: 'Variable',
  fijo: 'Fijo',
} as const;

export type RdoSection = keyof typeof RDO_SECTIONS;
export type RdoBehavior = keyof typeof RDO_BEHAVIORS;

export const TIPO_ITEM_OPTIONS = [
  { value: 'ingrediente', label: 'Ingrediente' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'producto', label: 'Producto' },
] as const;
