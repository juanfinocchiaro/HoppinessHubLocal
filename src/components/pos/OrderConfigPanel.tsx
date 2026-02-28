/**
 * OrderConfigPanel - Selector de canal de venta y número de llamador
 * Fase 1: canal mostrador/apps, tipo servicio (takeaway, comer acá, delivery), llamadores
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pencil } from 'lucide-react';
import type { OrderConfig } from '@/types/pos';
import { ConfigSummaryLine } from './ConfigSummaryLine';
import { ConfigForm } from './ConfigForm';

export { ConfigForm } from './ConfigForm';

interface OrderConfigPanelProps {
  config: OrderConfig;
  onChange: (config: OrderConfig) => void;
  compact?: boolean;
  onConfirm?: () => void;
  branchId?: string;
  /** Si true, el botón Delivery se deshabilita y muestra tooltip con motivo */
  deliveryDisabled?: boolean;
  deliveryDisabledReason?: string;
}

export function OrderConfigPanel({
  config,
  onChange,
  compact,
  onConfirm,
  branchId,
  deliveryDisabled = false,
  deliveryDisabledReason = 'Configurá delivery en Caja para habilitar este canal.',
}: OrderConfigPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <Card>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CardContent className="py-2.5 px-4">
            <div className="flex items-center justify-between gap-2">
              <ConfigSummaryLine config={config} />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardContent>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 border-t">
              <div className="pt-3">
                <ConfigForm
                  config={config}
                  onChange={onChange}
                  onConfirm={() => setExpanded(false)}
                  branchId={branchId}
                  deliveryDisabled={deliveryDisabled}
                  deliveryDisabledReason={deliveryDisabledReason}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <p className="text-sm font-medium mb-3">Canal y cliente</p>
        <ConfigForm
          config={config}
          onChange={onChange}
          onConfirm={onConfirm}
          branchId={branchId}
          deliveryDisabled={deliveryDisabled}
          deliveryDisabledReason={deliveryDisabledReason}
        />
      </CardContent>
    </Card>
  );
}
