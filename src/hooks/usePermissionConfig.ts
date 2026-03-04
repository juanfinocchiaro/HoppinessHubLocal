/**
 * usePermissionConfig - Hook para leer y modificar la configuración de permisos
 *
 * Lee desde la tabla permission_config y permite al superadmin
 * activar/desactivar permisos por rol.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPermissionConfig, updatePermissionRoles } from '@/services/permissionsService';
import { toast } from 'sonner';

export interface PermissionConfigRow {
  id: string;
  permission_key: string;
  permission_label: string;
  scope: 'brand' | 'local';
  category: string;
  allowed_roles: string[];
  is_editable: boolean;
  created_at: string;
}

export const BRAND_ROLES = ['superadmin', 'coordinador', 'community_manager', 'informes', 'contador_marca'] as const;
export const LOCAL_ROLES = [
  'franquiciado',
  'encargado',
  'contador_local',
  'cajero',
  'empleado',
] as const;

export const BRAND_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super',
  coordinador: 'Coord',
  community_manager: 'CM',
  informes: 'Inform',
  contador_marca: 'Contad',
};

export const LOCAL_ROLE_LABELS: Record<string, string> = {
  franquiciado: 'Franq',
  encargado: 'Encarg',
  contador_local: 'Contad',
  cajero: 'Cajero',
  empleado: 'Empl',
};

export function usePermissionConfig() {
  const queryClient = useQueryClient();

  const {
    data: permissions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['permission-config'],
    queryFn: async () => {
      return (await fetchPermissionConfig()) as PermissionConfigRow[];
    },
    staleTime: 60 * 1000,
  });

  // Agrupar por scope y categoría
  const brandPermissions = permissions.filter((p) => p.scope === 'brand');
  const localPermissions = permissions.filter((p) => p.scope === 'local');

  const brandCategories = [...new Set(brandPermissions.map((p) => p.category))];
  const localCategories = [...new Set(localPermissions.map((p) => p.category))];

  // Mutación para actualizar un permiso
  const updatePermission = useMutation({
    mutationFn: async ({
      permissionId,
      role,
      enabled,
    }: {
      permissionId: string;
      role: string;
      enabled: boolean;
    }) => {
      // Obtener el permiso actual
      const permission = permissions.find((p) => p.id === permissionId);
      if (!permission) throw new Error('Permiso no encontrado');
      if (!permission.is_editable) throw new Error('Este permiso no es editable');

      let newRoles: string[];
      if (enabled) {
        newRoles = [...new Set([...permission.allowed_roles, role])];
      } else {
        newRoles = permission.allowed_roles.filter((r) => r !== role);
      }

      await updatePermissionRoles(permissionId, newRoles);
      return { permissionId, newRoles };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-config'] });
      toast.success('Permiso actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar permiso');
    },
  });

  // Función helper para verificar si un rol tiene un permiso
  const hasPermission = (permissionKey: string, role: string): boolean => {
    const permission = permissions.find((p) => p.permission_key === permissionKey);
    return permission?.allowed_roles.includes(role) ?? false;
  };

  // Función helper para togglear un permiso
  const togglePermission = (permissionId: string, role: string) => {
    const permission = permissions.find((p) => p.id === permissionId);
    if (!permission) return;

    const currentlyEnabled = permission.allowed_roles.includes(role);
    updatePermission.mutate({
      permissionId,
      role,
      enabled: !currentlyEnabled,
    });
  };

  return {
    permissions,
    brandPermissions,
    localPermissions,
    brandCategories,
    localCategories,
    isLoading,
    error,
    hasPermission,
    togglePermission,
    updatePermission,
  };
}

export default usePermissionConfig;
