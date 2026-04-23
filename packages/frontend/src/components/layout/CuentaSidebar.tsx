/**
 * CuentaSidebar - Navegación para Mi Trabajo (staff)
 *
 * All work-related items grouped under "Mi Trabajo".
 * Clients are redirected to the store and never see this sidebar.
 */
import { useLocation } from 'react-router-dom';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import {
  Home,
  Briefcase,
  Calendar,
  Clock,
  ClipboardList,
  Users,
  MessageSquare,
  FileCheck,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { WorkSidebarNav, NavSectionGroup, NavItemButton, NavDashboardLink } from './WorkSidebar';

export function CuentaSidebar() {
  const location = useLocation();
  const { branchRoles } = usePermissionsWithImpersonation();

  // Check if user is staff (has any local role)
  const isStaff = branchRoles.length > 0;

  const isOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');

  const hasMultipleBranches = branchRoles.length >= 2;

  // Staff that work operationally (not just owners)
  const isOperationalStaff = isStaff && !isOnlyFranquiciado;

  // Check active section for auto-expand
  const trabajoPaths = [
    '/cuenta/horario',
    '/cuenta/fichajes',
    '/cuenta/coachings',
    '/cuenta/reuniones',
    '/cuenta/apercibimientos',
    '/cuenta/solicitudes',
    '/cuenta/adelantos',
    '/cuenta/comunicados',
    '/cuenta/reglamento',
  ];
  const isTrabajoActive = trabajoPaths.some((p) => location.pathname.startsWith(p));

  return (
    <WorkSidebarNav>
      <NavDashboardLink to="/cuenta" icon={Home} label="Inicio" />

      {/* Mi Trabajo — all work-related items in one group */}
      {isOperationalStaff && (
        <NavSectionGroup
          id="trabajo"
          label="Mi Trabajo"
          icon={Briefcase}
          defaultOpen
          forceOpen={isTrabajoActive}
        >
          <NavItemButton to="/cuenta/horario" icon={Calendar} label="Horario" />
          <NavItemButton to="/cuenta/fichajes" icon={Clock} label="Fichajes" />
          <NavItemButton to="/cuenta/coachings" icon={ClipboardList} label="Coachings" />
          <NavItemButton
            to="/cuenta/apercibimientos"
            icon={AlertTriangle}
            label="Apercibimientos"
          />
          <NavItemButton to="/cuenta/reuniones" icon={Users} label="Reuniones" />
          <NavItemButton to="/cuenta/solicitudes" icon={CalendarDays} label="Días Libres" />
          <NavItemButton to="/cuenta/adelantos" icon={DollarSign} label="Adelantos" />
          <NavItemButton to="/cuenta/comunicados" icon={MessageSquare} label="Comunicados" />
          <NavItemButton to="/cuenta/reglamento" icon={FileCheck} label="Reglamento" />
        </NavSectionGroup>
      )}

      {/* Comunicados for staff that isn't operational (e.g. only franquiciado) */}
      {isStaff && !isOperationalStaff && (
        <NavDashboardLink to="/cuenta/comunicados" icon={MessageSquare} label="Comunicados" />
      )}

      {/* Comparativo - For multi-branch franquiciados */}
      {hasMultipleBranches && isOnlyFranquiciado && (
        <NavDashboardLink to="/cuenta/comparativo" icon={BarChart3} label="Comparativo" />
      )}
    </WorkSidebarNav>
  );
}

export default CuentaSidebar;
