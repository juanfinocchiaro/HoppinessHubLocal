/**
 * usePermissionConfig - Hook para leer y modificar permisos (modelo normalizado)
 *
 * Lee desde roles, permissions, role_permissions.
 * Permite al superadmin activar/desactivar permisos por rol via INSERT/DELETE.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoles,
  fetchPermissions,
  fetchRolePermissions,
  addRolePermission,
  removeRolePermission,
  type RoleRow,
  type PermissionRow,
} from '@/services/permissionsService';
import { toast } from 'sonner';

export type { RoleRow, PermissionRow };

export function usePermissionConfig() {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    staleTime: 60 * 1000,
  });

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: fetchPermissions,
    staleTime: 60 * 1000,
  });

  const { data: rolePermissions = [], isLoading: loadingRP } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: fetchRolePermissions,
    staleTime: 60 * 1000,
  });

  const isLoading = loadingRoles || loadingPerms || loadingRP;

  // Derived data
  const brandRoles = roles.filter((r) => r.scope === 'brand');
  const branchRoles = roles.filter((r) => r.scope === 'branch');
  const brandPermissions = permissions.filter((p) => p.scope === 'brand');
  const localPermissions = permissions.filter((p) => p.scope === 'local');
  const brandCategories = [...new Set(brandPermissions.map((p) => p.category))];
  const localCategories = [...new Set(localPermissions.map((p) => p.category))];

  // Check if a role has a permission
  const hasPermission = (roleId: string, permissionId: string): boolean => {
    return rolePermissions.some(
      (rp) => rp.role_id === roleId && rp.permission_id === permissionId,
    );
  };

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
      enabled,
    }: {
      roleId: string;
      permissionId: string;
      enabled: boolean;
    }) => {
      if (enabled) {
        await addRolePermission(roleId, permissionId);
      } else {
        await removeRolePermission(roleId, permissionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permiso actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar permiso');
    },
  });

  const togglePermission = (roleId: string, permissionId: string) => {
    const currentlyEnabled = hasPermission(roleId, permissionId);
    toggleMutation.mutate({
      roleId,
      permissionId,
      enabled: !currentlyEnabled,
    });
  };

  return {
    roles,
    brandRoles,
    branchRoles,
    permissions,
    brandPermissions,
    localPermissions,
    rolePermissions,
    brandCategories,
    localCategories,
    isLoading,
    hasPermission,
    togglePermission,
    isUpdating: toggleMutation.isPending,
  };
}

export default usePermissionConfig;
