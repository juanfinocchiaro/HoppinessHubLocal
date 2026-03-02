/**
 * LocalSidebar - Navegación de Mi Local organizada por flujo de trabajo
 *
 * Secciones: Dashboard → Operar → Vender → Comprar → Equipo → Resultados → Socios → Comunicados → Supervisiones → Config
 */
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarClock,
  DollarSign,
  FileText,
  MessageSquare,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  Receipt,
  Settings,
  AlertTriangle,
  UserCheck,
  Calendar,
  Wallet,
  Truck,
  Package,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Handshake,
  Calculator,
  FileInput,
  Building2,
  ChefHat,
  Printer,
  Flame,
  SlidersHorizontal,
  Globe,
  Store,
  MapPin,
} from 'lucide-react';
import { WorkSidebarNav, NavSectionGroup, NavItemButton, NavDashboardLink } from './WorkSidebar';
import { PrinterStatusDot } from '@/components/local/PrinterStatusDot';
import { useWebappPendingCount } from '@/hooks/useWebappPendingCount';

interface LocalSidebarProps {
  branchId: string;
  posEnabled?: boolean;
  permissions: {
    canViewDashboard: boolean;
    canViewTeam: boolean;
    canEditSchedules: boolean;
    canViewAllClockIns: boolean;
    canViewPayroll: boolean;
    canViewSalaryAdvances: boolean;
    canViewWarnings: boolean;
    canDoCoaching: boolean;
    canViewCoaching: boolean;
    canViewPurchaseHistory: boolean;
    canViewSuppliers: boolean;
    canUploadInvoice: boolean;
    canViewLocalPnL: boolean;
    canViewGastos: boolean;
    canViewConsumos: boolean;
    canViewPeriodos: boolean;
    canViewVentasMensualesLocal: boolean;
    canViewSocios: boolean;
    canViewClosures: boolean;
    canCloseShifts: boolean;
    canViewStock: boolean;
    canViewLocalCommunications: boolean;
    canConfigPrinters: boolean;
    isFranquiciado: boolean;
    isContadorLocal: boolean;
  };
}

