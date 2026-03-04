import type { BrandRole, LocalRole } from '@/hooks/usePermissions';
import type { WorkPositionType } from '@/types/workPosition';

/**
 * Rol de sucursal con posición operativa
 */
export interface BranchRoleInfo {
  branch_id: string;
  branch_name: string;
  local_role: LocalRole;
  default_position: WorkPositionType | null;
  clock_pin: string | null;
  is_active: boolean;
  role_record_id: string;
}

export interface UserWithStats {
  id: string;
  user_id: string | null; // auth.users id
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  // Rol de marca
  brand_role: BrandRole;
  brand_role_id: string | null;
  // Roles locales (de user_role_assignments)
  branch_roles: BranchRoleInfo[];
  // Helpers para compatibilidad
  hasLocalAccess: boolean;
  primaryLocalRole: LocalRole;
}

export type { NoteEntry } from '@/types/notes';

export interface Branch {
  id: string;
  name: string;
}

// Role priority for display (higher = more important)
export const ROLE_PRIORITY: Record<string, number> = {
  superadmin: 100,
  coordinador: 90,
  contador_marca: 80,
  informes: 70,
  franquiciado: 60,
  encargado: 50,
  contador_local: 40,
  cajero: 30,
  empleado: 20,
};

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  coordinador: 'Coordinador',
  contador_marca: 'Contador Marca',
  informes: 'Informes',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  contador_local: 'Contador Local',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function getHighestRole(brandRole: BrandRole, branchRoles: BranchRoleInfo[]): string {
  const brandPriority = brandRole ? ROLE_PRIORITY[brandRole] || 0 : 0;

  // Encontrar el rol local más alto entre todas las sucursales
  let maxLocalPriority = 0;
  let maxLocalRole: LocalRole = null;

  for (const br of branchRoles) {
    const priority = br.local_role ? ROLE_PRIORITY[br.local_role] || 0 : 0;
    if (priority > maxLocalPriority) {
      maxLocalPriority = priority;
      maxLocalRole = br.local_role;
    }
  }

  if (brandPriority >= maxLocalPriority && brandRole) return brandRole;
  if (maxLocalRole) return maxLocalRole;
  return 'staff';
}

/**
 * Verifica si un usuario TIENE un rol específico (en marca o en cualquier local)
 * Útil para filtrado inclusivo (no solo por rol más alto)
 */
export function userHasRole(
  brandRole: BrandRole,
  branchRoles: BranchRoleInfo[],
  targetRole: string,
): boolean {
  // Chequear rol de marca
  if (brandRole === targetRole) return true;

  // Chequear cualquier rol local
  return branchRoles.some((br) => br.local_role === targetRole);
}

// Compatibilidad con código viejo
export function getHighestRoleLegacy(brandRole: BrandRole, localRole: LocalRole): string {
  const brandPriority = brandRole ? ROLE_PRIORITY[brandRole] || 0 : 0;
  const localPriority = localRole ? ROLE_PRIORITY[localRole] || 0 : 0;

  if (brandPriority >= localPriority && brandRole) return brandRole;
  if (localRole) return localRole;
  return 'staff';
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} sem.`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  }
  const years = Math.floor(diffDays / 365);
  return `Hace ${years} año${years > 1 ? 's' : ''}`;
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
