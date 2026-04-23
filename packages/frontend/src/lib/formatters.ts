/**
 * Centralized formatting functions.
 * All UI formatting goes through here — no inline formatters in components.
 */

/** Format as ARS currency: $1.234 (no decimals) */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

/** Compact money format: $1.2k, $3.5M */
export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

/** Format as $1.234 (webapp-style, no currency symbol prefix from Intl) */
export function formatPrice(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

/** Format percentage: 32.5% */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Format ISO timestamp to HH:mm */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a time string (HH:mm:ss) to HH:mm */
export function formatTimeSimple(time: string): string {
  return time.slice(0, 5);
}

/** Format number with 2 decimal places, locale es-AR: 1.234,56 */
export function formatCurrencyWithDecimals(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

/** Format comprobante number: #00000123 */
export function formatComprobante(n: number | null | undefined): string {
  return `#${String(n || 0).padStart(8, '0')}`;
}

/** Format ISO date to locale short date */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}
