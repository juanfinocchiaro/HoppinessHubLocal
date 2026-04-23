/**
 * PrinterStatusDot - Indicador de estado del sistema de impresión
 *
 * Punto verde (conectado) o rojo (no disponible) junto al item de Impresoras en el sidebar.
 * Solo verifica una vez al cargar (no polling continuo).
 */
import { useEffect, useState } from 'react';
import { detectPrintBridge } from '@/lib/qz-print';

export function PrinterStatusDot() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    detectPrintBridge().then((r) => setReady(r.available));
  }, []);

  if (ready === null) return null;

  return (
    <span
      className={`w-2 h-2 rounded-full ${ready ? 'bg-primary' : 'bg-destructive'}`}
      title={ready ? 'Impresoras listas' : 'Sistema de impresión no disponible'}
    />
  );
}
