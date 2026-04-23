/**
 * Work Position Types - Posiciones operativas para cálculo de horas
 *
 * Estas posiciones son DIFERENTES de los roles de sistema (local_role).
 * - local_role: Define permisos en el sistema (empleado, encargado, etc.)
 * - work_position: Define qué función cumple operativamente (cajero, sandwichero, etc.)
 *
 * IMPORTANTE: Las posiciones ahora se cargan dinámicamente desde la tabla work_positions.
 * Usar el hook useWorkPositions() para obtener la lista actualizada.
 */

// Tipo genérico para compatibilidad - ahora es dinámico
export type WorkPositionType = string;

// Alias for convenience
export type WorkPosition = WorkPositionType;

/**
 * Permission Config Types
 */
export interface PermissionConfig {
  id: string;
  permission_key: string;
  permission_label: string;
  scope: 'brand' | 'local';
  category: string;
  allowed_roles: string[];
  is_editable: boolean;
  created_at: string;
}

/**
 * User Branch Role con posición
 */
export interface UserBranchRole {
  id: string;
  user_id: string;
  branch_id: string;
  local_role: 'franquiciado' | 'encargado' | 'contador_local' | 'cajero' | 'empleado';
  default_position: WorkPositionType | null;
  clock_pin: string | null;
  is_active: boolean;
}
