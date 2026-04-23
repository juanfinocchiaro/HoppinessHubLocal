/**
 * UserMenuDropdown — Unified avatar/user menu used across the entire app.
 * Structure: identity → personal (pedidos, direcciones, perfil) → La Tienda →
 * work panels (Mi Trabajo, Mi Local, Mi Marca) when user has roles → Cerrar sesión last.
 */
import {
  User,
  Package,
  MapPin,
  LogOut,
  Store,
  Building2,
  Briefcase,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useAccountSheets } from '@/contexts/AccountSheetsContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';

export function UserMenuDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthModal } = useAuthModal();
  const { openMisPedidos, openDirecciones, openPerfil } = useAccountSheets();
  const { canAccessLocalPanel, canAccessBrandPanel, accessibleBranches, branchRoles } =
    usePermissionsWithImpersonation();

  const canAccessLocal = canAccessLocalPanel;
  const canAccessBrand = canAccessBrandPanel;
  const firstBranchId = accessibleBranches[0]?.id;
  const showMiTrabajo = canAccessLocal || canAccessBrand || branchRoles.length > 0;

  const path = location.pathname;
  const activeSection = path.startsWith('/pedir')
    ? 'store'
    : path.startsWith('/cuenta')
      ? 'trabajo'
      : path.startsWith('/milocal')
        ? 'local'
        : path.startsWith('/mimarca')
          ? 'marca'
          : null;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal()}
        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
        title="Iniciar sesión"
      >
        <User className="w-5 h-5" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full hover:ring-2 hover:ring-primary/30 transition-all">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {user.user_metadata?.full_name || 'Mi cuenta'}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openMisPedidos}>
          <Package className="w-4 h-4 mr-2" />
          Mis pedidos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openDirecciones}>
          <MapPin className="w-4 h-4 mr-2" />
          Mis direcciones
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openPerfil}>
          <User className="w-4 h-4 mr-2" />
          Mi perfil
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/pedir')}
          className={activeSection === 'store' ? 'bg-accent/10 text-accent font-semibold' : ''}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          La Tienda
          {activeSection === 'store' && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </DropdownMenuItem>

        {(showMiTrabajo || canAccessLocal || canAccessBrand) && <DropdownMenuSeparator />}
        {showMiTrabajo && (
          <DropdownMenuItem
            onClick={() => navigate('/cuenta')}
            className={activeSection === 'trabajo' ? 'bg-accent/10 text-accent font-semibold' : ''}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Mi Trabajo
            {activeSection === 'trabajo' && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </DropdownMenuItem>
        )}
        {canAccessLocal && (
          <DropdownMenuItem
            onClick={() => navigate(firstBranchId ? `/milocal/${firstBranchId}` : '/milocal')}
            className={activeSection === 'local' ? 'bg-accent/10 text-accent font-semibold' : ''}
          >
            <Store className="w-4 h-4 mr-2" />
            Mi Local
            {activeSection === 'local' && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </DropdownMenuItem>
        )}
        {canAccessBrand && (
          <DropdownMenuItem
            onClick={() => navigate('/mimarca')}
            className={activeSection === 'marca' ? 'bg-accent/10 text-accent font-semibold' : ''}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Mi Marca
            {activeSection === 'marca' && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
