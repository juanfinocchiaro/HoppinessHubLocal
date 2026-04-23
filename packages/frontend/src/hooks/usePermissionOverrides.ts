/**
 * usePermissionOverrides - Lee permisos normalizados desde role_permissions
 *
 * Consulta las tablas: roles, permissions, role_permissions
 * Permite verificar si un rol tiene un permiso específico
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchRoles,
  fetchPermissions,
  fetchRolePermissions,
} from '@/services/permissionsService';
import type { BrandRole, LocalRole } from './usePermissions';

export function usePermissionOverrides() {
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: fetchPermissions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: rolePermissions = [], isLoading: loadingRP } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: fetchRolePermissions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const isLoading = loadingRoles || loadingPerms || loadingRP;

  /**
   * Verifica si un rol tiene un permiso específico según la configuración normalizada
   */
  const hasConfiguredPermission = (
    permissionKey: string,
    role: BrandRole | LocalRole,
  ): boolean | undefined => {
    if (!role) return false;

    const permission = permissions.find((p) => p.key === permissionKey);
    if (!permission) return undefined; // No hay config, usar fallback

    const roleObj = roles.find((r) => r.key === role);
    if (!roleObj) return false;

    return rolePermissions.some(
      (rp) => rp.role_id === roleObj.id && rp.permission_id === permission.id,
    );
  };

  /**
   * Obtiene un permiso con fallback al valor hardcodeado
   */
  const getPermission = (
    permissionKey: string,
    role: BrandRole | LocalRole,
    fallback: boolean,
  ): boolean => {
    const configured = hasConfiguredPermission(permissionKey, role);
    return configured !== undefined ? configured : fallback;
  };

  /**
   * Obtiene todos los permisos configurados para un scope
   */
  const getConfigsForScope = (scope: 'brand' | 'local') => {
    return permissions.filter((p) => p.scope === scope);
  };

  return {
    roles,
    permissions,
    rolePermissions,
    isLoading,
    hasConfiguredPermission,
    getPermission,
    getConfigsForScope,
  };
}

export default usePermissionOverrides;
