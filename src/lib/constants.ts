/**
 * Constantes globales de la aplicación
 */

// Dominio oficial de producción para links públicos
export const PRODUCTION_DOMAIN = 'https://www.hoppinessclub.com';

/** Tasa de IVA estándar */
export const IVA = 1.21;

/** Estados de pedido que se consideran "activos" (no finalizados) */
export const ORDER_ACTIVE_STATES = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'listo_retiro',
  'listo_mesa',
  'listo_envio',
  'en_camino',
] as const;

/** Estados terminales de pedido */
export const ORDER_TERMINAL_STATES = ['entregado', 'cancelado'] as const;

/**
 * Genera la URL de fichaje para un local
 * @param clockCode - Código único del local (ej: "mnt")
 */
export const getClockInUrl = (clockCode: string): string => {
  return `${PRODUCTION_DOMAIN}/fichaje/${clockCode}`;
};
