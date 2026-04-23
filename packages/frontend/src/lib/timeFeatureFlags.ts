export function isTimeEngineV2Enabled(): boolean {
  return import.meta.env.VITE_TIME_ENGINE_V2_ENABLED === 'true';
}

export function isTimeParityLoggingEnabled(): boolean {
  return import.meta.env.VITE_TIME_PARITY_LOG_ENABLED === 'true';
}

