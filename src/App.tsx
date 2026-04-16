import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import { AccountSheetsProvider } from '@/contexts/AccountSheetsContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminRoute, LocalRoute, RequireQRAccess, RequireAuth } from '@/components/guards';
import { FloatingOrderChat } from '@/components/webapp/FloatingOrderChat';
import { SpinnerLoader, TopBarLoader } from '@/components/ui/loaders';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <SpinnerLoader size="md" text="Cargando..." />
    </div>
  );
}

function RouteChangeIndicator() {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setShow(true);
      const timer = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return show ? <TopBarLoader /> : null;
}

// Páginas públicas — eagerly loaded (landing / auth)
import Index from './pages/Index';
import Ingresar from './pages/Ingresar';
import AuthPopup from './pages/AuthPopup';
import Pedir from './pages/Pedir';
import NotFound from './pages/NotFound';

// Lazy-loaded pages
const OlvidePassword = lazy(() => import('./pages/OlvidePassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const RegistroStaff = lazy(() => import('./pages/RegistroStaff'));
const PedirPage = lazy(() => import('./pages/webapp/PedirPage'));
const TrackingPage = lazy(() => import('./pages/webapp/TrackingPage'));
const CadeteTrackingPage = lazy(() => import('./pages/webapp/CadeteTrackingPage'));
const Franquicias = lazy(() => import('./pages/Franquicias'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Contacto = lazy(() => import('./pages/Contacto'));
const FichajeEmpleado = lazy(() => import('./pages/FichajeEmpleado'));

// Mi Local
const BranchLayout = lazy(() => import('./pages/local/BranchLayout'));
const TeamPage = lazy(() => import('./pages/local/TeamPage'));
const ClockInsPage = lazy(() => import('./pages/local/ClockInsPage'));
const SchedulesPage = lazy(() => import('./pages/local/SchedulesPage'));
const RequestsPage = lazy(() => import('./pages/local/RequestsPage'));
const AdvancesPage = lazy(() => import('./pages/local/AdvancesPage'));
const WarningsPage = lazy(() => import('./pages/local/WarningsPage'));
const RegulationsPage = lazy(() => import('./pages/local/RegulationsPage'));
const FichajeQRDisplay = lazy(() => import('./pages/local/FichajeQRDisplay'));
const ShiftConfigPage = lazy(() => import('./pages/local/ShiftConfigPage'));
const CoachingPage = lazy(() => import('./pages/local/CoachingPage'));
const LiquidacionPage = lazy(() => import('./pages/local/LiquidacionPage'));
const MeetingsPage = lazy(() => import('./pages/local/MeetingsPage'));
const SalesHistoryPage = lazy(() => import('./pages/local/SalesHistoryPage'));
const ProveedoresLocalPage = lazy(() => import('./pages/local/ProveedoresLocalPage'));
const CuentaCorrienteProveedorPage = lazy(
  () => import('./pages/local/CuentaCorrienteProveedorPage'),
);
const InsumosLocalPage = lazy(() => import('./pages/local/InsumosLocalPage'));
const ComprasPage = lazy(() => import('./pages/local/ComprasPage'));
const ConsumosPage = lazy(() => import('./pages/local/ConsumosPage'));
const SociosPage = lazy(() => import('./pages/local/SociosPage'));
const PeriodosPage = lazy(() => import('./pages/local/PeriodosPage'));
const PLDashboardPage = lazy(() => import('./pages/local/PLDashboardPage'));
const RdoLoaderPage = lazy(() => import('./pages/local/RdoLoaderPage'));
const RdoFinancieroPage = lazy(() => import('./pages/local/RdoFinancieroPage'));
const GastosPage = lazy(() => import('./pages/local/GastosPage'));
const InversionesPage = lazy(() => import('./pages/local/InversionesPage'));
const VentasMensualesLocalPage = lazy(() => import('./pages/local/VentasMensualesLocalPage'));
const InspectionsLocalPage = lazy(() => import('./pages/local/InspectionsLocalPage'));
const AfipConfigPage = lazy(() => import('./pages/local/AfipConfigPage'));
const MercadoPagoConfigPage = lazy(() => import('./pages/local/MercadoPagoConfigPage'));
const WebappConfigPage = lazy(() => import('./pages/local/WebappConfigPage'));
const LocalDeliveryZonesPage = lazy(() => import('./pages/local/LocalDeliveryZonesPage'));

// POS
const POSPage = lazy(() => import('./pages/pos/POSPage'));
const KitchenPage = lazy(() => import('./pages/pos/KitchenPage'));
const DeliveryPage = lazy(() => import('./pages/pos/DeliveryPage'));
const StockPage = lazy(() => import('./pages/pos/StockPage'));
const RegisterPage = lazy(() => import('./pages/pos/RegisterPage'));
const CierreTurnoPage = lazy(() => import('./pages/local/CierreTurnoPage'));
const PrintersConfigPage = lazy(() => import('./pages/local/PrintersConfigPage'));
const KitchenStationsConfigPage = lazy(() => import('./pages/local/KitchenStationsConfigPage'));
const PrintConfigPage = lazy(() => import('./pages/local/PrintConfigPage'));

// Mi Marca
const BrandLayout = lazy(() => import('./pages/admin/BrandLayout'));
const BrandHome = lazy(() => import('./pages/admin/BrandHome'));
const BranchDetail = lazy(() => import('./pages/admin/BranchDetail'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const CentralTeam = lazy(() => import('./pages/admin/CentralTeam'));
const CommunicationsPage = lazy(() => import('./pages/admin/CommunicationsPage'));
const BrandRegulationsPage = lazy(() => import('./pages/admin/BrandRegulationsPage'));
const ClosureConfigPage = lazy(() => import('./pages/admin/ClosureConfigPage'));
const ContactMessagesPage = lazy(() => import('./pages/admin/ContactMessagesPage'));
const PermissionsConfigPage = lazy(() => import('./pages/admin/PermissionsConfigPage'));
const CoachingManagersPage = lazy(() => import('./pages/admin/CoachingManagersPage'));
const CoachingNetworkPage = lazy(() => import('./pages/admin/CoachingNetworkPage'));
const LaborCalendarPage = lazy(() => import('./pages/admin/LaborCalendarPage'));
const BrandMeetingsPage = lazy(() => import('./pages/admin/BrandMeetingsPage'));
const InspectionsPage = lazy(() => import('./pages/admin/InspectionsPage'));
const NewInspectionPage = lazy(() => import('./pages/admin/NewInspectionPage'));
const InspectionDetailPage = lazy(() => import('./pages/admin/InspectionDetailPage'));
const ProveedoresPage = lazy(() => import('./pages/admin/ProveedoresPage'));
const InsumosPage = lazy(() => import('./pages/admin/InsumosPage'));
const CanonPage = lazy(() => import('./pages/admin/CanonPage'));
const VentasMensualesMarcaPage = lazy(() => import('./pages/admin/VentasMensualesMarcaPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const ConceptosServicioPage = lazy(() => import('./pages/admin/ConceptosServicioPage'));
const MenuCartaPage = lazy(() => import('./pages/admin/MenuCartaPage'));
const CentroCostosPage = lazy(() => import('./pages/admin/CentroCostosPage'));
const PreparacionesPage = lazy(() => import('./pages/admin/PreparacionesPage'));
const PromocionesPage = lazy(() => import('./pages/admin/PromocionesPage'));
const CodigosDescuentoPage = lazy(() => import('./pages/admin/CodigosDescuentoPage'));
const CategoriasCartaPage = lazy(() => import('./pages/admin/CategoriasCartaPage'));
const ChannelPricingPage = lazy(() => import('./pages/admin/ChannelPricingPage'));
const CanalesVentaPage = lazy(() => import('./pages/admin/CanalesVentaPage'));
const DeliveryConfigPage = lazy(() => import('./pages/admin/DeliveryConfigPage'));
const BranchDeliveryDetailPage = lazy(() => import('./pages/admin/BranchDeliveryDetailPage'));

// Mi Local - Comunicaciones
const LocalCommunicationsPage = lazy(() => import('./pages/local/LocalCommunicationsPage'));

// Mi Cuenta
const CuentaLayout = lazy(() => import('./pages/cuenta/CuentaLayout'));
const CuentaHome = lazy(() => import('./pages/cuenta/CuentaHome'));
const MiHorarioPage = lazy(() => import('./pages/cuenta/MiHorarioPage'));
const MisFichajesPage = lazy(() => import('./pages/cuenta/MisFichajesPage'));
const MisCoachingsPage = lazy(() => import('./pages/cuenta/MisCoachingsPage'));
const MisReunionesPage = lazy(() => import('./pages/cuenta/MisReunionesPage'));
const MisSolicitudesPage = lazy(() => import('./pages/cuenta/MisSolicitudesPage'));
const MisAdelantosPage = lazy(() => import('./pages/cuenta/MisAdelantosPage'));
const MisComunicadosPage = lazy(() => import('./pages/cuenta/MisComunicadosPage'));
const MiReglamentoPage = lazy(() => import('./pages/cuenta/MiReglamentoPage'));
const MisApercibimientosPage = lazy(() => import('./pages/cuenta/MisApercibimientosPage'));
const BranchComparisonPage = lazy(() => import('./pages/cuenta/BranchComparisonPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ImpersonationProvider>
          <AuthModalProvider>
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <AccountSheetsProvider>
                  <RouteChangeIndicator />
                  <FloatingOrderChat />
                  <AuthModal />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Rutas Públicas con header transparente unificado */}
                      <Route path="/" element={<PublicLayout />}>
                        <Route index element={<Index />} />
                        <Route path="nosotros" element={<Nosotros />} />
                        <Route path="franquicias" element={<Franquicias />} />
                        <Route path="contacto" element={<Contacto />} />
                      </Route>
                      <Route path="/ingresar" element={<Ingresar />} />
                      <Route path="/auth-popup" element={<AuthPopup />} />
                      <Route path="/olvide-password" element={<OlvidePassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/pedir" element={<Pedir />} />
                      <Route path="/registro-staff" element={<RegistroStaff />} />
                      <Route path="/fichaje/:branchCode" element={<FichajeEmpleado />} />
                      <Route path="/pedir/:branchSlug" element={<PedirPage />} />
                      <Route path="/pedido/:trackingCode" element={<TrackingPage />} />
                      <Route path="/rastreo/:token" element={<CadeteTrackingPage />} />

                      {/* Mi Trabajo — staff panel using WorkShell (clients redirect to /pedir) */}
                      <Route
                        path="/cuenta"
                        element={
                          <RequireAuth>
                            <CuentaLayout />
                          </RequireAuth>
                        }
                      >
                        <Route index element={<CuentaHome />} />
                        <Route path="horario" element={<MiHorarioPage />} />
                        <Route path="fichajes" element={<MisFichajesPage />} />
                        <Route path="coachings" element={<MisCoachingsPage />} />
                        <Route path="reuniones" element={<MisReunionesPage />} />
                        <Route path="solicitudes" element={<MisSolicitudesPage />} />
                        <Route path="adelantos" element={<MisAdelantosPage />} />
                        <Route path="apercibimientos" element={<MisApercibimientosPage />} />
                        <Route path="comparativo" element={<BranchComparisonPage />} />
                        <Route path="comunicados" element={<MisComunicadosPage />} />
                        <Route path="reglamento" element={<MiReglamentoPage />} />
                      </Route>

                      {/* QR de Fichaje Estático - Solo encargados/franquiciados/superadmin */}
                      <Route
                        path="/fichaje-qr/:branchId"
                        element={
                          <RequireAuth>
                            <RequireQRAccess>
                              <FichajeQRDisplay />
                            </RequireQRAccess>
                          </RequireAuth>
                        }
                      />

                      {/* Mi Local - /milocal */}
                      <Route
                        path="/milocal"
                        element={
                          <LocalRoute>
                            <BranchLayout />
                          </LocalRoute>
                        }
                      >
                        <Route index element={<Navigate to="equipo" replace />} />
                      </Route>
                      <Route
                        path="/milocal/:branchId"
                        element={
                          <LocalRoute>
                            <BranchLayout />
                          </LocalRoute>
                        }
                      >
                        <Route index element={<Navigate to="equipo" replace />} />

                        {/* Equipo */}
                        <Route path="equipo" element={<TeamPage />} />
                        <Route path="equipo/fichajes" element={<ClockInsPage />} />
                        <Route path="equipo/horarios" element={<SchedulesPage />} />
                        <Route path="equipo/adelantos" element={<AdvancesPage />} />
                        <Route path="equipo/apercibimientos" element={<WarningsPage />} />
                        <Route path="equipo/reglamentos" element={<RegulationsPage />} />
                        <Route path="equipo/comunicados" element={<LocalCommunicationsPage />} />
                        <Route path="equipo/coaching" element={<CoachingPage />} />
                        <Route path="equipo/reuniones" element={<MeetingsPage />} />

                        {/* Tiempo */}
                        <Route path="tiempo/liquidacion" element={<LiquidacionPage />} />
                        <Route path="tiempo/solicitudes" element={<RequestsPage />} />

                        {/* Ventas y POS */}
                        <Route path="ventas/historial" element={<SalesHistoryPage />} />
                        <Route path="ventas/cierre-turno" element={<CierreTurnoPage />} />
                        <Route path="ventas/pos" element={<POSPage />} />
                        <Route path="ventas/cocina" element={<KitchenPage />} />
                        <Route path="ventas/entrega" element={<DeliveryPage />} />
                        <Route path="ventas/stock" element={<StockPage />} />
                        <Route path="ventas/caja" element={<RegisterPage />} />

                        {/* Finanzas */}
                        <Route path="finanzas/proveedores" element={<ProveedoresLocalPage />} />
                        <Route
                          path="finanzas/proveedores/:proveedorId"
                          element={<CuentaCorrienteProveedorPage />}
                        />
                        <Route path="finanzas/insumos" element={<InsumosLocalPage />} />
                        <Route path="finanzas/compras" element={<ComprasPage />} />
                        <Route path="finanzas/gastos" element={<GastosPage />} />
                        <Route
                          path="finanzas/ventas-mensuales"
                          element={<VentasMensualesLocalPage />}
                        />
                        <Route path="finanzas/consumos" element={<ConsumosPage />} />
                        <Route path="finanzas/socios" element={<SociosPage />} />
                        <Route path="finanzas/periodos" element={<PeriodosPage />} />
                        <Route path="finanzas/pl" element={<PLDashboardPage />} />
                        <Route
                          path="finanzas/resultado-financiero"
                          element={<RdoFinancieroPage />}
                        />
                        <Route path="finanzas/rdo-carga" element={<RdoLoaderPage />} />
                        <Route
                          path="finanzas/rdo-multivista"
                          element={<Navigate to="../ventas/historial" replace />}
                        />
                        <Route path="finanzas/inversiones" element={<InversionesPage />} />

                        {/* Supervisiones */}
                        <Route path="supervisiones" element={<InspectionsLocalPage />} />

                        {/* Configuración */}
                        <Route path="config/turnos" element={<ShiftConfigPage />} />
                        <Route path="config/impresoras" element={<PrintersConfigPage />} />
                        <Route path="config/estaciones" element={<KitchenStationsConfigPage />} />
                        <Route path="config/impresion" element={<PrintConfigPage />} />
                        <Route path="config/facturacion" element={<AfipConfigPage />} />
                        <Route path="config/mercadopago" element={<MercadoPagoConfigPage />} />
                        <Route path="config/webapp" element={<WebappConfigPage />} />
                        <Route path="config/delivery" element={<LocalDeliveryZonesPage />} />
                      </Route>

                      {/* Mi Marca - /mimarca */}
                      <Route
                        path="/mimarca"
                        element={
                          <AdminRoute>
                            <BrandLayout />
                          </AdminRoute>
                        }
                      >
                        <Route index element={<BrandHome />} />

                        {/* Locales */}
                        <Route path="locales/:slug" element={<BranchDetail />} />

                        {/* Usuarios */}
                        <Route path="usuarios" element={<UsersPage />} />
                        <Route path="equipo-central" element={<CentralTeam />} />

                        {/* Comunicados */}
                        <Route path="comunicados" element={<CommunicationsPage />} />

                        {/* Mensajes de Contacto */}
                        <Route path="mensajes" element={<ContactMessagesPage />} />

                        {/* Reuniones de la Red */}
                        <Route path="reuniones" element={<BrandMeetingsPage />} />

                        {/* Coaching */}
                        <Route path="coaching/encargados" element={<CoachingManagersPage />} />
                        <Route path="coaching/red" element={<CoachingNetworkPage />} />

                        {/* Supervisión */}
                        <Route path="supervisiones" element={<InspectionsPage />} />
                        <Route path="supervisiones/nueva" element={<NewInspectionPage />} />
                        <Route path="supervisiones/:id" element={<InspectionDetailPage />} />

                        {/* Finanzas */}
                        <Route path="finanzas/proveedores" element={<ProveedoresPage />} />
                        <Route path="finanzas/insumos" element={<InsumosPage />} />
                        <Route
                          path="finanzas/conceptos-servicio"
                          element={<ConceptosServicioPage />}
                        />
                        <Route path="finanzas/canon" element={<CanonPage />} />
                        <Route
                          path="finanzas/ventas-mensuales"
                          element={<VentasMensualesMarcaPage />}
                        />
                        <Route path="informes" element={<ReportsPage />} />
                        <Route path="auditoria" element={<AuditLogPage />} />

                        {/* Recetas */}
                        <Route path="recetas" element={<PreparacionesPage />} />

                        {/* Carta */}
                        <Route path="carta" element={<MenuCartaPage />} />
                        <Route path="categorias-carta" element={<CategoriasCartaPage />} />

                        {/* Promociones y Códigos */}
                        <Route path="promociones" element={<PromocionesPage />} />
                        <Route path="codigos-descuento" element={<CodigosDescuentoPage />} />

                        {/* Centro de Costos */}
                        <Route path="centro-costos" element={<CentroCostosPage />} />

                        {/* Precios por Canal */}
                        <Route path="precios-canal" element={<ChannelPricingPage />} />
                        <Route path="canales-venta" element={<CanalesVentaPage />} />

                        {/* Delivery */}
                        <Route path="delivery" element={<DeliveryConfigPage />} />
                        <Route path="delivery/:branchId" element={<BranchDeliveryDetailPage />} />

                        {/* Configuración */}
                        <Route path="reglamentos" element={<BrandRegulationsPage />} />
                        <Route path="configuracion/calendario" element={<LaborCalendarPage />} />
                        <Route path="configuracion/cierres" element={<ClosureConfigPage />} />
                        <Route path="configuracion/permisos" element={<PermissionsConfigPage />} />
                      </Route>

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AccountSheetsProvider>
              </ErrorBoundary>
            </BrowserRouter>
          </AuthModalProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