export function LocalSidebar({ branchId, posEnabled = false, permissions }: LocalSidebarProps) {
  const location = useLocation();
  const basePath = `/milocal/${branchId}`;
  const { count: webappPendingCount } = useWebappPendingCount({ branchId, enabled: posEnabled });

  const {
    canViewDashboard,
    canViewTeam,
    canEditSchedules,
    canViewAllClockIns,
    canDoCoaching,
    canViewCoaching,
    canConfigPrinters,
    canViewWarnings,
    canViewPurchaseHistory,
    canViewSuppliers,
    canUploadInvoice,
    canViewLocalPnL,
    canViewSalaryAdvances,
    canViewPayroll,
    canViewGastos,
    canViewConsumos,
    canViewPeriodos,
    canViewVentasMensualesLocal,
    canViewSocios,
    canViewLocalCommunications,
    canViewClosures,
    canCloseShifts,
    canViewStock,
    isFranquiciado,
    isContadorLocal,
  } = permissions;

  const isActive = (paths: string[]) =>
    paths.some((p) => {
      const full = `${basePath}/${p}`;
      return location.pathname === full || location.pathname.startsWith(`${full}/`);
    });

  /* ── Section activity detection ──────────────────────── */

  const isOperarActive = isActive([
    'ventas/pos',
    'ventas/cocina',
    'ventas/entrega',
    'ventas/caja',
    'ventas/historial',
    'ventas/cierre-turno',
    'ventas/stock',
    'config/webapp',
  ]);

  const isComprarActive = isActive([
    'finanzas/proveedores',
    'finanzas/compras',
    'finanzas/consumos',
    'finanzas/gastos',
  ]);

  const isEquipoActive = isActive([
    'equipo',
    'equipo/fichajes',
    'equipo/coaching',
    'equipo/reuniones',
    'equipo/horarios',
    'tiempo/solicitudes',
    'tiempo/liquidacion',
    'equipo/adelantos',
    'equipo/apercibimientos',
    'equipo/reglamentos',
  ]);

  const isResultadosActive = isActive([
    'finanzas/pl',
    'finanzas/resultado-financiero',
    'finanzas/ventas-mensuales',
    'finanzas/rdo-carga',
    'finanzas/periodos',
    'finanzas/inversiones',
  ]);

  const isSociosActive = isActive(['finanzas/socios']);
  const isConfigActive = location.pathname.startsWith(`${basePath}/config`);

  /* ── Visibility flags ──────────────────────────────────── */

  const canSeeOperar = posEnabled || canViewClosures || canCloseShifts || canViewStock;
  const canSeeComprar =
    canViewPurchaseHistory ||
    canViewSuppliers ||
    canUploadInvoice ||
    canViewConsumos ||
    canViewGastos;
  const canSeeEquipo =
    canViewTeam || canDoCoaching || canEditSchedules || canViewPayroll || canViewSalaryAdvances;
  const canSeeResultados =
    canViewLocalPnL ||
    canViewGastos ||
    canViewPeriodos ||
    canViewVentasMensualesLocal ||
    isContadorLocal ||
    isFranquiciado;

  return (
    <WorkSidebarNav>
      {/* ─── Dashboard ─────────────────────────────────── */}
      {canViewDashboard && (
        <NavDashboardLink to={basePath} icon={LayoutDashboard} label="Dashboard" />
      )}

      {/* ─── 1. Operar (día a día) ─────────────────────── */}
      {canSeeOperar && (
        <NavSectionGroup id="operar" label="Operar" icon={Store} forceOpen={isOperarActive}>
          {posEnabled && (
            <NavItemButton
              to={`${basePath}/ventas/pos`}
              icon={ShoppingCart}
              label="Punto de Venta"
              badge={webappPendingCount || undefined}
              badgeVariant="destructive"
            />
          )}
          {posEnabled && (
            <NavItemButton to={`${basePath}/ventas/cocina`} icon={ChefHat} label="Cocina" />
          )}
          {posEnabled && (
            <NavItemButton to={`${basePath}/ventas/entrega`} icon={Truck} label="Entrega" />
          )}
          {posEnabled && (
            <NavItemButton to={`${basePath}/ventas/caja`} icon={Wallet} label="Caja" />
          )}
          {canViewStock && (
            <NavItemButton to={`${basePath}/ventas/stock`} icon={Package} label="Stock" />
          )}
          {(canViewClosures || canCloseShifts) && (
            <NavItemButton
              to={`${basePath}/ventas/historial`}
              icon={TrendingUp}
              label="Historial de Ventas"
            />
          )}
          {posEnabled && (
            <NavItemButton to={`${basePath}/config/webapp`} icon={Globe} label="Tienda Online" />
          )}
        </NavSectionGroup>
      )}

      {/* ─── 3. Comprar (abastecimiento) ──────────────── */}
      {canSeeComprar && (
        <NavSectionGroup id="comprar" label="Comprar" icon={Receipt} forceOpen={isComprarActive}>
          {canViewSuppliers && (
            <NavItemButton
              to={`${basePath}/finanzas/proveedores`}
              icon={Truck}
              label="Proveedores"
            />
          )}
          {canViewPurchaseHistory && (
            <NavItemButton
              to={`${basePath}/finanzas/compras`}
              icon={Receipt}
              label="Facturas de Compra"
            />
          )}
          {canViewConsumos && (
            <NavItemButton to={`${basePath}/finanzas/consumos`} icon={Package} label="Consumos" />
          )}
          {canViewGastos && (
            <NavItemButton to={`${basePath}/finanzas/gastos`} icon={Receipt} label="Gastos" />
          )}
        </NavSectionGroup>
      )}

      {/* ─── 4. Equipo (gestión de personas) ──────────── */}
      {canSeeEquipo && (
        <NavSectionGroup id="equipo" label="Equipo" icon={UserCheck} forceOpen={isEquipoActive}>
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo`} icon={Users} label="Equipo" exact />
          )}
          {canViewAllClockIns && (
            <NavItemButton to={`${basePath}/equipo/fichajes`} icon={Clock} label="Fichajes" />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/horarios`} icon={CalendarClock} label="Horarios" />
          )}
          {canEditSchedules && (
            <NavItemButton
              to={`${basePath}/tiempo/solicitudes`}
              icon={ClipboardList}
              label="Solicitudes"
            />
          )}
          {canViewPayroll && (
            <NavItemButton
              to={`${basePath}/tiempo/liquidacion`}
              icon={Calculator}
              label="Liquidación"
            />
          )}
          {canViewCoaching && (
            <NavItemButton
              to={`${basePath}/equipo/coaching`}
              icon={ClipboardList}
              label="Coaching"
            />
          )}
          {canViewTeam && (
            <NavItemButton to={`${basePath}/equipo/reuniones`} icon={Calendar} label="Reuniones" />
          )}
          {canViewSalaryAdvances && (
            <NavItemButton
              to={`${basePath}/equipo/adelantos`}
              icon={DollarSign}
              label="Adelantos"
            />
          )}
          {canViewWarnings && (
            <NavItemButton
              to={`${basePath}/equipo/apercibimientos`}
              icon={AlertTriangle}
              label="Apercibimientos"
            />
          )}
          {canEditSchedules && (
            <NavItemButton to={`${basePath}/equipo/reglamentos`} icon={FileText} label="Firmas" />
          )}
        </NavSectionGroup>
      )}

      {/* ─── 5. Resultados (visión financiera) ────────── */}
      {canSeeResultados && (
        <NavSectionGroup
          id="resultados"
          label="Resultados"
          icon={BarChart3}
          forceOpen={isResultadosActive}
        >
          {!posEnabled && canViewVentasMensualesLocal && (
            <NavItemButton
              to={`${basePath}/finanzas/ventas-mensuales`}
              icon={TrendingUp}
              label="Ventas Mensuales"
            />
          )}
          {!posEnabled && canViewLocalPnL && (
            <NavItemButton
              to={`${basePath}/finanzas/rdo-carga`}
              icon={FileInput}
              label="Cargador RDO"
            />
          )}
          {canViewLocalPnL && (
            <NavItemButton
              to={`${basePath}/finanzas/pl`}
              icon={BarChart3}
              label="Resultado Económico"
            />
          )}
          {canViewLocalPnL && (
            <NavItemButton
              to={`${basePath}/finanzas/resultado-financiero`}
              icon={Wallet}
              label="Resultado Financiero"
            />
          )}
          {canViewPeriodos && (
            <NavItemButton
              to={`${basePath}/finanzas/periodos`}
              icon={CalendarDays}
              label="Períodos"
            />
          )}
          {(isFranquiciado || isContadorLocal) && (
            <NavItemButton
              to={`${basePath}/finanzas/inversiones`}
              icon={Building2}
              label="Inversiones (CAPEX)"
            />
          )}
        </NavSectionGroup>
      )}

      {/* ─── Socios ──────────────────────────────────── */}
      {canViewSocios && <hr className="my-2 border-border" aria-hidden />}
      {canViewSocios && (
        <NavSectionGroup
          id="socios"
          label="Mi Cuenta Socio"
          icon={Handshake}
          forceOpen={isSociosActive}
        >
          <NavItemButton
            to={`${basePath}/finanzas/socios`}
            icon={Handshake}
            label="Socios y Movimientos"
          />
        </NavSectionGroup>
      )}

      {/* ─── Comunicados & Supervisiones ──────────────── */}
      {(canViewLocalCommunications || isFranquiciado || canViewTeam) && (
        <hr className="my-2 border-border" aria-hidden />
      )}
      {canViewLocalCommunications && (
        <NavDashboardLink
          to={`${basePath}/equipo/comunicados`}
          icon={MessageSquare}
          label="Comunicados"
        />
      )}
      {(isFranquiciado || canViewTeam) && (
        <NavDashboardLink
          to={`${basePath}/supervisiones`}
          icon={ClipboardCheck}
          label="Supervisiones"
        />
      )}

      {/* ─── 6. Configuración ────────────────────────── */}
      {canConfigPrinters && (
        <NavSectionGroup
          id="config"
          label="Configuración"
          icon={Settings}
          forceOpen={isConfigActive}
        >
          <NavItemButton to={`${basePath}/config/turnos`} icon={Clock} label="Turnos" />
          <div className="relative">
            <NavItemButton to={`${basePath}/config/impresoras`} icon={Printer} label="Impresoras" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <PrinterStatusDot />
            </div>
          </div>
          <NavItemButton
            to={`${basePath}/config/estaciones`}
            icon={Flame}
            label="Estaciones Cocina"
          />
          <NavItemButton
            to={`${basePath}/config/impresion`}
            icon={SlidersHorizontal}
            label="Config Impresión"
          />
          <NavItemButton to={`${basePath}/config/facturacion`} icon={Receipt} label="Facturación" />
          {posEnabled && (
            <NavItemButton
              to={`${basePath}/config/mercadopago`}
              icon={DollarSign}
              label="MercadoPago"
            />
          )}
          <NavItemButton
            to={`${basePath}/config/delivery`}
            icon={MapPin}
            label="Zonas de Delivery"
          />
        </NavSectionGroup>
      )}
    </WorkSidebarNav>
  );
}

export default LocalSidebar;
