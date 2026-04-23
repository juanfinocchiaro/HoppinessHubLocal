/**
 * operationalDate.ts - Utilidad para manejar la Jornada Operativa
 *
 * En el negocio de gastronomía, la "jornada operativa" no coincide con el día calendario.
 * El turno de cierre (Noche/Trasnoche) que comienza el sábado termina en las primeras
 * horas del domingo, pero operativamente sigue siendo "el sábado".
 *
 * Regla de negocio:
 * - Horas 00:00-04:59 pertenecen a la jornada operativa del DÍA ANTERIOR
 * - A las 00:30 del domingo, el sistema debe mostrar datos del SÁBADO
 * - El turno de "Noche" del sábado sigue activo hasta que se cierre o hasta las 05:00
 */

import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Hora de corte para cambio de jornada operativa (5:00 AM)
 * Antes de esta hora, se considera el día anterior
 */
const OPERATIONAL_DAY_CUTOFF_HOUR = 5;

/**
 * Verifica si la hora actual es "madrugada" (00:00-04:59)
 * Durante estas horas, la jornada operativa es del día anterior
 */
export function isEarlyMorning(date: Date = new Date()): boolean {
  const hours = date.getHours();
  return hours >= 0 && hours < OPERATIONAL_DAY_CUTOFF_HOUR;
}

/**
 * Obtiene la fecha operativa actual como objeto Date
 * Si es madrugada (00:00-04:59), retorna el día anterior
 */
export function getOperationalDate(now: Date = new Date()): Date {
  if (isEarlyMorning(now)) {
    return subDays(now, 1);
  }
  return now;
}

/**
 * Obtiene la fecha operativa en formato ISO string (yyyy-MM-dd)
 * Útil para queries a la base de datos
 */
export function getOperationalDateString(now: Date = new Date()): string {
  const operationalDate = getOperationalDate(now);
  return format(operationalDate, 'yyyy-MM-dd');
}

/**
 * Formatea la fecha operativa para mostrar en UI
 * Incluye indicador "(cierre)" si es madrugada
 *
 * Ejemplo: "sábado 8 feb (cierre)"
 */
export function formatOperationalDate(now: Date = new Date()): string {
  const operationalDate = getOperationalDate(now);
  const formatted = format(operationalDate, 'EEEE d MMM', { locale: es });

  if (isEarlyMorning(now)) {
    return `${formatted} (cierre)`;
  }

  return formatted;
}

/**
 * Obtiene el día calendario real (para comparaciones o logs)
 */
export function getCalendarDateString(now: Date = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}
