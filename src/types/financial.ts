import type { Tables } from '@/integrations/supabase/types';

// Re-export DB types
export type Proveedor = Tables<'suppliers'>;
export type CategoriaInsumo = any;
export type Insumo = any;

// Form types for create/edit
export interface ProveedorFormData {
  razon_social: string;
  cuit?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ambito: 'marca' | 'local';
  branch_id?: string | null;
  permite_cuenta_corriente?: boolean;
  dias_pago_habitual?: number;
  descuento_pago_contado?: number;
  medios_pago_aceptados?: string[];
  banco?: string;
  numero_cuenta?: string;
  cbu?: string;
  alias_cbu?: string;
  titular_cuenta?: string;
  telefono_secundario?: string;
  contacto_secundario?: string;
  observaciones?: string;
}

export interface InsumoFormData {
  nombre: string;
  categoria_id?: string;
  unidad_base: string;
  categoria_pl?: string;
  precio_referencia?: number;
  proveedor_sugerido_id?: string;
  descripcion?: string;
  tipo_item?: 'ingrediente' | 'insumo' | 'producto';
  rdo_category_code?: string;
  tracks_stock?: boolean;
  unidad_compra?: string;
  unidad_compra_contenido?: number;
  unidad_compra_precio?: number;
  default_alicuota_iva?: number | null;
}

export const PRESENTACION_OPTIONS = [
  { value: 'kg', label: 'Kilogramo', unidadBase: 'g', contenidoDefault: 1000 },
  { value: 'pote', label: 'Pote', unidadBase: 'g', contenidoDefault: null },
  { value: 'balde', label: 'Balde', unidadBase: 'g', contenidoDefault: null },
  { value: 'bidon', label: 'Bidón', unidadBase: 'ml', contenidoDefault: null },
  { value: 'litro', label: 'Litro', unidadBase: 'ml', contenidoDefault: 1000 },
  { value: 'caja', label: 'Caja', unidadBase: 'un', contenidoDefault: null },
  { value: 'bolsa', label: 'Bolsa', unidadBase: 'un', contenidoDefault: null },
  { value: 'pack', label: 'Pack', unidadBase: 'un', contenidoDefault: null },
  { value: 'unidad', label: 'Unidad', unidadBase: 'un', contenidoDefault: 1 },
  { value: 'rollo', label: 'Rollo', unidadBase: 'un', contenidoDefault: null },
  { value: 'horma', label: 'Horma', unidadBase: 'g', contenidoDefault: null },
  { value: 'bandeja', label: 'Bandeja', unidadBase: 'g', contenidoDefault: null },
] as const;

export const UNIDAD_BASE_OPTIONS = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'un', label: 'Unidades (un)' },
] as const;

export interface CategoriaInsumoFormData {
  nombre: string;
  tipo: string;
  descripcion?: string;
  orden?: number;
}

// Constants
export const AMBITO_OPTIONS = [
  { value: 'marca', label: 'Marca (todas las sucursales)' },
  { value: 'local', label: 'Local (una sucursal)' },
] as const;

export const UNIDAD_OPTIONS = [
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'lt', label: 'Litro (lt)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'un', label: 'Unidad (un)' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'balde', label: 'Balde' },
  { value: 'rollo', label: 'Rollo' },
] as const;

export const TIPO_CATEGORIA_OPTIONS = [
  { value: 'materia_prima', label: 'Materia Prima' },
  { value: 'descartables', label: 'Descartables' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'otro', label: 'Otro' },
] as const;

export const MEDIOS_PAGO_PROVEEDOR = [
  'efectivo',
  'transferencia',
  'cheque',
  'cuenta_corriente',
] as const;
