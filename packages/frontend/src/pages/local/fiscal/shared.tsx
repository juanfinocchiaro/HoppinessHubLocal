export type { FiscalBranchData, FacturaEmitidaWithPedido } from '@/types/fiscal';

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');

export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(v);

export function Row({ label, value, bold }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
