import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { UsersFilters, UsersTable, useUsersData, userHasRole } from '@/components/admin/users';

export default function UsersPage() {
  const { isSuperadmin, loading: permLoading } = useDynamicPermissions();
  const { users, branches, loading, refetch } = useUsersData();

  // Filter state - simplified
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!user.full_name?.toLowerCase().includes(q) && !user.email?.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Role filter - buscar si TIENE el rol (inclusivo)
      if (roleFilter !== 'all') {
        if (roleFilter === 'sin_rol') {
          if (user.brand_role || user.hasLocalAccess) return false;
        } else if (!userHasRole(user.brand_role, user.branch_roles, roleFilter)) {
          return false;
        }
      }

      // Access filter - usa nueva arquitectura
      if (accessFilter === 'brand' && !user.brand_role) return false;
      if (accessFilter === 'local' && !user.hasLocalAccess) return false;
      if (accessFilter === 'none' && (user.brand_role || user.hasLocalAccess)) return false;

      return true;
    });
  }, [users, search, roleFilter, accessFilter]);

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <HoppinessLoader />
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Acceso restringido</h2>
          <p className="text-muted-foreground mt-2">Solo superadmin puede ver esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Usuarios" subtitle="Gestión de accesos y roles" />

      <UsersFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        accessFilter={accessFilter}
        onAccessFilterChange={setAccessFilter}
      />

      <div className="text-sm text-muted-foreground">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </div>

      <UsersTable users={filteredUsers} branches={branches} onUserUpdated={refetch} />
    </div>
  );
}
