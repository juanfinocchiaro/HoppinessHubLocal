/**
 * Tipos para el Sistema de Supervisiones de Sucursales
 */

export type InspectionType = 'boh' | 'foh' | 'ultrasmash';
export type InspectionStatus = 'en_curso' | 'completada' | 'cancelada';

export interface InspectionTemplate {
  id: string;
  inspection_type: InspectionType;
  category: string;
  item_key: string;
  item_label: string;
  sort_order: number;
  is_active: boolean;
}

export interface InspectionActionItem {
  id: string;
  description: string;
  responsible_id: string;
  responsible_name?: string;
  due_date: string;
  completed?: boolean;
}

export interface BranchInspection {
  id: string;
  branch_id: string;
  inspection_type: InspectionType;
  inspector_id: string;
  started_at: string;
  completed_at: string | null;
  status: InspectionStatus;
  score_total: number | null;
  present_manager_id: string | null;
  general_notes: string | null;
  critical_findings: string | null;
  action_items: InspectionActionItem[];
  created_at: string;
  updated_at: string;
  // Joined data
  branch?: {
    id: string;
    name: string;
    slug: string;
  };
  inspector?: {
    id: string;
    full_name: string;
  };
  present_manager?: {
    id: string;
    full_name: string;
  };
  items?: InspectionItem[];
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  category: string;
  item_key: string;
  item_label: string;
  complies: boolean | null; // null = N/A
  observations: string | null;
  photo_urls: string[];
  sort_order: number;
}

// For creating a new inspection
export interface CreateInspectionInput {
  branch_id: string;
  inspection_type: InspectionType;
  present_manager_id?: string;
}

// For updating inspection items during execution
export interface UpdateInspectionItemInput {
  complies: boolean | null;
  observations?: string;
  photo_urls?: string[];
}

// For completing an inspection
export interface CompleteInspectionInput {
  general_notes?: string;
  critical_findings?: string;
  action_items?: InspectionActionItem[];
}

// Category display names
export const CATEGORY_LABELS: Record<string, string> = {
  heladeras: 'Heladeras y Freezers',
  deposito: 'Depósito',
  cocina: 'Cocina',
  seguridad: 'Seguridad e Higiene',
  mostrador: 'Mostrador y Caja',
  producto: 'Producto Final',
  salon: 'Salón y Baños',
  atencion: 'Atención al Cliente',
  ultrasmash: 'Monitoreo Ultra Smash',
};

// Type display names
export const TYPE_LABELS: Record<InspectionType, string> = {
  boh: 'Back-of-House (BOH)',
  foh: 'Front-of-House (FOH)',
  ultrasmash: 'Monitoreo Ultra Smash',
};

export const TYPE_SHORT_LABELS: Record<InspectionType, string> = {
  boh: 'BOH',
  foh: 'FOH',
  ultrasmash: 'Ultra',
};

export const STATUS_LABELS: Record<InspectionStatus, string> = {
  en_curso: 'En Curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};
