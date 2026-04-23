import { useLocation } from 'react-router-dom';

/**
 * Derives a human-readable breadcrumb from the current pathname for work panels.
 *
 * Examples:
 *   /cuenta/horario        → "Mi Trabajo › Horario"
 *   /milocal/abc/equipo    → "Mi Local › Equipo"
 *   /mimarca/carta         → "Mi Marca › Carta"
 */

const cuentaLabels: Record<string, string> = {
  horario: 'Horario',
  fichajes: 'Fichajes',
  coachings: 'Coachings',
  reuniones: 'Reuniones',
  solicitudes: 'Días Libres',
  adelantos: 'Adelantos',
  apercibimientos: 'Apercibimientos',
  comunicados: 'Comunicados',
  reglamento: 'Reglamento',
  comparativo: 'Comparativo',
};

const localSectionLabels: Record<string, string> = {
  equipo: 'Equipo',
  tiempo: 'Tiempo',
  ventas: 'Ventas',
  finanzas: 'Finanzas',
  supervisiones: 'Supervisiones',
  config: 'Configuración',
};

const localSubLabels: Record<string, string> = {
  fichajes: 'Fichajes',
  horarios: 'Horarios',
  adelantos: 'Adelantos',
  apercibimientos: 'Apercibimientos',
  reglamentos: 'Reglamentos',
  comunicados: 'Comunicados',
  coaching: 'Coaching',
  reuniones: 'Reuniones',
  liquidacion: 'Liquidación',
  solicitudes: 'Solicitudes',
  historial: 'Historial',
  'cierre-turno': 'Cierre de Turno',
  pos: 'POS',
  cocina: 'Cocina',
  entrega: 'Entrega',
  stock: 'Stock',
  caja: 'Caja',
  proveedores: 'Proveedores',
  insumos: 'Insumos',
  compras: 'Compras',
  gastos: 'Gastos',
  consumos: 'Consumos',
  'ventas-mensuales': 'Ventas Mensuales',
  socios: 'Socios',
  periodos: 'Períodos',
  pl: 'Resultado Económico',
  'resultado-financiero': 'Resultado Financiero',
  'rdo-carga': 'Cargador RDO',
  inversiones: 'Inversiones',
  turnos: 'Turnos',
  impresoras: 'Impresoras',
  estaciones: 'Estaciones',
  impresion: 'Config. Impresión',
  facturacion: 'Facturación',
  mercadopago: 'MercadoPago',
  webapp: 'Tienda Online',
};

const marcaLabels: Record<string, string> = {
  locales: 'Locales',
  usuarios: 'Usuarios',
  'equipo-central': 'Equipo Central',
  comunicados: 'Comunicados',
  mensajes: 'Mensajes',
  reuniones: 'Reuniones',
  coaching: 'Coaching',
  supervisiones: 'Supervisión',
  finanzas: 'Finanzas',
  informes: 'Informes',
  auditoria: 'Auditoría',
  recetas: 'Recetas',
  carta: 'Carta',
  'categorias-carta': 'Categorías',
  'centro-costos': 'Centro de Costos',
  'precios-canal': 'Precios por Canal',
  reglamentos: 'Reglamentos',
  configuracion: 'Configuración',
};

export function useWorkBreadcrumb(panelLabel: string): string {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith('/cuenta')) {
    const segment = path.split('/')[2];
    if (segment && cuentaLabels[segment]) {
      return `${panelLabel} › ${cuentaLabels[segment]}`;
    }
    return panelLabel;
  }

  if (path.startsWith('/milocal')) {
    const parts = path.split('/');
    // /milocal/:branchId/section/sub
    const section = parts[3];
    const sub = parts[4];
    if (section && localSectionLabels[section]) {
      const sectionLabel = localSectionLabels[section];
      if (sub && localSubLabels[sub]) {
        return `${panelLabel} › ${sectionLabel} › ${localSubLabels[sub]}`;
      }
      return `${panelLabel} › ${sectionLabel}`;
    }
    if (section && localSubLabels[section]) {
      return `${panelLabel} › ${localSubLabels[section]}`;
    }
    return panelLabel;
  }

  if (path.startsWith('/mimarca')) {
    const parts = path.split('/');
    const section = parts[2];
    const sub = parts[3];
    if (section && marcaLabels[section]) {
      const sectionLabel = marcaLabels[section];
      if (sub && marcaLabels[sub]) {
        return `${panelLabel} › ${sectionLabel} › ${marcaLabels[sub]}`;
      }
      return `${panelLabel} › ${sectionLabel}`;
    }
    return panelLabel;
  }

  return panelLabel;
}
