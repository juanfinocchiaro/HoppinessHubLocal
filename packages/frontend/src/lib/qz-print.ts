/**
 * qz-print.ts - Cliente HTTP para Print Bridge
 *
 * Reemplaza QZ Tray. Se comunica con Print Bridge (localhost:3001)
 * que reenvía datos ESC/POS por TCP a impresoras térmicas.
 * Sin Java, sin certificados, sin popups.
 */

const PRINT_BRIDGE_URL = 'http://localhost:3001';

/**
 * Verifica si Print Bridge está corriendo.
 */
export async function detectQZ(): Promise<{
  available: boolean;
  version?: string;
  error?: 'not_running' | 'blocked' | 'unknown';
}> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return { available: true, version: data.version };
    }
    return { available: false, error: 'not_running' };
  } catch {
    return { available: false, error: 'not_running' };
  }
}

/** Alias para compatibilidad */
export const detectPrintBridge = detectQZ;

/**
 * Conecta con Print Bridge (no-op, siempre true si está disponible).
 */
export async function connectQZ(): Promise<boolean> {
  const result = await detectQZ();
  return result.available;
}

/**
 * Verifica si Print Bridge está conectado.
 */
export function isQZConnected(): boolean {
  return true;
}

/**
 * Envía datos RAW (bytes ESC/POS) a una impresora por IP y puerto.
 */
export async function printRaw(
  ip: string,
  port: number,
  data: Uint8Array | number[],
): Promise<void> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const base64 = btoa(String.fromCharCode(...bytes));
  await printRawBase64(ip, port, base64);
}

/**
 * Envía datos en base64 directamente.
 */
export async function printRawBase64(ip: string, port: number, dataBase64: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${PRINT_BRIDGE_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port, data: dataBase64 }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Print Bridge no disponible: ${err.message}`
        : 'Print Bridge no disponible',
    );
  }

  let result: { success?: boolean; error?: string };
  try {
    result = await res.json();
  } catch {
    throw new Error(`Print Bridge respondió con estado ${res.status} (respuesta no válida)`);
  }

  if (!result.success) {
    throw new Error(result.error || 'Error de impresión desconocido');
  }
}

/**
 * Testea conectividad con una impresora.
 */
export async function testPrinterConnection(
  ip: string,
  port: number,
  _timeoutMs = 5000,
): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port }),
      signal: AbortSignal.timeout(5000),
    });
    return await res.json();
  } catch {
    return { reachable: false, error: 'Print Bridge no disponible' };
  }
}

/**
 * Obtiene un fingerprint de la red actual (IP pública).
 */
export async function getNetworkFingerprint(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=text', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

/**
 * Desconecta (no-op para Print Bridge).
 */
export async function disconnectQZ(): Promise<void> {
  // Print Bridge es HTTP stateless, no hay conexión que cerrar
}
