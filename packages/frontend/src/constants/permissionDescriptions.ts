/**
 * Mapa de descripciones para cada permiso del sistema.
 * Se usa en PermissionsConfigPage para el tooltip informativo.
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  // ===== BRAND =====
  // Dashboard
  'brand.viewDashboard': 'Acceder al dashboard principal de Mi Marca con métricas consolidadas de todas las sucursales.',
  'brand.viewSalesTable': 'Ver la tabla de ventas diarias con desglose por sucursal y turno.',
  'brand.viewPnL': 'Ver el estado de resultados (P&L) consolidado de la marca.',
  'brand.viewComparativa': 'Ver comparativas de rendimiento entre sucursales.',
  'brand.viewHoursSummary': 'Ver el resumen de horas trabajadas por sucursal y empleado.',

  // Locales
  'brand.viewBranches': 'Ver el listado de sucursales y acceder a sus detalles.',
  'brand.createBranches': 'Crear nuevas sucursales en el sistema.',
  'brand.editBranches': 'Editar información de sucursales existentes (dirección, horarios, etc.).',

  // Catálogos Marca
  'brand.viewProducts': 'Ver la carta de productos y sus configuraciones.',
  'brand.editProducts': 'Crear, editar y eliminar productos de la carta.',
  'brand.manageModifiers': 'Gestionar grupos de modificadores y opciones de personalización.',
  'brand.manageIngredients': 'Gestionar la lista de ingredientes y sus relaciones con productos.',
  'brand.editPrices': 'Modificar los precios de los productos de la carta.',
  'brand.managePromotions': 'Crear y gestionar promociones y combos.',
  'brand.viewInsumos': 'Ver el catálogo de insumos de la marca.',
  'brand.editInsumos': 'Crear, editar y eliminar insumos del catálogo.',
  'brand.viewConceptosServicio': 'Ver los conceptos de servicio configurados (alquiler, servicios, etc.).',
  'brand.editConceptosServicio': 'Crear y editar conceptos de servicio.',
  'brand.viewProveedoresMarca': 'Ver el listado de proveedores a nivel marca.',
  'brand.editProveedoresMarca': 'Crear y editar proveedores a nivel marca.',
  'brand.manageSuppliers': 'Gestión avanzada de proveedores (legacy).',

  // Finanzas Marca
  'brand.viewVentasMensuales': 'Ver el resumen de ventas mensuales por sucursal.',
  'brand.editVentasMensuales': 'Cargar y editar datos de ventas mensuales.',
  'brand.viewCanon': 'Ver las liquidaciones de canon y marketing por sucursal.',
  'brand.editCanon': 'Generar y editar liquidaciones de canon.',

  // Gestión de Personas
  'brand.viewCentralTeam': 'Ver los miembros del equipo central de la marca.',
  'brand.editCentralTeam': 'Agregar y gestionar miembros del equipo central.',
  'brand.viewUsers': 'Buscar y ver todos los usuarios del sistema.',
  'brand.assignRoles': 'Asignar y modificar roles de marca y sucursal a usuarios.',

  // Comunicación
  'brand.createCommunications': 'Crear y enviar comunicados a empleados de las sucursales.',
  'brand.viewCommunications': 'Ver el historial de comunicados enviados.',
  'brand.viewContactMessages': 'Ver mensajes recibidos desde formularios de contacto (empleo, franquicias, proveedores).',
  'brand.manageContactMessages': 'Responder y gestionar mensajes de contacto.',

  // Coaching
  'brand.viewCoaching': 'Ver evaluaciones de coaching realizadas en la red.',
  'brand.coachManagers': 'Realizar evaluaciones de coaching a encargados de sucursales.',

  // Reuniones
  'brand.viewMeetings': 'Ver reuniones de red programadas.',
  'brand.createMeetings': 'Convocar reuniones de red con encargados.',

  // Reglamentos
  'brand.viewRegulations': 'Ver los reglamentos publicados y su estado de firma.',
  'brand.manageRegulations': 'Subir nuevas versiones del reglamento.',

  // Ventas / Cierres
  'brand.viewClosureConfig': 'Configurar las categorías y canales para cierres de turno.',

  // Delivery
  'brand.manageDeliveryPricing': 'Configurar precios y recargos de delivery.',
  'brand.manageDeliveryZones': 'Gestionar zonas y barrios habilitados para delivery.',

  // Configuración
  'brand.viewConfig': 'Ver la configuración general de la marca.',
  'brand.editConfig': 'Modificar la configuración general de la marca.',
  'brand.manageChannels': 'Gestionar canales de venta (Salón, Takeaway, Apps, etc.).',
  'brand.manageIntegrations': 'Gestionar integraciones con servicios externos.',

  // ===== LOCAL =====
  // Dashboard
  'local.viewDashboard': 'Ver el dashboard del local con turnos, equipo fichado y pendientes.',
  'local.enterSales': 'Cargar ventas manualmente en el cierre de turno.',

  // Stock
  'local.viewStock': 'Ver el inventario actual del local.',
  'local.orderFromSupplier': 'Crear pedidos a proveedores desde el módulo de stock.',
  'local.doInventoryCount': 'Realizar conteos de inventario físico.',
  'local.viewStockMovements': 'Ver el historial de movimientos de stock (entradas, salidas, ajustes).',

  // Fichajes
  'local.clockInOut': 'Registrar fichaje de entrada y salida (vía QR o manual).',
  'local.viewClockIns': 'Ver el historial de fichajes de todos los empleados del local.',

  // Equipo
  'local.viewTeam': 'Ver la lista de empleados del local con sus datos y posiciones.',
  'local.inviteEmployees': 'Enviar invitaciones para agregar nuevos miembros al equipo.',
  'local.editTeamMember': 'Editar datos y posiciones de miembros del equipo.',
  'local.deactivateEmployees': 'Desactivar empleados del local.',

  // Horarios
  'local.viewSchedules': 'Ver el calendario de horarios programados.',
  'local.editSchedules': 'Crear y editar horarios de empleados.',
  'local.approveRequests': 'Aprobar o rechazar solicitudes de días libres.',

  // RRHH
  'local.viewMonthlyHours': 'Ver el resumen mensual de horas trabajadas por empleado.',
  'local.viewPayroll': 'Ver información de liquidación de sueldos.',

  // Adelantos
  'local.viewAdvances': 'Ver el historial de adelantos de sueldo.',
  'local.createAdvances': 'Registrar nuevos adelantos de sueldo (requiere PIN).',
  'local.cancelAdvance': 'Cancelar adelantos de sueldo registrados.',

  // Apercibimientos
  'local.viewWarnings': 'Ver el historial de apercibimientos.',
  'local.createWarnings': 'Crear nuevos apercibimientos a empleados.',

  // Coaching
  'local.viewCoaching': 'Ver las evaluaciones de coaching del local.',
  'local.doCoaching': 'Realizar evaluaciones de coaching a empleados.',

  // Comunicados
  'local.viewLocalCommunications': 'Ver comunicados enviados en el local.',
  'local.sendLocalCommunications': 'Enviar comunicados a empleados del local.',

  // Reglamentos
  'local.viewRegulationSignatures': 'Ver el estado de firma del reglamento por empleado.',
  'local.uploadSignatures': 'Subir fotos de firma del reglamento.',

  // Reuniones
  'local.viewMeetings': 'Ver reuniones programadas del local.',
  'local.createMeetings': 'Convocar reuniones del equipo.',
  'local.closeMeetings': 'Cerrar reuniones y registrar asistencia/acuerdos.',

  // Ventas / Cierres
  'local.viewClosures': 'Ver el historial de cierres de turno.',
  'local.closeShifts': 'Realizar el cierre de turno con detalle de ventas.',

  // POS
  'local.accessPOS': 'Acceder al punto de venta para tomar pedidos.',
  'local.viewKitchen': 'Ver la pantalla de cocina (KDS) con pedidos en preparación.',
  'local.assignDelivery': 'Asignar pedidos a cadetes para delivery.',
  'local.operateDelivery': 'Operar como cadete y gestionar entregas.',
  'local.openRegister': 'Abrir caja registradora al inicio del turno.',
  'local.closeRegister': 'Cerrar caja registradora y hacer arqueo.',

  // Operaciones / Compras
  'local.viewProveedoresLocal': 'Ver el listado de proveedores del local.',
  'local.viewCuentaCorriente': 'Ver la cuenta corriente de proveedores.',
  'local.createCompras': 'Cargar facturas de compras y servicios.',
  'local.viewCompras': 'Ver el historial de compras y servicios.',
  'local.pagarProveedor': 'Registrar pagos a proveedores.',

  // Finanzas
  'local.viewGastos': 'Ver gastos menores registrados.',
  'local.createGastos': 'Registrar gastos menores del local.',
  'local.viewConsumos': 'Ver consumos registrados.',
  'local.createConsumos': 'Registrar consumos del local.',
  'local.viewPeriodos': 'Ver los períodos contables configurados.',
  'local.editPeriodos': 'Crear y gestionar períodos contables.',
  'local.viewVentasMensualesLocal': 'Ver el resumen de ventas mensuales del local.',
  'local.editVentasMensualesLocal': 'Cargar datos de ventas mensuales del local.',
  'local.viewPL': 'Ver el resultado económico (P&L) del local.',
  'local.viewSalesReports': 'Ver reportes detallados de ventas.',
  'local.viewCMV': 'Ver el costo de mercadería vendida.',

  // Socios
  'local.viewSocios': 'Ver información de socios y sus movimientos.',
  'local.editSocios': 'Gestionar socios y registrar movimientos.',

  // Configuración
  'local.viewConfig': 'Ver la configuración del local.',
  'local.editConfig': 'Modificar la configuración del local (datos, horarios, etc.).',
  'local.configPrinters': 'Configurar impresoras del local.',
  'local.configShifts': 'Configurar turnos habilitados del local.',
};
