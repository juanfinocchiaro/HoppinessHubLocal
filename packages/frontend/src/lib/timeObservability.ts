import { isTimeParityLoggingEnabled } from './timeFeatureFlags';

interface ParityDiffPayload {
  surface: string;
  userId: string;
  legacyValue: number;
  newValue: number;
  context?: Record<string, unknown>;
}

export function logTimeParityDiff(payload: ParityDiffPayload) {
  if (!isTimeParityLoggingEnabled()) return;
  const delta = Math.abs(payload.legacyValue - payload.newValue);
  if (delta < 0.01) return;
  console.warn('[time-parity-diff]', {
    ...payload,
    delta,
  });
}

