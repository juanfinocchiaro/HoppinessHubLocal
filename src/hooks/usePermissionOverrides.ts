/**
 * usePermissionOverrides - Lee la configuración de permisos desde permission_config
 *
 * Este hook:
 * 1. Lee la tabla permission_config
 * 2. Permite verificar si un rol tiene un permiso específico
 * 3. Se usa como override de los permisos hardcodeados en usePermissions
 */
import { useQuery } from '@tanstack/react-query';
import { fetchPermissionConfig } from '@/services/permissionsService';
import type { BrandRole, LocalRole } from './usePermissions';

interface PermissionConfig {
  id: string;
  permission_key: string;
  permission_label: string;
  scope: 'brand' | 'local';
  category: string;
  allowed_roles: string[];
  is_editable: boolean;
}

/**
 * Hook que lee la configuración de permisos desde la base de datos
 */
export function usePermissionOverrides() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['permission-config-overrides'],
    queryFn: async () => {
      return (await fetchPermissionConfig()) as PermissionConfig[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });

  /**
   * Verifica si un rol tiene un permiso específico según la configuración
   * @param permissionKey - Ej: 'brand.viewDashboard', 'local.createWarnings'
   * @param role - El rol a verificar (brand_role o local_role)
   * @returns true si tiene el permiso, false si no, undefined si no existe la config
   */
  const hasConfiguredPermission = (
    permissionKey: string,
    role: BrandRole | LocalRole,
  ): boolean | undefined => {
    if (!role) return false;

    const config = configs.find((c) => c.permission_key === permissionKey);
    if (!config) return undefined; // No hay config, usar fallback

    return config.allowed_roles.includes(role);
  };

  /**
   * Obtiene un permiso con fallback al valor hardcodeado
   * @param permissionKey - Clave del permiso
   * @param role - Rol a verificar
   * @param fallback - Valor por defecto si no hay config
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
    return configs.filter((c) => c.scope === scope);
  };

  return {
    configs,
    isLoading,
    hasConfiguredPermission,
    getPermission,
    getConfigsForScope,
  };
}

export default usePermissionOverrides;
