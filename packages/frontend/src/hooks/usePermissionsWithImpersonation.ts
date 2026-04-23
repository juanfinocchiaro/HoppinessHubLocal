/**
 * usePermissionsWithImpersonation - Wrapper de useDynamicPermissions con soporte para impersonación
 *
 * Cuando hay impersonación activa, calcula permisos para el usuario impersonado
 * aplicando los mismos overrides de role_permissions que useDynamicPermissions.
 * Las operaciones de DB siguen usando auth.uid() real.
 */
import { useMemo } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useDynamicPermissions, type DynamicPermissions } from './useDynamicPermissions';
import { usePermissionOverrides } from './usePermissionOverrides';
import type { LocalRole } from './usePermissions';

export function usePermissionsWithImpersonation(currentBranchId?: string): DynamicPermissions & {
  isViewingAs: boolean;
  realUserPermissions: DynamicPermissions | null;
} {
  const realPermissions = useDynamicPermissions(currentBranchId);
  const { isImpersonating, targetUser } = useImpersonation();
  const { getPermission, isLoading: loadingConfig } = usePermissionOverrides();

  const impersonatedPermissions = useMemo((): DynamicPermissions | null => {
    if (!isImpersonating || !targetUser) return null;

    const brandRole = targetUser.brandRole;
    const branchRoles = targetUser.branchRoles;
    const accessibleBranches = targetUser.accessibleBranches;

    const getLocalRoleForBranch = (branchId: string): LocalRole => {
      const role = branchRoles.find((r) => r.branch_id === branchId);
      return role?.local_role || null;
    };

    const localRole = currentBranchId ? getLocalRoleForBranch(currentBranchId) : null;

    const isSuperadmin = brandRole === 'superadmin';
    const isCoordinador = brandRole === 'coordinador';
    const isInformes = brandRole === 'informes';
    const isContadorMarca = brandRole === 'contador_marca';
    const isCommunityManager = brandRole === 'community_manager';
    const isFranquiciado = localRole === 'franquiciado';
    const isEncargado = localRole === 'encargado';
    const isContadorLocal = localRole === 'contador_local';
    const isCajero = localRole === 'cajero';
    const isEmpleado = localRole === 'empleado';

    const canAccessBrandPanel = !!brandRole;
    const canAccessLocalPanel =
      isSuperadmin ||
      branchRoles.some((r) =>
        ['franquiciado', 'encargado', 'contador_local', 'cajero'].includes(r.local_role),
      );

    const hasAccessToBranch = (branchId: string): boolean => {
      if (isSuperadmin) return true;
      return branchRoles.some((r) => r.branch_id === branchId);
    };

    const canApproveWithPin = isFranquiciado || isEncargado;
    const hasCurrentBranchAccess = currentBranchId ? hasAccessToBranch(currentBranchId) : false;

    // --- Brand permissions with dynamic overrides (same keys as useDynamicPermissions) ---
    const brandPerms = (() => {
      if (isSuperadmin) {
        return {
          canViewDashboard: true,
          canViewPnL: true,
          canViewComparativa: true,
          canViewHoursSummary: true,
          canViewLocales: true,
          canCreateLocales: true,
          canViewProducts: true,
          canEditProducts: true,
          canManageModifiers: true,
          canManageIngredients: true,
          canEditPrices: true,
          canManagePromotions: true,
          canViewInsumos: true,
          canEditInsumos: true,
          canViewConceptosServicio: true,
          canEditConceptosServicio: true,
          canViewProveedoresMarca: true,
          canEditProveedoresMarca: true,
          canViewVentasMensuales: true,
          canEditVentasMensuales: true,
          canViewCanon: true,
          canEditCanon: true,
          canManageSuppliers: true,
          canManageCentralTeam: true,
          canViewCentralTeam: true,
          canSearchUsers: true,
          canAssignRoles: true,
          canManageMessages: true,
          canViewContactMessages: true,
          canManageContactMessages: true,
          canCoachManagers: true,
          canViewCoaching: true,
          canViewMeetings: true,
          canCreateMeetings: true,
          canManageDeliveryPricing: true,
          canManageDeliveryZones: true,
          canEditBrandConfig: true,
          canManageChannels: true,
          canManageIntegrations: true,
        };
      }

      // Hardcoded fallbacks
      const fb = {
        canViewDashboard: !!brandRole,
        canViewPnL: isInformes || isContadorMarca,
        canViewComparativa: isInformes || isContadorMarca,
        canViewHoursSummary: isInformes || isContadorMarca,
        canViewLocales: !!brandRole,
        canCreateLocales: false,
        canViewProducts: isCoordinador,
        canEditProducts: isCoordinador,
        canManageModifiers: isCoordinador,
        canManageIngredients: isCoordinador,
        canEditPrices: isCoordinador,
        canManagePromotions: isCoordinador,
        canViewInsumos: isCoordinador || isContadorMarca,
        canEditInsumos: isCoordinador,
        canViewConceptosServicio: isCoordinador || isContadorMarca,
        canEditConceptosServicio: isCoordinador,
        canViewProveedoresMarca: isCoordinador || isContadorMarca,
        canEditProveedoresMarca: isCoordinador,
        canViewVentasMensuales: isInformes || isContadorMarca,
        canEditVentasMensuales: isContadorMarca,
        canViewCanon: isContadorMarca,
        canEditCanon: isContadorMarca,
        canManageSuppliers: false,
        canManageCentralTeam: false,
        canViewCentralTeam: isCoordinador,
        canSearchUsers: false,
        canAssignRoles: false,
        canManageMessages: isCoordinador,
        canViewContactMessages: isCoordinador,
        canManageContactMessages: isCoordinador,
        canCoachManagers: isCoordinador,
        canViewCoaching: isCoordinador,
        canViewMeetings: isCoordinador,
        canCreateMeetings: isCoordinador,
        canManageDeliveryPricing: false,
        canManageDeliveryZones: isCoordinador,
        canEditBrandConfig: false,
        canManageChannels: isCoordinador,
        canManageIntegrations: false,
      };

      return {
        canViewDashboard: getPermission('brand.viewDashboard', brandRole, fb.canViewDashboard),
        canViewPnL: getPermission('brand.viewPnL', brandRole, fb.canViewPnL),
        canViewComparativa: getPermission(
          'brand.viewComparativa',
          brandRole,
          fb.canViewComparativa,
        ),
        canViewHoursSummary: getPermission(
          'brand.viewHoursSummary',
          brandRole,
          fb.canViewHoursSummary,
        ),
        canViewLocales: getPermission('brand.viewBranches', brandRole, fb.canViewLocales),
        canCreateLocales: getPermission('brand.createBranches', brandRole, fb.canCreateLocales),
        canViewProducts: getPermission('brand.viewProducts', brandRole, fb.canViewProducts),
        canEditProducts: getPermission('brand.editProducts', brandRole, fb.canEditProducts),
        canManageModifiers: fb.canManageModifiers,
        canManageIngredients: fb.canManageIngredients,
        canEditPrices: fb.canEditPrices,
        canManagePromotions: fb.canManagePromotions,
        canViewInsumos: getPermission('brand.viewInsumos', brandRole, fb.canViewInsumos),
        canEditInsumos: getPermission('brand.editInsumos', brandRole, fb.canEditInsumos),
        canViewConceptosServicio: getPermission(
          'brand.viewConceptosServicio',
          brandRole,
          fb.canViewConceptosServicio,
        ),
        canEditConceptosServicio: getPermission(
          'brand.editConceptosServicio',
          brandRole,
          fb.canEditConceptosServicio,
        ),
        canViewProveedoresMarca: getPermission(
          'brand.viewProveedoresMarca',
          brandRole,
          fb.canViewProveedoresMarca,
        ),
        canEditProveedoresMarca: getPermission(
          'brand.editProveedoresMarca',
          brandRole,
          fb.canEditProveedoresMarca,
        ),
        canViewVentasMensuales: getPermission(
          'brand.viewVentasMensuales',
          brandRole,
          fb.canViewVentasMensuales,
        ),
        canEditVentasMensuales: getPermission(
          'brand.editVentasMensuales',
          brandRole,
          fb.canEditVentasMensuales,
        ),
        canViewCanon: getPermission('brand.viewCanon', brandRole, fb.canViewCanon),
        canEditCanon: getPermission('brand.editCanon', brandRole, fb.canEditCanon),
        canManageSuppliers: fb.canManageSuppliers,
        canManageCentralTeam: getPermission(
          'brand.editCentralTeam',
          brandRole,
          fb.canManageCentralTeam,
        ),
        canViewCentralTeam: getPermission(
          'brand.viewCentralTeam',
          brandRole,
          fb.canViewCentralTeam,
        ),
        canSearchUsers: getPermission('brand.viewUsers', brandRole, fb.canSearchUsers),
        canAssignRoles: getPermission('brand.assignRoles', brandRole, fb.canAssignRoles),
        canManageMessages: getPermission(
          'brand.createCommunications',
          brandRole,
          fb.canManageMessages,
        ),
        canViewContactMessages: getPermission(
          'brand.viewContactMessages',
          brandRole,
          fb.canViewContactMessages,
        ),
        canManageContactMessages: getPermission(
          'brand.manageContactMessages',
          brandRole,
          fb.canManageContactMessages,
        ),
        canCoachManagers: getPermission('brand.coachManagers', brandRole, false),
        canViewCoaching: getPermission('brand.viewCoaching', brandRole, false),
        canViewMeetings: getPermission('brand.viewMeetings', brandRole, false),
        canCreateMeetings: getPermission('brand.createMeetings', brandRole, false),
        canManageDeliveryPricing: fb.canManageDeliveryPricing,
        canManageDeliveryZones: fb.canManageDeliveryZones,
        canEditBrandConfig: getPermission('brand.editConfig', brandRole, fb.canEditBrandConfig),
        canManageChannels: fb.canManageChannels,
        canManageIntegrations: fb.canManageIntegrations,
      };
    })();

    // --- Local permissions with dynamic overrides ---
    const localPerms = (() => {
      if (isSuperadmin && hasCurrentBranchAccess) {
        return {
          canViewDashboard: true,
          canViewStock: true,
          canOrderFromSupplier: true,
          canDoInventoryCount: true,
          canUploadInvoice: true,
          canViewSuppliers: true,
          canViewSupplierAccounts: true,
          canPaySupplier: true,
          canViewPurchaseHistory: true,
          canClockInOut: true,
          canViewAllClockIns: true,
          canViewTeam: true,
          canEditSchedules: true,
          canViewMonthlyHours: true,
          canViewPayroll: true,
          canInviteEmployees: true,
          canDeactivateEmployees: true,
          canViewSalaryAdvances: true,
          canViewWarnings: true,
          canCreateSalaryAdvance: true,
          canCancelSalaryAdvance: true,
          canCreateWarning: true,
          canUploadSignature: true,
          canDoCoaching: true,
          canViewCoaching: true,
          canSendLocalCommunication: true,
          canViewLocalCommunications: true,
          canViewMeetings: true,
          canCreateMeetings: true,
          canCloseMeetings: true,
          canViewClosures: true,
          canCloseShifts: true,
          canAccessPOS: true,
          canViewKitchen: true,
          canAssignDelivery: true,
          canOperateDelivery: true,
          canOpenRegister: true,
          canCloseRegister: true,
          canViewSalesReports: true,
          canViewLocalPnL: true,
          canViewCMV: true,
          canViewStockMovements: true,
          canViewGastos: true,
          canCreateGastos: true,
          canViewConsumos: true,
          canCreateConsumos: true,
          canViewPeriodos: true,
          canEditPeriodos: true,
          canViewVentasMensualesLocal: true,
          canEditVentasMensualesLocal: true,
          canViewSocios: true,
          canEditSocios: true,
          canEditLocalConfig: true,
          canConfigPrinters: true,
          canConfigShifts: true,
          canEnterSales: true,
        };
      }

      if (!hasCurrentBranchAccess) {
        const off = false;
        return {
          canViewDashboard: off,
          canViewStock: off,
          canOrderFromSupplier: off,
          canDoInventoryCount: off,
          canUploadInvoice: off,
          canViewSuppliers: off,
          canViewSupplierAccounts: off,
          canPaySupplier: off,
          canViewPurchaseHistory: off,
          canClockInOut: off,
          canViewAllClockIns: off,
          canViewTeam: off,
          canEditSchedules: off,
          canViewMonthlyHours: off,
          canViewPayroll: off,
          canInviteEmployees: off,
          canDeactivateEmployees: off,
          canViewSalaryAdvances: off,
          canViewWarnings: off,
          canCreateSalaryAdvance: off,
          canCancelSalaryAdvance: off,
          canCreateWarning: off,
          canUploadSignature: off,
          canDoCoaching: off,
          canViewCoaching: off,
          canSendLocalCommunication: off,
          canViewLocalCommunications: off,
          canViewMeetings: off,
          canCreateMeetings: off,
          canCloseMeetings: off,
          canViewClosures: off,
          canCloseShifts: off,
          canAccessPOS: off,
          canViewKitchen: off,
          canAssignDelivery: off,
          canOperateDelivery: off,
          canOpenRegister: off,
          canCloseRegister: off,
          canViewSalesReports: off,
          canViewLocalPnL: off,
          canViewCMV: off,
          canViewStockMovements: off,
          canViewGastos: off,
          canCreateGastos: off,
          canViewConsumos: off,
          canCreateConsumos: off,
          canViewPeriodos: off,
          canEditPeriodos: off,
          canViewVentasMensualesLocal: off,
          canEditVentasMensualesLocal: off,
          canViewSocios: off,
          canEditSocios: off,
          canEditLocalConfig: off,
          canConfigPrinters: off,
          canConfigShifts: off,
          canEnterSales: off,
        };
      }

      // Hardcoded fallbacks
      const fb = {
        canViewDashboard: isEncargado || isFranquiciado || isCajero || isContadorLocal,
        canViewStock: isEncargado || isFranquiciado,
        canOrderFromSupplier: isEncargado,
        canDoInventoryCount: isEncargado,
        canUploadInvoice: isContadorLocal || isEncargado,
        canViewSuppliers: isContadorLocal || isEncargado || isFranquiciado,
        canViewSupplierAccounts: isContadorLocal || isEncargado || isFranquiciado,
        canPaySupplier: isContadorLocal,
        canViewPurchaseHistory: isContadorLocal || isEncargado || isFranquiciado,
        canClockInOut: !!localRole,
        canViewAllClockIns: isEncargado || isFranquiciado || isContadorLocal,
        canViewTeam: isEncargado || isFranquiciado,
        canEditSchedules: isEncargado,
        canViewMonthlyHours: isEncargado || isFranquiciado || isContadorLocal,
        canViewPayroll: isEncargado || isFranquiciado || isContadorLocal,
        canInviteEmployees: isEncargado,
        canDeactivateEmployees: isEncargado,
        canViewSalaryAdvances: isEncargado || isFranquiciado || isContadorLocal,
        canViewWarnings: isEncargado || isFranquiciado || isContadorLocal,
        canCreateSalaryAdvance: isEncargado,
        canCancelSalaryAdvance: isEncargado,
        canCreateWarning: isEncargado,
        canUploadSignature: isEncargado,
        canDoCoaching: isEncargado,
        canViewCoaching: isEncargado || isFranquiciado,
        canSendLocalCommunication: isEncargado,
        canViewLocalCommunications: isEncargado || isFranquiciado || isContadorLocal,
        canViewMeetings: isEncargado || isFranquiciado || isCajero || isEmpleado,
        canCreateMeetings: isEncargado || isFranquiciado,
        canCloseMeetings: isEncargado || isFranquiciado,
        canViewClosures: isEncargado || isFranquiciado || isCajero,
        canCloseShifts: isEncargado || isCajero,
        canAccessPOS: isEncargado || isCajero,
        canViewKitchen: isEncargado || isCajero,
        canAssignDelivery: isEncargado || isCajero,
        canOperateDelivery: isEncargado || isFranquiciado || isCajero,
        canOpenRegister: isEncargado || isCajero,
        canCloseRegister: isEncargado || isCajero,
        canViewSalesReports: isEncargado || isFranquiciado,
        canViewLocalPnL: isContadorLocal || isFranquiciado,
        canViewCMV: isFranquiciado,
        canViewStockMovements: isEncargado || isFranquiciado,
        canViewGastos: isEncargado || isFranquiciado || isContadorLocal,
        canCreateGastos: isEncargado || isContadorLocal,
        canViewConsumos: isEncargado || isFranquiciado || isContadorLocal,
        canCreateConsumos: isEncargado || isContadorLocal,
        canViewPeriodos: isFranquiciado || isContadorLocal,
        canEditPeriodos: isFranquiciado || isContadorLocal,
        canViewVentasMensualesLocal: isFranquiciado || isContadorLocal,
        canEditVentasMensualesLocal: isFranquiciado || isContadorLocal,
        canViewSocios: isFranquiciado,
        canEditSocios: isFranquiciado,
        canEditLocalConfig: isFranquiciado,
        canConfigPrinters: isEncargado || isFranquiciado,
        canConfigShifts: isFranquiciado,
        canEnterSales: isEncargado || isCajero,
      };

      return {
        canViewDashboard: getPermission('local.viewDashboard', localRole, fb.canViewDashboard),
        canViewStock: fb.canViewStock,
        canOrderFromSupplier: fb.canOrderFromSupplier,
        canDoInventoryCount: fb.canDoInventoryCount,
        canUploadInvoice: getPermission('local.createCompras', localRole, fb.canUploadInvoice),
        canViewSuppliers: getPermission(
          'local.viewProveedoresLocal',
          localRole,
          fb.canViewSuppliers,
        ),
        canViewSupplierAccounts: getPermission(
          'local.viewCuentaCorriente',
          localRole,
          fb.canViewSupplierAccounts,
        ),
        canPaySupplier: getPermission('local.pagarProveedor', localRole, fb.canPaySupplier),
        canViewPurchaseHistory: getPermission(
          'local.viewCompras',
          localRole,
          fb.canViewPurchaseHistory,
        ),
        canClockInOut: fb.canClockInOut,
        canViewAllClockIns: getPermission('local.viewClockIns', localRole, fb.canViewAllClockIns),
        canViewTeam: getPermission('local.viewTeam', localRole, fb.canViewTeam),
        canEditSchedules: getPermission('local.editSchedules', localRole, fb.canEditSchedules),
        canViewMonthlyHours: fb.canViewMonthlyHours,
        canViewPayroll: getPermission('local.viewPayroll', localRole, fb.canViewPayroll),
        canInviteEmployees: getPermission(
          'local.inviteEmployees',
          localRole,
          fb.canInviteEmployees,
        ),
        canDeactivateEmployees: fb.canDeactivateEmployees,
        canViewSalaryAdvances: getPermission(
          'local.viewAdvances',
          localRole,
          fb.canViewSalaryAdvances,
        ),
        canViewWarnings: getPermission('local.viewWarnings', localRole, fb.canViewWarnings),
        canCreateSalaryAdvance: getPermission(
          'local.createAdvances',
          localRole,
          fb.canCreateSalaryAdvance,
        ),
        canCancelSalaryAdvance: fb.canCancelSalaryAdvance,
        canCreateWarning: getPermission('local.createWarnings', localRole, fb.canCreateWarning),
        canUploadSignature: getPermission(
          'local.uploadSignatures',
          localRole,
          fb.canUploadSignature,
        ),
        canDoCoaching: getPermission('local.doCoaching', localRole, fb.canDoCoaching),
        canViewCoaching: getPermission('local.viewCoaching', localRole, fb.canViewCoaching),
        canSendLocalCommunication: getPermission(
          'local.sendLocalCommunications',
          localRole,
          fb.canSendLocalCommunication,
        ),
        canViewLocalCommunications: getPermission(
          'local.viewLocalCommunications',
          localRole,
          fb.canViewLocalCommunications,
        ),
        canViewMeetings: getPermission('local.viewMeetings', localRole, fb.canViewMeetings),
        canCreateMeetings: getPermission('local.createMeetings', localRole, fb.canCreateMeetings),
        canCloseMeetings: getPermission('local.closeMeetings', localRole, fb.canCloseMeetings),
        canViewClosures: getPermission('local.viewClosures', localRole, fb.canViewClosures),
        canCloseShifts: getPermission('local.closeShifts', localRole, fb.canCloseShifts),
        canAccessPOS: fb.canAccessPOS,
        canViewKitchen: fb.canViewKitchen,
        canAssignDelivery: fb.canAssignDelivery,
        canOperateDelivery: fb.canOperateDelivery,
        canOpenRegister: fb.canOpenRegister,
        canCloseRegister: fb.canCloseRegister,
        canViewSalesReports: fb.canViewSalesReports,
        canViewLocalPnL: getPermission('local.viewPL', localRole, fb.canViewLocalPnL),
        canViewCMV: fb.canViewCMV,
        canViewStockMovements: fb.canViewStockMovements,
        canViewGastos: getPermission('local.viewGastos', localRole, fb.canViewGastos),
        canCreateGastos: getPermission('local.createGastos', localRole, fb.canCreateGastos),
        canViewConsumos: getPermission('local.viewConsumos', localRole, fb.canViewConsumos),
        canCreateConsumos: getPermission('local.createConsumos', localRole, fb.canCreateConsumos),
        canViewPeriodos: getPermission('local.viewPeriodos', localRole, fb.canViewPeriodos),
        canEditPeriodos: getPermission('local.editPeriodos', localRole, fb.canEditPeriodos),
        canViewVentasMensualesLocal: getPermission(
          'local.viewVentasMensualesLocal',
          localRole,
          fb.canViewVentasMensualesLocal,
        ),
        canEditVentasMensualesLocal: getPermission(
          'local.editVentasMensualesLocal',
          localRole,
          fb.canEditVentasMensualesLocal,
        ),
        canViewSocios: getPermission('local.viewSocios', localRole, fb.canViewSocios),
        canEditSocios: getPermission('local.editSocios', localRole, fb.canEditSocios),
        canEditLocalConfig: getPermission('local.editConfig', localRole, fb.canEditLocalConfig),
        canConfigPrinters: fb.canConfigPrinters,
        canConfigShifts: fb.canConfigShifts,
        canEnterSales: getPermission('local.enterSales', localRole, fb.canEnterSales),
      };
    })();

    return {
      loading: false,
      loadingConfig,
      error: null,
      brandRole,
      localRole,
      branchRoles,
      accessibleBranches,
      isSuperadmin,
      isCoordinador,
      isInformes,
      isContadorMarca,
      isFranquiciado,
      isEncargado,
      isContadorLocal,
      isCajero,
      isEmpleado,
      canAccessBrandPanel,
      canAccessLocalPanel,
      isCommunityManager,
      hasAccessToBranch,
      getLocalRoleForBranch,
      canApproveWithPin,
      brand: brandPerms,
      local: localPerms,
      refetch: () => {},
    };
  }, [isImpersonating, targetUser, currentBranchId, getPermission, loadingConfig]);

  if (isImpersonating && impersonatedPermissions) {
    return {
      ...impersonatedPermissions,
      isViewingAs: true,
      realUserPermissions: realPermissions,
    };
  }

  return {
    ...realPermissions,
    isViewingAs: false,
    realUserPermissions: null,
  };
}

export default usePermissionsWithImpersonation;
