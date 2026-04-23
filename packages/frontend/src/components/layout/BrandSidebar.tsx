/**
 * BrandSidebar - Navegación de Mi Marca (7 secciones funcionales)
 * Superadmins pueden reordenar secciones madre con drag & drop.
 */
import { useState, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllBranchSlugs } from '@/services/configService';
import { useLocation } from 'react-router-dom';
import { useUnreadMessagesCount } from '@/hooks/useContactMessages';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { useSidebarOrder } from '@/hooks/useSidebarOrder';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  LayoutDashboard,
  Store,
  Users,
  Megaphone,
  MapPin,
  Plus,
  Building2,
  MessageSquare,
  FileText,
  Shield,
  ClipboardList,
  BarChart3,
  Wallet,
  Package,
  Truck,
  Landmark,
  TrendingUp,
  CalendarDays,
  Calendar,
  Eye,
  Calculator,
  BookOpen,
  ChefHat,
  Beef,
  Network,
  Boxes,
  Briefcase,
  GripVertical,
  History,
  Tag,
} from 'lucide-react';
import {
  WorkSidebarNav,
  NavSectionGroup,
  NavItemButton,
  NavDashboardLink,
  NavActionButton,
} from './WorkSidebar';
import NewBranchModal from '@/components/admin/NewBranchModal';

/* â”€â”€ Sortable wrapper for a section â”€â”€ */
function SortableSection({
  id,
  children,
  disabled,
}: {
  id: string;
  children: ReactNode;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/sortable">
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1 z-10 p-1 opacity-0 group-hover/sortable:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground"
          tabIndex={-1}
          aria-label="Reordenar sección"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {children}
    </div>
  );
}

