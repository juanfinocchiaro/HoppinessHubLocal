
import type { useItemCartaMutations } from '@/hooks/useItemsCarta';
import type { useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';

export type ItemCartaRow = any & {
  menu_categorias: { id: string; nombre: string; orden: number | null } | null;
  rdo_categories: { code: string; name: string } | null;
};

export type ItemCartaMutations = ReturnType<typeof useItemCartaMutations>;
export type GruposMutations = ReturnType<typeof useGruposOpcionalesMutations>;

export interface GlobalStats {
  cmv: number;
  obj: number;
  mg: number;
  total: number;
  sinP: number;
  sinC: number;
  ok: number;
  warn: number;
  danger: number;
  gColor: 'ok' | 'warn' | 'danger';
}

export interface EI {
  id: string;
  nombre: string;
  cat: string;
  catId: string;
  costo: number;
  precio: number;
  pNeto: number;
  fc: number;
  fcObj: number;
  margen: number;
  pSug: number;
  color: 'ok' | 'warn' | 'danger';
  hasComp: boolean;
  hasPrice: boolean;
  raw: ItemCartaRow;
}

export interface CG {
  nombre: string;
  id: string;
  items: EI[];
  cmv: number;
  obj: number;
  margen: number;
  color: 'ok' | 'warn' | 'danger';
  hidden?: boolean;
  orden?: number;
}

export interface ComposicionRow {
  tipo: 'preparacion' | 'insumo';
  preparacion_id: string;
  insumo_id: string;
  cantidad: number;
  _label: string;
  _costo: number;
}

export interface GrupoEditItem {
  tipo: 'insumo' | 'preparacion';
  insumo_id: string;
  preparacion_id: string;
  cantidad: number;
  costo_unitario: number;
  _nombre: string;
}

export interface PriceChange extends EI {
  np: number;
  nfc: number;
  nm: number;
  delta: number;
  deltaPct: number;
}

export type Tab = 'analisis' | 'simulador' | 'actualizar';
