import { Button } from '@/components/ui/button';
import { ChevronRight, Pencil, Store, Bike } from 'lucide-react';
import type { OrderConfig } from '@/types/pos';

export function ConfigHeader({ config, onEdit }: { config: OrderConfig; onEdit?: () => void }) {
  const parts: string[] = [];
  if (config.canalVenta === 'mostrador') {
    parts.push('Mostrador');
    if (config.tipoServicio === 'takeaway') parts.push('Para llevar');
    else if (config.tipoServicio === 'comer_aca') parts.push('Comer acá');
    else if (config.tipoServicio === 'delivery') parts.push('Delivery');
  } else {
    parts.push('Apps');
    if (config.canalApp === 'rappi') parts.push('Rappi');
    else if (config.canalApp === 'pedidos_ya') parts.push('PedidosYa');
    else if (config.canalApp === 'mp_delivery') parts.push('MP Delivery');
  }

  const detail = config.numeroLlamador ? `#${config.numeroLlamador}` : config.customerName || '';

  const Icon = config.canalVenta === 'mostrador' ? Store : Bike;

  return (
    <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex items-center gap-1 text-sm font-medium truncate">
          {parts.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              <span>{p}</span>
            </span>
          ))}
        </span>
        {detail && <span className="text-xs text-muted-foreground truncate ml-1">· {detail}</span>}
      </div>
      {onEdit && (
        <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs gap-1" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Editar
        </Button>
      )}
    </div>
  );
}
