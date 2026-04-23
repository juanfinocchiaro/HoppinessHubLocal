import { ChevronRight } from 'lucide-react';
import type { CanalVenta, TipoServicio, CanalApp, OrderConfig } from '@/types/pos';

const CANAL_LABELS: Record<CanalVenta, string> = { mostrador: 'Mostrador', apps: 'Apps' };
const TIPO_LABELS: Record<TipoServicio, string> = {
  takeaway: 'Para llevar',
  comer_aca: 'Comer acá',
  delivery: 'Delivery',
};
const APP_LABELS: Record<CanalApp, string> = {
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mp_delivery: 'MP Delivery',
};

export function ConfigSummaryLine({ config }: { config: OrderConfig }) {
  const parts: string[] = [];
  parts.push(CANAL_LABELS[config.canalVenta] || config.canalVenta);

  if (config.canalVenta === 'mostrador' && config.tipoServicio) {
    parts.push(TIPO_LABELS[config.tipoServicio] || config.tipoServicio);
  }
  if (config.canalVenta === 'apps' && config.canalApp) {
    parts.push(APP_LABELS[config.canalApp] || config.canalApp);
  }

  const details: string[] = [];
  if (config.numeroLlamador) details.push(`#${config.numeroLlamador}`);
  if (config.referenciaApp && config.canalVenta === 'apps') details.push(config.referenciaApp);
  if ((config.costoDelivery ?? 0) > 0) {
    details.push(`Envío $${(config.costoDelivery ?? 0).toLocaleString('es-AR')}`);
  }
  if (config.customerName && !config.customerName.startsWith('Llamador #')) {
    details.push(config.customerName);
  } else if (config.customerName) {
    details.push(config.customerName);
  }
  if (config.canalVenta === 'mostrador') {
    if (config.customerPhone) details.push(config.customerPhone);
    if (config.customerAddress) details.push(config.customerAddress);
  }
  if (config.tipoFactura === 'A' && config.canalVenta === 'mostrador') {
    details.push('Fact. A');
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="flex items-center gap-1.5 text-sm font-medium truncate">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span>{p}</span>
          </span>
        ))}
      </span>
      {details.length > 0 && (
        <span className="text-xs text-muted-foreground truncate">{details.join(' · ')}</span>
      )}
    </div>
  );
}
