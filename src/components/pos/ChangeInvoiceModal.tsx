import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PosOrderFactura } from '@/hooks/pos/usePosOrderHistory';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facturaOriginal: PosOrderFactura;
  pedidoId: string;
  branchId: string;
  onConfirm: (data: ChangeInvoiceData) => Promise<void>;
}

export interface ChangeInvoiceData {
  tipo_factura: 'A' | 'B';
  receptor_cuit: string;
  receptor_razon_social: string;
  receptor_condicion_iva: string;
}

const CONDICIONES_IVA = [
  'Consumidor Final',
  'IVA Responsable Inscripto',
  'Responsable Monotributo',
  'IVA Sujeto Exento',
  'Monotributista Social',
];

export function ChangeInvoiceModal({ open, onOpenChange, facturaOriginal, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>(
    (facturaOriginal.receipt_type === 'A' ? 'A' : 'B') as 'A' | 'B',
  );
  const [cuit, setCuit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [condicionIva, setCondicionIva] = useState('Consumidor Final');

  useEffect(() => {
    if (open) {
      setTipoFactura((facturaOriginal.receipt_type === 'A' ? 'A' : 'B') as 'A' | 'B');
      setCuit('');
      setRazonSocial('');
      setCondicionIva('Consumidor Final');
    }
  }, [open, facturaOriginal]);

  const needsCuit =
    condicionIva === 'IVA Responsable Inscripto' || condicionIva === 'Responsable Monotributo';

  const canSubmit =
    tipoFactura && condicionIva && (!needsCuit || (cuit.length >= 10 && razonSocial));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onConfirm({
        tipo_factura: tipoFactura,
        receptor_cuit: cuit || '',
        receptor_razon_social: razonSocial || '',
        receptor_condicion_iva: condicionIva,
      });
    } finally {
      setLoading(false);
    }
  };

  const pvStr = String(facturaOriginal.point_of_sale).padStart(5, '0');
  const numStr = String(facturaOriginal.receipt_number).padStart(8, '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar datos de facturación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-muted-foreground">Factura original:</p>
            <p className="font-medium">
              {facturaOriginal.tipo_comprobante} {pvStr}-{numStr}
            </p>
            <p className="text-xs text-muted-foreground">
              Se emitirá una Nota de Crédito por esta factura y una nueva factura con los datos
              corregidos.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de factura</Label>
            <Select value={tipoFactura} onValueChange={(v) => setTipoFactura(v as 'A' | 'B')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B">Factura B (CF / Mono / Exento)</SelectItem>
                <SelectItem value="A">Factura A (Resp. Inscripto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condición IVA del receptor</Label>
            <Select value={condicionIva} onValueChange={setCondicionIva}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDICIONES_IVA.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsCuit && (
            <>
              <div className="space-y-2">
                <Label>CUIT del receptor</Label>
                <Input
                  placeholder="20-12345678-9"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Razón Social</Label>
                <Input
                  placeholder="Nombre o razón social"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Emitir NC + Nueva factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