export function BrandSidebar() {
  const location = useLocation();
  const { data: unreadCount } = useUnreadMessagesCount();
  const { brand: bp, isSuperadmin } = useDynamicPermissions();
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const { sectionOrder, reorder } = useSidebarOrder();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const { data: branches, refetch: refetchBranches } = useQuery({
    queryKey: ['brand-sidebar-branches'],
    queryFn: fetchAllBranchSlugs,
  });

  const p = location.pathname;

  // Active section detection
  const isLocalesActive = p.includes('/mimarca/locales');
  const isMenuEngActive =
    p.includes('/mimarca/finanzas/insumos') ||
    p.includes('/mimarca/finanzas/proveedores') ||
    p.includes('/mimarca/recetas') ||
    p.includes('/mimarca/carta') ||
    p === '/mimarca/centro-costos' ||
    p.includes('/mimarca/precios-canal') ||
    p.includes('/mimarca/canales-venta') ||
    p.includes('/mimarca/cambios-canal') ||
    p.includes('/mimarca/productos') ||
    p.includes('/mimarca/promociones') ||
    p.includes('/mimarca/codigos-descuento');
  const isGestionRedActive =
    p.includes('/mimarca/supervisiones') ||
    p.includes('/mimarca/coaching') ||
    p.includes('/mimarca/comunicados') ||
    p.includes('/mimarca/reuniones');
  const isModeloOpActive =
    p.includes('/mimarca/finanzas/conceptos-servicio') ||
    p.includes('/mimarca/configuracion/calendario') ||
    p.includes('/mimarca/reglamentos') ||
    p.includes('/mimarca/configuracion/cierres') ||
    p.includes('/mimarca/delivery');
  const isFinanzasActive =
    p.includes('/mimarca/finanzas/ventas-mensuales') ||
    p.includes('/mimarca/finanzas/canon') ||
    p.includes('/mimarca/informes');
  const isAdminActive =
    p.includes('/mimarca/mensajes') ||
    p.includes('/mimarca/equipo-central') ||
    p.includes('/mimarca/usuarios') ||
    p.includes('/mimarca/configuracion/permisos') ||
    p.includes('/mimarca/auditoria');

  // Section visibility
  const canSeeLocales = bp.canViewLocales;
  const canSeeMenuEng = bp.canViewInsumos || bp.canViewProveedoresMarca;
  const canSeeGestionRed =
    bp.canCoachManagers || bp.canViewCoaching || bp.canManageMessages || bp.canViewMeetings;
  const canSeeModeloOp =
    bp.canEditBrandConfig ||
    bp.canViewConceptosServicio ||
    bp.canManageDeliveryZones ||
    isSuperadmin;
  const canSeeFinanzas = bp.canViewVentasMensuales || bp.canViewCanon || bp.canViewPnL;
  const canSeeAdmin =
    bp.canViewContactMessages || bp.canViewCentralTeam || bp.canSearchUsers || isSuperadmin;

  // Build section map
  const sectionMap: Record<string, ReactNode> = useMemo(
    () => ({
      locales: canSeeLocales ? (
        <NavSectionGroup
          id="locales"
          label="Locales"
          icon={Store}
          defaultOpen
          forceOpen={isLocalesActive}
        >
          {branches?.map((branch) => (
            <NavItemButton
              key={branch.id}
              to={`/mimarca/locales/${branch.slug}`}
              icon={MapPin}
              label={branch.name}
            />
          ))}
          {bp.canCreateLocales && (
            <NavActionButton
              icon={Plus}
              label="Nueva Sucursal"
              onClick={() => setShowNewBranchModal(true)}
              variant="primary"
            />
          )}
        </NavSectionGroup>
      ) : null,

      'menu-eng': canSeeMenuEng ? (
        <NavSectionGroup
          id="menu-eng"
          label="Producto y Menú"
          icon={Beef}
          forceOpen={isMenuEngActive}
        >
          {bp.canViewInsumos && isSuperadmin && (
            <NavItemButton to="/mimarca/productos" icon={Boxes} label="Productos" />
          )}
          {bp.canViewInsumos && <NavItemButton to="/mimarca/carta" icon={BookOpen} label="Menú (Carta)" />}
          {bp.canViewInsumos && (
            <NavItemButton to="/mimarca/canales-venta" icon={Store} label="Canales de Venta" />
          )}
          {bp.canViewInsumos && (
            <NavItemButton to="/mimarca/cambios-canal" icon={FileText} label="Cambios por canal" />
          )}
          {/*
           * Fase 4 (follow-up): CategoriasCartaPage consolidada en
           * MenuCartaPage. La ruta sigue activa pero redirige.
           */}
          {bp.canViewInsumos && isSuperadmin && (
            <NavItemButton to="/mimarca/recetas" icon={ChefHat} label="Recetas" />
          )}
          {bp.canViewInsumos && (
            <NavItemButton
              to="/mimarca/finanzas/insumos"
              icon={Package}
              label="Catálogo de Compras"
            />
          )}
          {bp.canViewProveedoresMarca && (
            <NavItemButton to="/mimarca/finanzas/proveedores" icon={Truck} label="Proveedores" />
          )}
          {bp.canViewInsumos && (
            <NavItemButton to="/mimarca/promociones" icon={Tag} label="Promociones" />
          )}
          {/* Fase 4 (follow-up): Códigos Descuento es tab dentro de /promociones */}
          {bp.canViewInsumos && isSuperadmin && (
            <NavItemButton
              to="/mimarca/centro-costos"
              icon={Calculator}
              label="Control de Costos"
            />
          )}
        </NavSectionGroup>
      ) : null,

      'gestion-red': canSeeGestionRed ? (
        <NavSectionGroup
          id="gestion-red"
          label="Supervisión de Red"
          icon={Network}
          forceOpen={isGestionRedActive}
        >
          <NavItemButton to="/mimarca/supervisiones" icon={Eye} label="Supervisión" />
          {(bp.canCoachManagers || bp.canViewCoaching) && (
            <NavItemButton
              to="/mimarca/coaching/encargados"
              icon={ClipboardList}
              label="Coaching Encargados"
            />
          )}
          {bp.canViewCoaching && (
            <NavItemButton to="/mimarca/coaching/red" icon={BarChart3} label="Coaching Red" />
          )}
          {bp.canManageMessages && (
            <NavItemButton to="/mimarca/comunicados" icon={Megaphone} label="Comunicados" />
          )}
          {bp.canViewMeetings && (
            <NavItemButton to="/mimarca/reuniones" icon={Calendar} label="Reuniones" />
          )}
        </NavSectionGroup>
      ) : null,

      'modelo-op': canSeeModeloOp ? (
        <NavSectionGroup
          id="modelo-op"
          label="Modelo Operativo"
          icon={Boxes}
          forceOpen={isModeloOpActive}
        >
          {bp.canViewConceptosServicio && (
            <NavItemButton
              to="/mimarca/finanzas/conceptos-servicio"
              icon={FileText}
              label="Estructura de Costos"
            />
          )}
          <NavItemButton
            to="/mimarca/configuracion/calendario"
            icon={CalendarDays}
            label="Calendario Laboral"
          />
          <NavItemButton to="/mimarca/reglamentos" icon={FileText} label="Reglamentos" />
          <NavItemButton
            to="/mimarca/configuracion/cierres"
            icon={FileText}
            label="Cierre de Turno"
          />
          {bp.canManageDeliveryZones && (
            <NavItemButton to="/mimarca/delivery" icon={Truck} label="Delivery" />
          )}
        </NavSectionGroup>
      ) : null,

      finanzas: canSeeFinanzas ? (
        <NavSectionGroup
          id="finanzas"
          label="Finanzas Marca"
          icon={Wallet}
          forceOpen={isFinanzasActive}
        >
          {bp.canViewPnL && (
            <NavItemButton to="/mimarca/informes" icon={BarChart3} label="Reportes" />
          )}
          {bp.canViewVentasMensuales && (
            <NavItemButton
              to="/mimarca/finanzas/ventas-mensuales"
              icon={TrendingUp}
              label="Ventas Mensuales"
            />
          )}
          {bp.canViewCanon && (
            <NavItemButton to="/mimarca/finanzas/canon" icon={Landmark} label="Canon" />
          )}
        </NavSectionGroup>
      ) : null,

      admin: canSeeAdmin ? (
        <NavSectionGroup
          id="admin"
          label="Administración"
          icon={Briefcase}
          forceOpen={isAdminActive}
        >
          {bp.canViewContactMessages && (
            <NavItemButton
              to="/mimarca/mensajes"
              icon={MessageSquare}
              label="Bandeja de Entrada"
              badge={unreadCount || undefined}
              badgeVariant="warning"
            />
          )}
          {bp.canViewCentralTeam && (
            <NavItemButton to="/mimarca/equipo-central" icon={Building2} label="Equipo Central" />
          )}
          {bp.canSearchUsers && (
            <NavItemButton to="/mimarca/usuarios" icon={Users} label="Usuarios y Permisos" />
          )}
          {isSuperadmin && (
            <NavItemButton
              to="/mimarca/configuracion/permisos"
              icon={Shield}
              label="Config. Permisos"
            />
          )}
          {isSuperadmin && (
            <NavItemButton to="/mimarca/auditoria" icon={History} label="Auditoría" />
          )}
        </NavSectionGroup>
      ) : null,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [
      p,
      branches,
      bp,
      isSuperadmin,
      unreadCount,
      canSeeLocales,
      canSeeMenuEng,
      canSeeGestionRed,
      canSeeModeloOp,
      canSeeFinanzas,
      canSeeAdmin,
    ],
  );

  // Only show visible sections in the order from DB
  const visibleSections = sectionOrder.filter((id) => sectionMap[id] != null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleSections.indexOf(active.id as string);
    const newIndex = visibleSections.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = [...visibleSections];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    reorder(newOrder);
  }

  return (
    <>
      <WorkSidebarNav>
        {bp.canViewDashboard && (
          <NavDashboardLink to="/mimarca" icon={LayoutDashboard} label="Dashboard" />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleSections} strategy={verticalListSortingStrategy}>
            {visibleSections.map((sectionId) => (
              <SortableSection key={sectionId} id={sectionId} disabled={!isSuperadmin}>
                {sectionMap[sectionId]}
              </SortableSection>
            ))}
          </SortableContext>
        </DndContext>
      </WorkSidebarNav>

      <NewBranchModal
        open={showNewBranchModal}
        onOpenChange={setShowNewBranchModal}
        onCreated={refetchBranches}
      />
    </>
  );
}

export default BrandSidebar;
