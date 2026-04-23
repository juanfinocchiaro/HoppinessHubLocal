/**
 * Normalizes Argentine phone numbers to digits only for reliable matching.
 *
 * Handles common input formats:
 *   "+54 351 123-4567"  → "3511234567"
 *   "0351 1234567"      → "3511234567"
 *   "549 3511234567"    → "3511234567"
 *   "3511234567"        → "3511234567"
 *   "11 1234-5678"      → "1112345678"
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');

  // 549 + 10 digits = 13 (country + mobile indicator)
  if (digits.startsWith('549') && digits.length === 13) digits = digits.slice(3);
  // 54 + 10 digits = 12 (country code only)
  else if (digits.startsWith('54') && digits.length === 12) digits = digits.slice(2);
  // 0 + 10 digits = 11 (local trunk prefix)
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);

  return digits;
}

/** Returns true if two phone numbers refer to the same number after normalization. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na.length >= 7 && na === nb;
}

/**
 * Builds common storage variants of a phone number for querying historical data
 * where the format may vary.
 */
export function phoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 7) return [phone.trim()].filter(Boolean);

  const variants = new Set<string>([
    phone.trim(),
    normalized,
    `+54${normalized}`,
    `549${normalized}`,
    `54${normalized}`,
  ]);

  return [...variants].filter(Boolean);
}
