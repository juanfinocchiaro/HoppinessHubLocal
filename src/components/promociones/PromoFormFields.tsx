import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, Calendar, ChevronDown } from 'lucide-react';
import type { PromocionFormData } from '@/hooks/usePromociones';
import { PromoItemRow } from './PromoItemRow';
import { formatTimeRange, formatChannels } from './helpers';
import {
  TIPO_LABELS, PAGO_LABELS, CANAL_LABELS, ALL_CANALES, DIAS,
} from './constants';
import type { PromoItemDraft } from './types';

interface PromoFormFieldsProps {
  form: PromocionFormData;
  setForm: Dispatch<SetStateAction<PromocionFormData>>;
  promoItems: PromoItemDraft[];
  setPromoItems: Dispatch<SetStateAction<PromoItemDraft[]>>;
  itemSearch: string;
  setItemSearch: Dispatch<SetStateAction<string>>;
  searchResults: Array<{ id: string; name: string; base_price: number; image_url?: string | null }>;
  onAddItem: (item: { id: string; name: string; base_price: number; image_url?: string | null }) => void;
  onApplyPercentage: () => void;
}

export function PromoFormFields({
  form, setForm, promoItems, setPromoItems, itemSearch, setItemSearch,
  searchResults, onAddItem, onApplyPercentage,
}: PromoFormFieldsProps) {
  const timeLabel = formatTimeRange(form.hora_inicio, form.hora_fin);
  const channelsLabel = formatChannels(form.canales) || '—';
  const daysLabel = form.dias_semana.length >= 7
    ? 'Todos los días'
    : form.dias_semana.slice().sort((a, b) => a - b).map((d) => DIAS[d] ?? String(d)).join(', ');
  const discountLabel = (() => {
    if (!form.valor || form.valor <= 0) return '';
    if (form.tipo === 'descuento_porcentaje') return `${form.valor}% OFF`;
    if (form.tipo === 'descuento_fijo') return `$${Number(form.valor).toLocaleString('es-AR')} OFF`;
    return TIPO_LABELS[form.tipo] || '';
  })();
  const itemsLabel = promoItems.length === 1 ? '1 producto' : `${promoItems.length} productos`;
  const hasOverrides = form.tipo === 'descuento_porcentaje' && form.valor > 0
    ? promoItems.some((it) => {
         const extrasTotal = (it.preconfigExtras || []).reduce((s, e) => s + e.precio_extra * e.quantity, 0);
        const auto = Math.round((Number(it.base_price) + extrasTotal) * (1 - form.valor / 100));
        return Number(it.precio_promo) !== auto;
      })
    : false;
  const summary = `${daysLabel} · ${timeLabel} · ${channelsLabel}${discountLabel ? ` · ${discountLabel}` : ''} · ${itemsLabel}${hasOverrides ? ' · precios ajustados' : ''}`;

  const toggleCanal = (canal: string) => setForm((prev) => ({ ...prev, canales: prev.canales.includes(canal) ? prev.canales.filter((c) => c !== canal) : [...prev.canales, canal] }));
  const toggleDay = (day: number) => setForm((prev) => ({ ...prev, dias_semana: prev.dias_semana.includes(day) ? prev.dias_semana.filter((d) => d !== day) : [...prev.dias_semana, day].sort() }));
  const updatePromoItem = (itemCartaId: string, updated: PromoItemDraft) => setPromoItems((prev) => prev.map((i) => i.item_carta_id === itemCartaId ? updated : i));
  const removeItem = (itemCartaId: string) => setPromoItems((prev) => prev.filter((i) => i.item_carta_id !== itemCartaId));

  const sectionHeader = (title: string, hint?: string) => (
    <div className="flex items-baseline justify-between gap-2">
      <h4 className="text-sm font-bold">{title}</h4>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );

  const discountSection = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as PromocionFormData['tipo'] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TIPO_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor</Label>
          <div className="flex gap-2">
            <Input type="number" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: Number(e.target.value) }))} className="flex-1" />
            {form.tipo === 'descuento_porcentaje' && promoItems.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={onApplyPercentage} className="shrink-0 text-xs h-9">Aplicar a todos</Button>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">El precio final se calcula por producto (base + extras incluidos) y podés ajustarlo manualmente.</p>
    </div>
  );

  const whereSection = (
    <div className="space-y-2">
      <Label className="font-medium">Canales</Label>
      <div className="flex gap-3 flex-wrap">
        {ALL_CANALES.map((canal) => (
          <label key={canal} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={form.canales.includes(canal)} onCheckedChange={() => toggleCanal(canal)} />
            {CANAL_LABELS[canal]}
          </label>
        ))}
      </div>
    </div>
  );

  const whenSection = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="font-medium">Días</Label>
        <div className="flex gap-1 flex-wrap">
          {DIAS.map((dia, i) => (
            <Button key={i} type="button" size="sm" variant={form.dias_semana.includes(i) ? 'default' : 'outline'} onClick={() => toggleDay(i)} className="w-9 h-7 text-xs px-0">{dia}</Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Hora inicio</Label><Input type="time" value={form.hora_inicio} onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label>Hora fin</Label><Input type="time" value={form.hora_fin} onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))} /></div>
      </div>
      <details className="rounded-lg border bg-muted/10 px-3 py-2">
        <summary className="cursor-pointer select-none text-sm font-medium flex items-center justify-between"><span>Rango de fechas (opcional)</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></summary>
        <div className="pt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio || ''} onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value || null }))} /></div>
          <div className="space-y-1.5"><Label>Fecha fin</Label><Input type="date" value={form.fecha_fin || ''} onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value || null }))} /></div>
        </div>
      </details>
    </div>
  );

  const advancedSection = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Restricción de pago</Label>
        <Select value={form.restriccion_pago} onValueChange={(v) => setForm((f) => ({ ...f, restriccion_pago: v as PromocionFormData['restriccion_pago'] }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(PAGO_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de usuario</Label>
        <Select value={form.tipo_usuario} onValueChange={(v) => setForm((f) => ({ ...f, tipo_usuario: v as PromocionFormData['tipo_usuario'] }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem><SelectItem value="nuevo">Nuevos</SelectItem>
            <SelectItem value="recurrente">Recurrentes</SelectItem><SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Miércoles de Doble Royal" />
          </div>
          <div className="pt-6 flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">Activa</span>
            <select className="hidden"><option /></select>
            <input type="checkbox" className="hidden" />
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción (visible a clientes)</Label>
          <Input value={form.descripcion || ''} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: 30% OFF pagando en efectivo" />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap"><Calendar className="w-3.5 h-3.5" /><span className="font-medium text-foreground/80">{summary}</span></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-2">
          {sectionHeader('Productos', promoItems.length > 0 ? `${promoItems.length} seleccionados` : undefined)}
          <p className="text-xs text-muted-foreground">Importá productos y definí qué incluye la promo. Los extras marcados acá quedan <span className="font-medium">incluidos</span>.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Buscar producto de la carta..." className="pl-9 h-9" />
          </div>
          {searchResults.length > 0 && (
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
              {searchResults.map((item) => (
                <button key={item.id} onClick={() => onAddItem(item)} className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm">
                  <span className="truncate">{item.name}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">${Number(item.base_price).toLocaleString('es-AR')}</span>
                </button>
              ))}
            </div>
          )}
          {promoItems.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {promoItems.map((item) => (
                <PromoItemRow key={item.item_carta_id} item={item} discountPercent={form.tipo === 'descuento_porcentaje' ? form.valor : 0}
                  onUpdate={(updated) => updatePromoItem(item.item_carta_id, updated)} onRemove={() => removeItem(item.item_carta_id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">Agregá al menos un producto para configurar precios y extras.</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="lg:hidden rounded-lg border">
            <Accordion type="single" collapsible defaultValue="discount">
              <AccordionItem value="discount"><AccordionTrigger className="px-3">Descuento</AccordionTrigger><AccordionContent className="px-3">{discountSection}</AccordionContent></AccordionItem>
              <AccordionItem value="where"><AccordionTrigger className="px-3">Dónde aplica</AccordionTrigger><AccordionContent className="px-3">{whereSection}</AccordionContent></AccordionItem>
              <AccordionItem value="when"><AccordionTrigger className="px-3">Cuándo aplica</AccordionTrigger><AccordionContent className="px-3">{whenSection}</AccordionContent></AccordionItem>
              <AccordionItem value="advanced"><AccordionTrigger className="px-3">Restricciones (avanzado)</AccordionTrigger><AccordionContent className="px-3">{advancedSection}</AccordionContent></AccordionItem>
            </Accordion>
          </div>
          <div className="hidden lg:block space-y-4">
            <div className="rounded-lg border p-3 space-y-2">{sectionHeader('Descuento')}{discountSection}</div>
            <div className="rounded-lg border p-3 space-y-2">{sectionHeader('Dónde aplica')}{whereSection}</div>
            <div className="rounded-lg border p-3 space-y-2">{sectionHeader('Cuándo aplica')}{whenSection}</div>
            <details className="rounded-lg border p-3 bg-muted/10">
              <summary className="cursor-pointer select-none text-sm font-bold flex items-center justify-between"><span>Restricciones (avanzado)</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></summary>
              <div className="pt-3">{advancedSection}</div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
