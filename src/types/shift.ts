export type CanonicalShiftType = 'mañana' | 'mediodía' | 'noche' | 'trasnoche';

type LegacyShiftType = 'morning' | 'midday' | 'night' | 'overnight' | 'afternoon';

const LEGACY_TO_CANONICAL: Record<LegacyShiftType, CanonicalShiftType | null> = {
  morning: 'mañana',
  midday: 'mediodía',
  night: 'noche',
  overnight: 'trasnoche',
  afternoon: null,
};

export const SHIFT_LABELS: Record<CanonicalShiftType, string> = {
  mañana: 'Mañana',
  mediodía: 'Mediodía',
  noche: 'Noche',
  trasnoche: 'Trasnoche',
};

export function normalizeShiftType(shift: string): CanonicalShiftType | string {
  const legacy = LEGACY_TO_CANONICAL[shift as LegacyShiftType];
  if (legacy) return legacy;
  return shift;
}

export function getUnifiedShiftLabel(shift: string): string {
  const normalized = normalizeShiftType(shift);
  if (normalized === 'afternoon') return 'Tarde';
  return SHIFT_LABELS[normalized as CanonicalShiftType] || shift;
}
