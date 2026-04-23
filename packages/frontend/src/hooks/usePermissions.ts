/**
 * usePermissions Hook - Sistema de Roles Fijos con Roles por Sucursal
 *
 * Arquitectura V2: Los roles locales ahora son específicos por sucursal.
 * Un usuario puede tener roles diferentes en diferentes sucursales.
 *
 * Roles de Marca (brand_role) - único por usuario:
 * - superadmin: Dueño de la marca, acceso total
 * - coordinador: Marketing/gestión de productos
 * - informes: Solo reportes (socio/inversor)
 * - contador_marca: Finanzas de marca
 *
 * Roles Locales (local_role) - uno por sucursal:
 * - franquiciado: Dueño del local
 * - encargado: Gestión día a día
 * - contador_local: Finanzas del local
 * - cajero: Operación POS/Caja
 * - empleado: Solo Mi Cuenta
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Tables } from '@/types/database';
import {
  fetchUserBrandRole,
  fetchUserBranchRoles,
  fetchAccessibleBranches,
} from '@/services/permissionsService';

type Branch = Tables<'branches'>;

// Tipos de roles
export type BrandRole =
  | 'superadmin'
  | 'coordinador'
  | 'informes'
  | 'contador_marca'
  | 'community_manager'
  | null;
export type LocalRole =
  | 'franquiciado'
  | 'encargado'
  | 'contador_local'
  | 'cajero'
  | 'empleado'
  | null;

// Estructura de rol de marca
interface UserBrandRole {
  id: string;
  user_id: string;
  brand_role: BrandRole;
  is_active: boolean;
}

// Estructura de rol por sucursal
export interface UserBranchRole {
  branch_id: string;
  local_role: LocalRole;
}

// Interface de retorno del hook
export interface PermissionsV2 {
  // Estado
  loading: boolean;
  error: Error | null;

  // Roles
  brandRole: BrandRole;
  localRole: LocalRole; // Rol en la sucursal actual (si se pasó currentBranchId)
  branchRoles: UserBranchRole[]; // Todos los roles por sucursal del usuario
  accessibleBranches: Branch[];

  // Helpers de rol
  isSuperadmin: boolean;
  isCoordinador: boolean;
  isCommunityManager: boolean;
  isInformes: boolean;
  isContadorMarca: boolean;
  isFranquiciado: boolean;
  isEncargado: boolean;
  isContadorLocal: boolean;
  isCajero: boolean;
  isEmpleado: boolean;

  // Acceso a paneles
  canAccessBrandPanel: boolean;
  canAccessLocalPanel: boolean;

  // Verificación de acceso a sucursal
  hasAccessToBranch: (branchId: string) => boolean;
  getLocalRoleForBranch: (branchId: string) => LocalRole;
  canApproveWithPin: boolean;

  // ===== PERMISOS PANEL MARCA =====
  brand: {
    // Dashboard
    canViewDashboard: boolean;
    canViewPnL: boolean;
    canViewComparativa: boolean;
    canViewHoursSummary: boolean;

    // Locales
    canViewLocales: boolean;
    canCreateLocales: boolean;

    // Catálogo
    canViewProducts: boolean;
    canEditProducts: boolean;
    canManageModifiers: boolean;
    canManageIngredients: boolean;
    canEditPrices: boolean;
    canManagePromotions: boolean;

    // Catálogos Marca
    canViewInsumos: boolean;
    canEditInsumos: boolean;
    canViewConceptosServicio: boolean;
    canEditConceptosServicio: boolean;
    canViewProveedoresMarca: boolean;
    canEditProveedoresMarca: boolean;

    // Finanzas Marca
    canViewVentasMensuales: boolean;
    canEditVentasMensuales: boolean;
    canViewCanon: boolean;
    canEditCanon: boolean;

    // Proveedores
    canManageSuppliers: boolean;

    // Equipo
    canManageCentralTeam: boolean;
    canViewCentralTeam: boolean;
    canSearchUsers: boolean;
    canAssignRoles: boolean;

    // Comunicación
    canManageMessages: boolean;
    canViewContactMessages: boolean;
    canManageContactMessages: boolean;

    // Coaching
    canCoachManagers: boolean;
    canViewCoaching: boolean;

    // Reuniones
    canViewMeetings: boolean;
    canCreateMeetings: boolean;

    // Delivery
    canManageDeliveryPricing: boolean;
    canManageDeliveryZones: boolean;

    // Configuración
    canEditBrandConfig: boolean;
    canManageChannels: boolean;
    canManageIntegrations: boolean;
  };

  // ===== PERMISOS PANEL LOCAL =====
  local: {
    // Visión General
    canViewDashboard: boolean;

    // Stock
    canViewStock: boolean;
    canOrderFromSupplier: boolean;
    canDoInventoryCount: boolean;

    // Compras
    canUploadInvoice: boolean;
    canViewSuppliers: boolean;
    canViewSupplierAccounts: boolean;
    canPaySupplier: boolean;
    canViewPurchaseHistory: boolean;

    // Equipo
    canClockInOut: boolean;
    canViewAllClockIns: boolean;
    canViewTeam: boolean;
    canEditSchedules: boolean;
    canViewMonthlyHours: boolean;
    canViewPayroll: boolean;
    canInviteEmployees: boolean;
    canDeactivateEmployees: boolean;
    canViewSalaryAdvances: boolean;
    canViewWarnings: boolean;

    // Acciones operativas
    canCreateSalaryAdvance: boolean;
    canCancelSalaryAdvance: boolean;
    canCreateWarning: boolean;
    canUploadSignature: boolean;
    canDoCoaching: boolean;
    canViewCoaching: boolean;
    canSendLocalCommunication: boolean;
    canViewLocalCommunications: boolean;

    // Reuniones
    canViewMeetings: boolean;
    canCreateMeetings: boolean;
    canCloseMeetings: boolean;

    // Cierres de turno
    canViewClosures: boolean;
    canCloseShifts: boolean;

    // POS
    canAccessPOS: boolean;
    canViewKitchen: boolean;
    canAssignDelivery: boolean;
    canOperateDelivery: boolean;
    canOpenRegister: boolean;
    canCloseRegister: boolean;

    // Finanzas / Reportes
    canViewSalesReports: boolean;
    canViewLocalPnL: boolean;
    canViewCMV: boolean;
    canViewStockMovements: boolean;
    canViewGastos: boolean;
    canCreateGastos: boolean;
    canViewConsumos: boolean;
    canCreateConsumos: boolean;
    canViewPeriodos: boolean;
    canEditPeriodos: boolean;
    canViewVentasMensualesLocal: boolean;
    canEditVentasMensualesLocal: boolean;

    // Socios
    canViewSocios: boolean;
    canEditSocios: boolean;

    // Configuración
    canEditLocalConfig: boolean;
    canConfigPrinters: boolean;
    canConfigShifts: boolean;

    // Carga manual de ventas
    canEnterSales: boolean;
  };

  // Refetch
  refetch: () => void;
}

// Labels para UI
export const BRAND_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  coordinador: 'Coordinador',
  community_manager: 'Community Manager',
  informes: 'Informes',
  contador_marca: 'Contador Marca',
};

export const LOCAL_ROLE_LABELS: Record<string, string> = {
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  contador_local: 'Contador Local',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function usePermissions(currentBranchId?: string): PermissionsV2 {
  const { user } = useAuth();

  // Query para obtener el rol de marca del usuario
  const {
    data: brandRoleData,
    isLoading: loadingBrandRole,
    error: brandRoleError,
    refetch: refetchBrandRole,
  } = useQuery({
    queryKey: ['user-brand-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return fetchUserBrandRole(user.id) as Promise<UserBrandRole | null>;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Query para obtener roles por sucursal via SECURITY DEFINER RPC (bypassa RLS)
  const {
    data: branchRolesData = [],
    isLoading: loadingBranchRoles,
    refetch: refetchBranchRoles,
  } = useQuery({
    queryKey: ['user-branch-roles', user?.id],
    queryFn: async (): Promise<UserBranchRole[]> => {
      if (!user?.id) return [];

      const roles = await fetchUserBranchRoles(user.id);
      return roles.map((r) => ({
        branch_id: r.branch_id,
        local_role: r.local_role as LocalRole,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Crear una key estable para branch_ids
  const branchIdsFromRoles = branchRolesData.map((r) => r.branch_id);
  const branchIdsKey = branchIdsFromRoles.join(',');

  // Query para obtener sucursales accesibles
  // IMPORTANTE: Esperar a que terminen las queries de roles antes de calcular sucursales
  const rolesLoaded = !loadingBrandRole && !loadingBranchRoles;

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['accessible-branches-v2', user?.id, branchIdsKey, brandRoleData?.brand_role],
    queryFn: async () => {
      if (!user?.id) return [];
      return fetchAccessibleBranches(brandRoleData?.brand_role ?? null, branchIdsFromRoles);
    },
    // Solo ejecutar cuando ya cargaron los roles (evita bucle infinito)
    enabled: !!user?.id && rolesLoaded,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Extraer roles
  const brandRole = (brandRoleData?.brand_role as BrandRole) || null;

  // Función helper para obtener rol local por sucursal
  const getLocalRoleForBranch = (branchId: string): LocalRole => {
    const role = branchRolesData.find((r) => r.branch_id === branchId);
    return (role?.local_role as LocalRole) || null;
  };

  // Rol local en la sucursal actual (si se pasó currentBranchId)
  const localRole = currentBranchId ? getLocalRoleForBranch(currentBranchId) : null;

  // Helpers de rol de marca
  const isSuperadmin = brandRole === 'superadmin';
  const isCoordinador = brandRole === 'coordinador';
  const isInformes = brandRole === 'informes';
  const isContadorMarca = brandRole === 'contador_marca';
  const isCommunityManager = brandRole === 'community_manager';

  // Helpers de rol local (para la sucursal actual)
  const isFranquiciado = localRole === 'franquiciado';
  const isEncargado = localRole === 'encargado';
  const isContadorLocal = localRole === 'contador_local';
  const isCajero = localRole === 'cajero';
  const isEmpleado = localRole === 'empleado';

  // Acceso a paneles (Local solo para franquiciado, encargado, contador_local, cajero; empleados no)
  const canAccessBrandPanel = !!brandRole;
  const canAccessLocalPanel =
    isSuperadmin ||
    branchRolesData.some((r) =>
      ['franquiciado', 'encargado', 'contador_local', 'cajero'].includes(r.local_role),
    );

  // Verificar acceso a sucursal específica
  const hasAccessToBranch = (branchId: string): boolean => {
    if (isSuperadmin) return true;
    return branchRolesData.some((r) => r.branch_id === branchId);
  };

  const canApproveWithPin = isFranquiciado || isEncargado;

  // ===== CALCULAR PERMISOS DE MARCA =====
  const brandPermissions = {
    // Dashboard
    canViewDashboard: !!brandRole,
    canViewPnL: isSuperadmin || isInformes || isContadorMarca,
    canViewComparativa: isSuperadmin || isInformes || isContadorMarca,
    canViewHoursSummary: isSuperadmin || isInformes || isContadorMarca,

    // Locales
    canViewLocales: !!brandRole,
    canCreateLocales: isSuperadmin,

    // Catálogo
    canViewProducts: isSuperadmin || isCoordinador,
    canEditProducts: isSuperadmin || isCoordinador,
    canManageModifiers: isSuperadmin || isCoordinador,
    canManageIngredients: isSuperadmin || isCoordinador,
    canEditPrices: isSuperadmin,
    canManagePromotions: isSuperadmin || isCoordinador,

    // Catálogos Marca
    canViewInsumos: isSuperadmin || isCoordinador || isContadorMarca,
    canEditInsumos: isSuperadmin || isCoordinador,
    canViewConceptosServicio: isSuperadmin || isCoordinador || isContadorMarca,
    canEditConceptosServicio: isSuperadmin || isCoordinador,
    canViewProveedoresMarca: isSuperadmin || isCoordinador || isContadorMarca,
    canEditProveedoresMarca: isSuperadmin || isCoordinador,

    // Finanzas Marca
    canViewVentasMensuales: isSuperadmin || isInformes || isContadorMarca,
    canEditVentasMensuales: isSuperadmin || isContadorMarca,
    canViewCanon: isSuperadmin || isContadorMarca,
    canEditCanon: isSuperadmin || isContadorMarca,

    // Proveedores
    canManageSuppliers: isSuperadmin,

    // Equipo
    canManageCentralTeam: isSuperadmin,
    canViewCentralTeam: isSuperadmin || isCoordinador,
    canSearchUsers: isSuperadmin,
    canAssignRoles: isSuperadmin,

    // Comunicación
    canManageMessages: isSuperadmin || isCoordinador || isCommunityManager,
    canViewContactMessages: isSuperadmin || isCoordinador || isCommunityManager,
    canManageContactMessages: isSuperadmin || isCoordinador || isCommunityManager,

    // Coaching
    canCoachManagers: isSuperadmin || isCoordinador,
    canViewCoaching: isSuperadmin || isCoordinador,

    // Reuniones
    canViewMeetings: isSuperadmin || isCoordinador,
    canCreateMeetings: isSuperadmin || isCoordinador,

    // Delivery
    canManageDeliveryPricing: isSuperadmin,
    canManageDeliveryZones: isSuperadmin || isCoordinador,

    // Configuración
    canEditBrandConfig: isSuperadmin,
    canManageChannels: isSuperadmin || isCoordinador || isCommunityManager,
    canManageIntegrations: isSuperadmin,
  };

  // ===== CALCULAR PERMISOS LOCALES =====
  const hasCurrentBranchAccess = currentBranchId ? hasAccessToBranch(currentBranchId) : false;

  const localPermissions = {
    // Visión General
    canViewDashboard:
      hasCurrentBranchAccess &&
      (isSuperadmin || isEncargado || isFranquiciado || isCajero || isContadorLocal),

    // Stock
    canViewStock: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canOrderFromSupplier: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canDoInventoryCount: hasCurrentBranchAccess && (isSuperadmin || isEncargado),

    // Compras - Incluye contador_local
    canUploadInvoice: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado),
    canViewSuppliers:
      hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado || isFranquiciado),
    canViewSupplierAccounts:
      hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado || isFranquiciado),
    canPaySupplier: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal),
    canViewPurchaseHistory:
      hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado || isFranquiciado),

    // Equipo
    canClockInOut: hasCurrentBranchAccess && (isSuperadmin || !!localRole),
    canViewAllClockIns:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
    canViewTeam: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canEditSchedules: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canViewMonthlyHours:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
    canViewPayroll:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
    canInviteEmployees: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canDeactivateEmployees: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canViewSalaryAdvances:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
    canViewWarnings:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),

    // Acciones operativas
    canCreateSalaryAdvance: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canCancelSalaryAdvance: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canCreateWarning: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canUploadSignature: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canDoCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canViewCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canSendLocalCommunication: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
    canViewLocalCommunications:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),

    // Reuniones
    canViewMeetings:
      hasCurrentBranchAccess &&
      (isSuperadmin || isEncargado || isFranquiciado || isCajero || isEmpleado),
    canCreateMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canCloseMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),

    // Cierres de turno
    canViewClosures:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isCajero),
    canCloseShifts: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),

    // POS
    canAccessPOS: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
    canViewKitchen: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
    canAssignDelivery: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
    canOperateDelivery:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isCajero),
    canOpenRegister: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
    canCloseRegister: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),

    // Finanzas / Reportes
    canViewSalesReports: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canViewLocalPnL: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isFranquiciado),
    canViewCMV: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
    canViewStockMovements:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canViewGastos:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
    canCreateGastos: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isContadorLocal),
    canViewConsumos:
      hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
    canCreateConsumos: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isContadorLocal),
    canViewPeriodos: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
    canEditPeriodos: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
    canViewVentasMensualesLocal:
      hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
    canEditVentasMensualesLocal:
      hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),

    // Socios
    canViewSocios: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
    canEditSocios: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),

    // Configuración
    canEditLocalConfig: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
    canConfigPrinters: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
    canConfigShifts: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),

    // Carga manual de ventas
    canEnterSales: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
  };

  // Refetch combinado
  const refetch = () => {
    refetchBrandRole();
    refetchBranchRoles();
  };

  return {
    // Estado
    loading: loadingBrandRole || loadingBranchRoles || loadingBranches,
    error: brandRoleError as Error | null,

    // Roles
    brandRole,
    localRole,
    branchRoles: branchRolesData,
    accessibleBranches: branches as Branch[],

    // Helpers de rol
    isSuperadmin,
    isCoordinador,
    isCommunityManager,
    isInformes,
    isContadorMarca,
    isFranquiciado,
    isEncargado,
    isContadorLocal,
    isCajero,
    isEmpleado,

    // Acceso a paneles
    canAccessBrandPanel,
    canAccessLocalPanel,

    // Verificación
    hasAccessToBranch,
    getLocalRoleForBranch,
    canApproveWithPin,

    // Permisos
    brand: brandPermissions,
    local: localPermissions,

    // Refetch
    refetch,
  };
}

export default usePermissions;
