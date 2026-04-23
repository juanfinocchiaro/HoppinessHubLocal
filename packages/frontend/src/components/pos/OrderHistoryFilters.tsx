import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  OrderFilters,
  OrderFilterCanalVenta,
  OrderFilterTipoServicio,
  OrderFilterMetodoPago,
  OrderFilterEstado,
} from '@/hooks/pos/usePosOrderHistory';

interface Props {
  daysBack: string;
  onDaysBackChange: (v: string) => void;
  filters: OrderFilters;
  onFiltersChange: (f: OrderFilters) => void;
  onExport: () => void;
  hasData: boolean;
}

const RANGE_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '15', label: '15 días' },
  { value: '30', label: '30 días' },
];

export function OrderHistoryFilters({
  daysBack,
  onDaysBackChange,
  filters,
  onFiltersChange,
  onExport,
  hasData,
}: Props) {
  const set = <K extends keyof OrderFilters>(key: K, val: OrderFilters[K]) =>
    onFiltersChange({ ...filters, [key]: val });

  const showTipoServicio = filters.canalVenta === 'todos' || filters.canalVenta === 'mostrador';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={daysBack} onValueChange={onDaysBackChange}>
        <SelectTrigger className="w-28 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.canalVenta}
        onValueChange={(v) => set('canalVenta', v as OrderFilterCanalVenta)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Canal: Todos</SelectItem>
          <SelectItem value="mostrador">Mostrador</SelectItem>
          <SelectItem value="apps">Apps</SelectItem>
        </SelectContent>
      </Select>

      {showTipoServicio && (
        <Select
          value={filters.tipoServicio}
          onValueChange={(v) => set('tipoServicio', v as OrderFilterTipoServicio)}
        >
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Servicio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Servicio: Todos</SelectItem>
            <SelectItem value="takeaway">Takeaway</SelectItem>
            <SelectItem value="comer_aca">Comer acá</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.metodoPago}
        onValueChange={(v) => set('metodoPago', v as OrderFilterMetodoPago)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="Pago" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Pago: Todos</SelectItem>
          <SelectItem value="cash">Efectivo</SelectItem>
          <SelectItem value="debit_card">Débito</SelectItem>
          <SelectItem value="credit_card">Crédito</SelectItem>
          <SelectItem value="mercadopago_qr">QR</SelectItem>
          <SelectItem value="transfer">Transferencia</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.estado} onValueChange={(v) => set('estado', v as OrderFilterEstado)}>
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Estado: Todos</SelectItem>
          <SelectItem value="entregado">Entregado</SelectItem>
          <SelectItem value="listo">Listo</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="# o cliente..."
          value={filters.searchQuery}
          onChange={(e) => set('searchQuery', e.target.value)}
          className="pl-8 h-9 w-40"
        />
      </div>

      {hasData && (
        <Button variant="outline" size="sm" onClick={onExport} className="h-9">
          <Download className="w-4 h-4 mr-1" /> Excel
        </Button>
      )}
    </div>
  );
}
