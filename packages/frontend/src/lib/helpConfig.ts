export interface HelpConfig {
  pageId: string;
  title: string;
  description: string;
  tips: string[];
  videoUrl?: string;
}

export const HELP_CONFIG: Record<string, HelpConfig> = {
  // ============ MI LOCAL ============
  'local-dashboard': {
    pageId: 'local-dashboard',
    title: 'Dashboard del Local',
    description: 'Visión general del estado de tu sucursal con turnos y equipo activo.',
    tips: [
      'Las cards de turno muestran el estado de carga de ventas del día',
      'Podés ver quién está fichado y cuánto tiempo llevan trabajando',
      'Los pendientes te muestran tareas que requieren tu atención inmediata',
      'Tocá en la card de un turno para cargar el cierre del mismo',
    ],
  },
  'local-team': {
    pageId: 'local-team',
    title: 'Gestión de Equipo',
    description:
      'Desde aquí podés ver y gestionar a todos los empleados asignados a esta sucursal.',
    tips: [
      'Tocá en un empleado para ver sus datos completos y certificaciones',
      'Usá el botón "Invitar" para sumar nuevos integrantes al equipo',
      'Los roles determinan qué puede hacer cada persona en el sistema',
      'Podés ver las horas trabajadas del mes de cada empleado',
    ],
  },
  'local-coaching': {
    pageId: 'local-coaching',
    title: 'Coaching del Equipo',
    description: 'Realizá evaluaciones mensuales de desempeño y gestioná certificaciones.',
    tips: [
      'Cada empleado debe tener un coaching mensual completo',
      'Las certificaciones van de 0 (sin entrenar) a 3 (experto)',
      'La pestaña "Certificaciones" muestra la matriz de todo el equipo',
      'Los empleados pueden ver su evaluación desde Mi Cuenta',
    ],
  },
  'local-schedules': {
    pageId: 'local-schedules',
    title: 'Horarios del Mes',
    description: 'Planificá los turnos de trabajo de tu equipo con calendario mensual.',
    tips: [
      'Publicá los horarios antes del día 25 de cada mes',
      'Los empleados reciben notificación cuando publicás sus horarios',
      'En "Feriados" podés configurar días especiales globales',
      'Las solicitudes de días libres se aprueban desde "Solicitudes"',
    ],
  },
  'local-clockins': {
    pageId: 'local-clockins',
    title: 'Fichajes',
    description: 'Historial de entradas y salidas de tu equipo.',
    tips: [
      'Podés filtrar por empleado o rango de fechas',
      'Los turnos que cruzan medianoche se asignan al día de entrada',
      'Verificá los fichajes que tengan GPS fuera de rango',
      'Las horas se calculan automáticamente de los pares entrada/salida',
    ],
  },
  'local-advances': {
    pageId: 'local-advances',
    title: 'Adelantos de Sueldo',
    description: 'Registrá adelantos de sueldo para tu equipo con autorización.',
    tips: [
      'Cada adelanto requiere autorización con PIN del encargado',
      'Se descuentan automáticamente en la liquidación mensual',
      'Podés ver el historial completo por empleado',
      'Los empleados ven sus adelantos desde Mi Cuenta',
    ],
  },
  'local-warnings': {
    pageId: 'local-warnings',
    title: 'Apercibimientos',
    description: 'Registro de apercibimientos y llamados de atención formales.',
    tips: [
      'El empleado debe acusar recibo del apercibimiento',
      'Quedan registrados permanentemente en su historial',
      'Podés adjuntar una foto del documento firmado como evidencia',
      'Hay distintos tipos: llegada tarde, falta, conducta, uniforme',
    ],
  },
  'local-regulations': {
    pageId: 'local-regulations',
    title: 'Firmas de Reglamento',
    description: 'Cargá las firmas del reglamento de cada empleado.',
    tips: [
      'Subí una foto del reglamento firmado por el empleado',
      'Si no firman en 5 días, se bloquea su fichaje',
      'Cada versión nueva del reglamento requiere nueva firma',
      'Los empleados ven el PDF desde su cuenta',
    ],
  },
  'local-communications': {
    pageId: 'local-communications',
    title: 'Comunicados del Local',
    description: 'Comunicaciones dirigidas al equipo de tu sucursal.',
    tips: [
      'Los comunicados de marca también aparecen aquí',
      'Podés ver quién leyó cada comunicado',
      'Los urgentes requieren confirmación de lectura',
    ],
  },
  'local-shift-config': {
    pageId: 'local-shift-config',
    title: 'Configuración de Turnos',
    description: 'Configurá los turnos operativos de la sucursal.',
    tips: [
      'Definí horarios de inicio y fin de cada turno',
      'Podés desactivar turnos que no uses',
      'Estos turnos se usan para el cierre de caja',
    ],
  },

  // ============ MI MARCA ============
  'brand-dashboard': {
    pageId: 'brand-dashboard',
    title: 'Dashboard de Marca',
    description: 'Visión consolidada de ventas y operaciones de todas tus sucursales.',
    tips: [
      'Cada columna de la tabla representa una sucursal',
      'Las alertas rojas indican cierres con diferencias importantes',
      'Tocá una sucursal para ver más detalles',
      'El resumen mensual muestra métricas agregadas de toda la red',
    ],
  },
  'brand-branch-detail': {
    pageId: 'brand-branch-detail',
    title: 'Detalle de Sucursal',
    description: 'Vista completa de una sucursal específica desde la marca.',
    tips: [
      'Podés ver el equipo completo de la sucursal',
      'Accedé a las métricas históricas de ventas',
      'Gestioná la configuración del local desde aquí',
    ],
  },
  'brand-users': {
    pageId: 'brand-users',
    title: 'Gestión de Usuarios',
    description: 'Administrá todos los usuarios de la plataforma.',
    tips: [
      'Usá los filtros para encontrar usuarios rápidamente',
      'Podés asignar roles de marca y de local por separado',
      'Un usuario puede tener diferentes roles en distintas sucursales',
      'El rol de marca tiene prioridad sobre el de local',
    ],
  },
  'brand-central-team': {
    pageId: 'brand-central-team',
    title: 'Equipo Central',
    description: 'Usuarios con roles de marca (no pertenecen a una sucursal específica).',
    tips: [
      'Estos usuarios acceden a Mi Marca, no a Mi Local',
      'Los roles disponibles son: Superadmin, Coordinador, Informes, Contador',
      'Podés invitar nuevos miembros al equipo central',
    ],
  },
  'brand-communications': {
    pageId: 'brand-communications',
    title: 'Comunicados de Marca',
    description: 'Envía mensajes a toda la red o a roles específicos.',
    tips: [
      'Podés segmentar por rol y por sucursal',
      'Los comunicados urgentes requieren confirmación de lectura',
      'Mirá el % de lectura de cada comunicado',
      'Usá etiquetas para organizar los comunicados',
    ],
  },
  'brand-regulations': {
    pageId: 'brand-regulations',
    title: 'Reglamentos',
    description: 'Gestión de reglamentos internos para todo el equipo.',
    tips: [
      'Subí el PDF del reglamento actualizado',
      'Cada versión nueva invalida las firmas anteriores',
      'Si no firman en 5 días, se bloquea el fichaje del empleado',
      'Podés ver el estado de firmas por sucursal',
    ],
  },
  'brand-closure-config': {
    pageId: 'brand-closure-config',
    title: 'Configuración de Cierre',
    description: 'Configurá qué datos se cargan en cada cierre de turno.',
    tips: [
      'Habilitá/deshabilitá canales de venta y métodos de pago',
      'Podés personalizar por sucursal desde cada local',
      'Los cambios aplican a partir del próximo cierre',
    ],
  },
  'brand-contact-messages': {
    pageId: 'brand-contact-messages',
    title: 'Mensajes de Contacto',
    description: 'Gestiona los mensajes recibidos desde el sitio web.',
    tips: [
      'Los mensajes se clasifican por tipo: Franquicias, Empleo, Proveedores',
      'Podés asignar mensajes a miembros del equipo',
      'Marcá como leído o respondido para hacer seguimiento',
    ],
  },
  'brand-permissions': {
    pageId: 'brand-permissions',
    title: 'Configuración de Permisos',
    description: 'Definí qué puede hacer cada rol en el sistema.',
    tips: [
      'Los cambios afectan a todos los usuarios con ese rol',
      'Algunos permisos no son editables por seguridad',
      'Los permisos se dividen en categorías por módulo',
    ],
  },

  // ============ MI CUENTA ============
  'cuenta-dashboard': {
    pageId: 'cuenta-dashboard',
    title: 'Mi Cuenta',
    description: 'Tu portal personal con toda tu información y tareas pendientes.',
    tips: [
      'Los comunicados sin leer aparecen destacados',
      'Podés ver tus próximos horarios programados',
      'Solicitá días libres desde la card de solicitudes',
      'Tu historial de fichajes y adelantos está disponible',
    ],
  },
  'cuenta-dashboard-franquiciado': {
    pageId: 'cuenta-dashboard-franquiciado',
    title: 'Mi Cuenta',
    description: 'Acceso rápido a la gestión de tus sucursales.',
    tips: [
      'Entrá a "Mi Local" para ver toda la operación de tu sucursal',
      'Los comunicados de marca aparecen aquí',
      'Podés actualizar tu información personal en "Mi Perfil"',
    ],
  },
  'cuenta-profile': {
    pageId: 'cuenta-profile',
    title: 'Mi Perfil',
    description: 'Gestioná tu información personal y configuración.',
    tips: [
      'Configurá tu PIN de fichaje de 4 dígitos (no lo compartas)',
      'Mantené tu teléfono actualizado para recibir notificaciones',
      'Tu foto de perfil aparece cuando fichás entrada/salida',
    ],
  },
  'cuenta-coachings': {
    pageId: 'cuenta-coachings',
    title: 'Mis Evaluaciones',
    description: 'Historial de tus coachings mensuales.',
    tips: [
      'Las evaluaciones pendientes requieren tu confirmación',
      'Podés ver tus fortalezas y áreas de mejora',
      'El historial muestra tu evolución mes a mes',
    ],
  },
};

export function getHelpConfig(pageId: string): HelpConfig | null {
  return HELP_CONFIG[pageId] || null;
}
