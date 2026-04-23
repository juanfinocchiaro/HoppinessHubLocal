/**
 * ImpersonationSelector - Selector de usuario para "Ver como..."
 *
 * Modal con búsqueda de usuarios para que el superadmin seleccione quién impersonar.
 * Filtra usuarios según el contexto:
 * - Modo 'brand': Muestra usuarios con rol de marca (acceso a Mi Marca)
 * - Modo 'local': Muestra usuarios con acceso al branch específico
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBrandRoleUserIds, fetchBranchRoleUserIds, fetchSuperadminUserIds, fetchOperationalStaffUserIds, fetchProfilesForImpersonation, fetchBrandRolesForUsers, fetchBranchRolesForUsers } from '@/services/adminService';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, Loader2, Eye } from 'lucide-react';
import { LOCAL_ROLE_LABELS, BRAND_ROLE_LABELS } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

type ImpersonationMode = 'brand' | 'local' | 'cuenta';

interface ImpersonationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modo de filtrado: 'brand' para Mi Marca, 'local' para Mi Local */
  mode?: ImpersonationMode;
  /** Branch ID requerido cuando mode es 'local' */
  branchId?: string;
  /** Nombre del local para mostrar en el título */
  branchName?: string;
}

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  brand_role: string | null;
  local_roles: { role: string; branch_name: string; branch_id: string }[];
}

export default function ImpersonationSelector({
  open,
  onOpenChange,
  mode = 'brand',
  branchId,
  branchName,
}: ImpersonationSelectorProps) {
  const { startImpersonating, loading: impersonating } = useImpersonation();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch users with their roles, filtered by mode
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['impersonation-users', search, mode, branchId],
    queryFn: async () => {
      if (mode === 'local' && !branchId) return [];

      let eligibleUserIds: string[] = [];

      if (mode === 'cuenta') {
        eligibleUserIds = await fetchOperationalStaffUserIds();
      } else if (mode === 'brand') {
        eligibleUserIds = await fetchBrandRoleUserIds();
      } else {
        const [branchUserIds, superadminIds] = await Promise.all([
          fetchBranchRoleUserIds(branchId!),
          fetchSuperadminUserIds(),
        ]);
        eligibleUserIds = [...new Set([...branchUserIds, ...superadminIds])];
      }

      if (eligibleUserIds.length === 0) return [];

      const profiles = await fetchProfilesForImpersonation({
        userIds: eligibleUserIds,
        search: search.trim() || undefined,
      });

      if (profiles.length === 0) return [];

      const userIds = profiles.map((p) => p.id);
      const [brandRoles, branchRoles] = await Promise.all([
        fetchBrandRolesForUsers(userIds),
        fetchBranchRolesForUsers(userIds),
      ]);

      const usersWithRoles: UserWithRoles[] = profiles.map((profile) => {
        const brandRole = brandRoles.find((r) => r.user_id === profile.id);
        const localRoles =
          (branchRoles as Array<Record<string, unknown>>)
            .filter((r) => r.user_id === profile.id)
            .map((r) => ({
              role: r.local_role as string,
              branch_name: (r.branches as { name: string })?.name || 'Desconocido',
              branch_id: r.branch_id as string,
            })) || [];

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          brand_role: brandRole?.brand_role || null,
          local_roles: localRoles,
        };
      });

      return usersWithRoles;
    },
    enabled: open,
    staleTime: 30000,
  });

  const handleSelect = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      await startImpersonating(userId);
      toast.success('Modo vista previa activado');
      onOpenChange(false);
      setSearch('');
      setSelectedUserId(null);
    } catch (error) {
      handleError(error, { userMessage: 'Error al activar modo vista previa', context: 'ImpersonationSelector' });
      setSelectedUserId(null);
    }
  };

  const getRoleBadges = (user: UserWithRoles) => {
    const badges: React.ReactNode[] = [];

    // Brand role badge
    if (user.brand_role) {
      badges.push(
        <Badge key="brand" variant="default" className="bg-primary/80">
          {BRAND_ROLE_LABELS[user.brand_role] || user.brand_role}
        </Badge>,
      );
    }

    // Local roles - filter by current branch if in local mode
    const relevantLocalRoles =
      mode === 'local' && branchId
        ? user.local_roles.filter((lr) => lr.branch_id === branchId)
        : user.local_roles;

    relevantLocalRoles.slice(0, 2).forEach((lr, idx) => {
      badges.push(
        <Badge key={`local-${idx}`} variant="secondary" className="text-xs">
          {LOCAL_ROLE_LABELS[lr.role] || lr.role}
          {mode === 'brand' && ` - ${lr.branch_name}`}
        </Badge>,
      );
    });

    if (relevantLocalRoles.length > 2) {
      badges.push(
        <Badge key="more" variant="outline" className="text-xs">
          +{relevantLocalRoles.length - 2} más
        </Badge>,
      );
    }

    if (badges.length === 0) {
      badges.push(
        <Badge key="none" variant="outline" className="text-muted-foreground">
          Sin rol
        </Badge>,
      );
    }

    return badges;
  };

  const getTitle = () => {
    if (mode === 'cuenta') return 'Ver como empleado';
    if (mode === 'local' && branchName) return `Ver como usuario de ${branchName}`;
    return 'Ver como usuario de Mi Marca';
  };

  const getDescription = () => {
    if (mode === 'cuenta') {
      return 'Seleccioná un empleado, cajero o encargado para ver Mi Trabajo desde su perspectiva.';
    }
    if (mode === 'local') {
      return `Seleccioná un usuario con acceso a este local para ver la aplicación desde su perspectiva.`;
    }
    return 'Seleccioná un usuario con acceso a Mi Marca para ver la aplicación desde su perspectiva.';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Users List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search
                  ? 'No se encontraron usuarios'
                  : 'No hay usuarios con acceso a esta sección'}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    disabled={impersonating && selectedUserId === user.id}
                    className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{user.full_name}</span>
                          {impersonating && selectedUserId === user.id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">{getRoleBadges(user)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
