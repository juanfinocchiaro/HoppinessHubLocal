/**
 * Mapeo de errores técnicos de ARCA a mensajes amigables.
 */
const ERROR_MAP: { pattern: RegExp; friendly: string }[] = [
  {
    pattern: /computador.*no autorizado|not authorized/i,
    friendly:
      'El certificado no está autorizado para facturar. Verificá que el servicio WSFE esté habilitado en ARCA y que el certificado esté vinculado correctamente.',
  },
  {
    pattern: /generationTime/i,
    friendly:
      'Error de sincronización de hora con ARCA. Intentá verificar la conexión de nuevo en unos segundos.',
  },
  {
    pattern: /certificado.*expirado|certificate.*expired/i,
    friendly:
      'El certificado digital expiró. Necesitás regenerar uno nuevo desde la sección de Configuración.',
  },
  {
    pattern: /cuit.*no.*válido|cuit.*invalid/i,
    friendly:
      'El CUIT configurado no es válido o no coincide con el registrado en ARCA. Verificá los datos fiscales.',
  },
  {
    pattern: /punto.*venta.*no.*habilitado|PtoVta.*no.*registrado/i,
    friendly:
      'El punto de venta no está habilitado en ARCA. Verificá que coincida con el registrado en tu panel de ARCA.',
  },
  {
    pattern: /WSAA.*HTTP.*500/i,
    friendly:
      'Error de autenticación con ARCA. Puede ser un problema temporal del servidor de ARCA. Intentá de nuevo en unos minutos.',
  },
  {
    pattern: /network|fetch|timeout|ECONNREFUSED/i,
    friendly:
      'No se pudo conectar con los servidores de ARCA. Verificá tu conexión a internet e intentá de nuevo.',
  },
];

export function getArcaErrorMessage(error: string | null): string {
  if (!error) return 'Error desconocido';

  for (const { pattern, friendly } of ERROR_MAP) {
    if (pattern.test(error)) return friendly;
  }

  return error;
}
