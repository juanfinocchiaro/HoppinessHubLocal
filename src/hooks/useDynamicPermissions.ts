/**
 * useDynamicPermissions - Hook combinado que usa permission_config como override
 *
 * Combina:
 * 1. usePermissions (roles y permisos hardcodeados)
 * 2. usePermissionOverrides (configuración dinámica de permission_config)
 *
 * La lógica:
 * - Si existe una configuración en permission_config → usa esa
 * - Si no existe → usa el fallback hardcodeado de usePermissions
 */
import { useMemo } from 'react';
import { usePermissions, type PermissionsV2 } from './usePermissions';
import { usePermissionOverrides } from './usePermissionOverrides';

export interface DynamicPermissions extends PermissionsV2 {
  /** Indica si los permisos dinámicos están cargando */
  loadingConfig: boolean;
}

export function useDynamicPermissions(currentBranchId?: string): DynamicPermissions {
  const permissions = usePermissions(currentBranchId);
  const { getPermission, isLoading: loadingConfig } = usePermissionOverrides();

  // Calcular permisos de marca con overrides
  const dynamicBrandPermissions = useMemo(() => {
    const { brandRole, isSuperadmin } = permissions;

    // Superadmin siempre tiene todos los permisos (no configurable)
    if (isSuperadmin) {
      return permissions.brand;
    }

    const gp = (key: string, fallback: boolean) => getPermission(key, brandRole, fallback);

    return {
      // Dashboard
      canViewDashboard: gp('brand.viewDashboard', permissions.brand.canViewDashboard),
      canViewPnL: gp('brand.viewPnL', permissions.brand.canViewPnL),
      canViewComparativa: gp('brand.viewComparativa', permissions.brand.canViewComparativa),
      canViewHoursSummary: gp('brand.viewHoursSummary', permissions.brand.canViewHoursSummary),

      // Locales
      canViewLocales: gp('brand.viewBranches', permissions.brand.canViewLocales),
      canCreateLocales: gp('brand.createBranches', permissions.brand.canCreateLocales),

      // Catálogos Marca
      canViewProducts: gp('brand.viewProducts', permissions.brand.canViewProducts),
      canEditProducts: gp('brand.editProducts', permissions.brand.canEditProducts),
      canManageModifiers: gp('brand.manageModifiers', permissions.brand.canManageModifiers),
      canManageIngredients: gp('brand.manageIngredients', permissions.brand.canManageIngredients),
      canEditPrices: gp('brand.editPrices', permissions.brand.canEditPrices),
      canManagePromotions: gp('brand.managePromotions', permissions.brand.canManagePromotions),
      canViewInsumos: gp('brand.viewInsumos', permissions.brand.canViewInsumos),
      canEditInsumos: gp('brand.editInsumos', permissions.brand.canEditInsumos),
      canViewConceptosServicio: gp('brand.viewConceptosServicio', permissions.brand.canViewConceptosServicio),
      canEditConceptosServicio: gp('brand.editConceptosServicio', permissions.brand.canEditConceptosServicio),
      canViewProveedoresMarca: gp('brand.viewProveedoresMarca', permissions.brand.canViewProveedoresMarca),
      canEditProveedoresMarca: gp('brand.editProveedoresMarca', permissions.brand.canEditProveedoresMarca),

      // Finanzas Marca
      canViewVentasMensuales: gp('brand.viewVentasMensuales', permissions.brand.canViewVentasMensuales),
      canEditVentasMensuales: gp('brand.editVentasMensuales', permissions.brand.canEditVentasMensuales),
      canViewCanon: gp('brand.viewCanon', permissions.brand.canViewCanon),
      canEditCanon: gp('brand.editCanon', permissions.brand.canEditCanon),

      // Proveedores (legacy)
      canManageSuppliers: gp('brand.manageSuppliers', permissions.brand.canManageSuppliers),

      // Equipo
      canManageCentralTeam: gp('brand.editCentralTeam', permissions.brand.canManageCentralTeam),
      canViewCentralTeam: gp('brand.viewCentralTeam', permissions.brand.canViewCentralTeam),
      canSearchUsers: gp('brand.viewUsers', permissions.brand.canSearchUsers),
      canAssignRoles: gp('brand.assignRoles', permissions.brand.canAssignRoles),

      // Comunicación
      canManageMessages: gp('brand.createCommunications', permissions.brand.canManageMessages),
      canViewContactMessages: gp('brand.viewContactMessages', permissions.brand.canViewContactMessages),
      canManageContactMessages: gp('brand.manageContactMessages', permissions.brand.canManageContactMessages),

      // Coaching
      canCoachManagers: gp('brand.coachManagers', permissions.brand.canCoachManagers),
      canViewCoaching: gp('brand.viewCoaching', permissions.brand.canViewCoaching),

      // Reuniones
      canViewMeetings: gp('brand.viewMeetings', permissions.brand.canViewMeetings),
      canCreateMeetings: gp('brand.createMeetings', permissions.brand.canCreateMeetings),

      // Delivery
      canManageDeliveryPricing: gp('brand.manageDeliveryPricing', permissions.brand.canManageDeliveryPricing),
      canManageDeliveryZones: gp('brand.manageDeliveryZones', permissions.brand.canManageDeliveryZones),

      // Configuración
      canEditBrandConfig: gp('brand.editConfig', permissions.brand.canEditBrandConfig),
      canManageChannels: gp('brand.manageChannels', permissions.brand.canManageChannels),
      canManageIntegrations: gp('brand.manageIntegrations', permissions.brand.canManageIntegrations),
    };
  }, [permissions, getPermission]);

  // Calcular permisos locales con overrides
  const dynamicLocalPermissions = useMemo(() => {
    const { localRole, isSuperadmin, hasAccessToBranch } = permissions;

    // Superadmin siempre tiene todos los permisos
    if (isSuperadmin) {
      return permissions.local;
    }

    // Si no tiene acceso a la sucursal actual, no tiene permisos locales
    if (currentBranchId && !hasAccessToBranch(currentBranchId)) {
      return permissions.local;
    }

    const gp = (key: string, fallback: boolean) => getPermission(key, localRole, fallback);

    return {
      // Dashboard
      canViewDashboard: gp('local.viewDashboard', permissions.local.canViewDashboard),

      // Stock
      canViewStock: gp('local.viewStock', permissions.local.canViewStock),
      canOrderFromSupplier: gp('local.orderFromSupplier', permissions.local.canOrderFromSupplier),
      canDoInventoryCount: gp('local.doInventoryCount', permissions.local.canDoInventoryCount),

      // Compras / Operaciones
      canUploadInvoice: gp('local.createCompras', permissions.local.canUploadInvoice),
      canViewSuppliers: gp('local.viewProveedoresLocal', permissions.local.canViewSuppliers),
      canViewSupplierAccounts: gp('local.viewCuentaCorriente', permissions.local.canViewSupplierAccounts),
      canPaySupplier: gp('local.pagarProveedor', permissions.local.canPaySupplier),
      canViewPurchaseHistory: gp('local.viewCompras', permissions.local.canViewPurchaseHistory),

      // Equipo
      canClockInOut: gp('local.clockInOut', permissions.local.canClockInOut),
      canViewAllClockIns: gp('local.viewClockIns', permissions.local.canViewAllClockIns),
      canViewTeam: gp('local.viewTeam', permissions.local.canViewTeam),
      canEditSchedules: gp('local.editSchedules', permissions.local.canEditSchedules),
      canViewMonthlyHours: gp('local.viewMonthlyHours', permissions.local.canViewMonthlyHours),
      canViewPayroll: gp('local.viewPayroll', permissions.local.canViewPayroll),
      canInviteEmployees: gp('local.inviteEmployees', permissions.local.canInviteEmployees),
      canDeactivateEmployees: gp('local.deactivateEmployees', permissions.local.canDeactivateEmployees),
      canViewSalaryAdvances: gp('local.viewAdvances', permissions.local.canViewSalaryAdvances),
      canViewWarnings: gp('local.viewWarnings', permissions.local.canViewWarnings),

      // Acciones operativas
      canCreateSalaryAdvance: gp('local.createAdvances', permissions.local.canCreateSalaryAdvance),
      canCancelSalaryAdvance: gp('local.cancelAdvance', permissions.local.canCancelSalaryAdvance),
      canCreateWarning: gp('local.createWarnings', permissions.local.canCreateWarning),
      canUploadSignature: gp('local.uploadSignatures', permissions.local.canUploadSignature),
      canDoCoaching: gp('local.doCoaching', permissions.local.canDoCoaching),
      canViewCoaching: gp('local.viewCoaching', permissions.local.canViewCoaching),
      canSendLocalCommunication: gp('local.sendLocalCommunications', permissions.local.canSendLocalCommunication),
      canViewLocalCommunications: gp('local.viewLocalCommunications', permissions.local.canViewLocalCommunications),

      // Reuniones
      canViewMeetings: gp('local.viewMeetings', permissions.local.canViewMeetings),
      canCreateMeetings: gp('local.createMeetings', permissions.local.canCreateMeetings),
      canCloseMeetings: gp('local.closeMeetings', permissions.local.canCloseMeetings),

      // Cierres
      canViewClosures: gp('local.viewClosures', permissions.local.canViewClosures),
      canCloseShifts: gp('local.closeShifts', permissions.local.canCloseShifts),

      // POS
      canAccessPOS: gp('local.accessPOS', permissions.local.canAccessPOS),
      canViewKitchen: gp('local.viewKitchen', permissions.local.canViewKitchen),
      canAssignDelivery: gp('local.assignDelivery', permissions.local.canAssignDelivery),
      canOperateDelivery: gp('local.operateDelivery', permissions.local.canOperateDelivery),
      canOpenRegister: gp('local.openRegister', permissions.local.canOpenRegister),
      canCloseRegister: gp('local.closeRegister', permissions.local.canCloseRegister),

      // Finanzas
      canViewSalesReports: gp('local.viewSalesReports', permissions.local.canViewSalesReports),
      canViewLocalPnL: gp('local.viewPL', permissions.local.canViewLocalPnL),
      canViewCMV: gp('local.viewCMV', permissions.local.canViewCMV),
      canViewStockMovements: gp('local.viewStockMovements', permissions.local.canViewStockMovements),
      canViewGastos: gp('local.viewGastos', permissions.local.canViewGastos),
      canCreateGastos: gp('local.createGastos', permissions.local.canCreateGastos),
      canViewConsumos: gp('local.viewConsumos', permissions.local.canViewConsumos),
      canCreateConsumos: gp('local.createConsumos', permissions.local.canCreateConsumos),
      canViewPeriodos: gp('local.viewPeriodos', permissions.local.canViewPeriodos),
      canEditPeriodos: gp('local.editPeriodos', permissions.local.canEditPeriodos),
      canViewVentasMensualesLocal: gp('local.viewVentasMensualesLocal', permissions.local.canViewVentasMensualesLocal),
      canEditVentasMensualesLocal: gp('local.editVentasMensualesLocal', permissions.local.canEditVentasMensualesLocal),

      // Socios
      canViewSocios: gp('local.viewSocios', permissions.local.canViewSocios),
      canEditSocios: gp('local.editSocios', permissions.local.canEditSocios),

      // Configuración
      canEditLocalConfig: gp('local.editConfig', permissions.local.canEditLocalConfig),
      canConfigPrinters: gp('local.configPrinters', permissions.local.canConfigPrinters),
      canConfigShifts: gp('local.configShifts', permissions.local.canConfigShifts),

      // Carga de ventas
      canEnterSales: gp('local.enterSales', permissions.local.canEnterSales),
    };
  }, [permissions, getPermission, currentBranchId]);

  return {
    ...permissions,
    loading: permissions.loading || loadingConfig,
    loadingConfig,
    brand: dynamicBrandPermissions,
    local: dynamicLocalPermissions,
  };
}

export default useDynamicPermissions;
