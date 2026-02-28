import { useQuery } from '@tanstack/react-query';
import { fetchBranchesIdName, fetchAllProfiles, fetchAllBrandRoles, fetchAllBranchRoles } from '@/services/adminService';
import type { UserWithStats, Branch, BranchRoleInfo } from './types';
import type { BrandRole, LocalRole } from '@/hooks/usePermissions';
import type { WorkPositionType } from '@/types/workPosition';
import { ROLE_PRIORITY } from './types';

export function useUsersData() {
  // Fetch branches first (needed for mapping)
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const data = await fetchBranchesIdName();
      return data as Branch[];
    },
    staleTime: 60 * 1000,
  });

  // Fetch all users with consolidated roles
  const {
    data: users = [],
    isLoading: loadingUsers,
    refetch,
  } = useQuery({
    queryKey: ['admin-users-consolidated', branches],
    queryFn: async () => {
      const profiles = await fetchAllProfiles();
      if (!profiles.length) return [];

      const profileIds = profiles.map((p) => p.id).filter(Boolean);

      const [brandRoles, branchRoles] = await Promise.all([
        fetchAllBrandRoles(profileIds),
        fetchAllBranchRoles(profileIds),
      ]);

      // Build maps
      const brandRolesMap = new Map(brandRoles?.map((r) => [r.user_id, r]));
      const branchRolesMap = new Map<string, BranchRoleInfo[]>();

      // Group branch roles by user
      for (const br of branchRoles || []) {
        const branchName = branches.find((b) => b.id === br.branch_id)?.name || 'Sucursal';
        const roleInfo: BranchRoleInfo = {
          branch_id: br.branch_id,
          branch_name: branchName,
          local_role: br.local_role as LocalRole,
          default_position: br.default_position as WorkPositionType | null,
          clock_pin: br.clock_pin,
          is_active: br.is_active ?? true,
          role_record_id: br.id,
        };

        const existing = branchRolesMap.get(br.user_id) || [];
        existing.push(roleInfo);
        branchRolesMap.set(br.user_id, existing);
      }

      // Merge data
      return profiles.map((p) => {
        const brandRole = brandRolesMap.get(p.id);
        const userBranchRoles = branchRolesMap.get(p.id) || [];

        // Calcular rol local principal (el de mayor prioridad)
        let primaryLocalRole: LocalRole = null;
        let maxPriority = 0;
        for (const br of userBranchRoles) {
          const priority = ROLE_PRIORITY[br.local_role] || 0;
          if (priority > maxPriority) {
            maxPriority = priority;
            primaryLocalRole = br.local_role;
          }
        }

        return {
          id: p.id,
          user_id: p.id,
          full_name: p.full_name || '',
          email: p.email || '',
          phone: p.phone,
          created_at: p.created_at,
          brand_role: (brandRole?.brand_role as BrandRole) || null,
          brand_role_id: brandRole?.id || null,
          branch_roles: userBranchRoles,
          hasLocalAccess: userBranchRoles.length > 0,
          primaryLocalRole,
        } as UserWithStats;
      });
    },
    staleTime: 30 * 1000,
    enabled: branches.length > 0,
  });

  return { users, branches, loading: loadingUsers, refetch };
}
