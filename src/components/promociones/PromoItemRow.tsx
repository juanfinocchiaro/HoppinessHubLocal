import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useItemExtras } from '@/hooks/useItemExtras';
import type { PromoItemDraft, PromoItemExtraDraft } from './types';

interface PromoItemRowProps {
  item: PromoItemDraft;
  discountPercent: number;
  onUpdate: (updated: PromoItemDraft) => void;
  onRemove: () => void;
}

export function PromoItemRow({ item, discountPercent, onUpdate, onRemove }: PromoItemRowProps) {
  const { data: productExtras = [] } = useItemExtras(item.item_carta_id);
  const [showExtras, setShowExtras] = useState(!!item.preconfigExtras?.length);

  const availableExtras = useMemo(
    () => productExtras.map((e) => ({
      id: e.id,
      nombre: e.preparaciones?.name || e.insumos?.name || '',
      precio: Number(e.preparaciones?.precio_extra ?? e.insumos?.precio_extra ?? 0),
    })),
    [productExtras],
  );

  const computeAutoPrice = (base: number, extras: PromoItemExtraDraft[], disc: number) => {
    const extrasTotal = extras.reduce((s, e) => s + e.precio_extra * e.quantity, 0);
    return Math.round((base + extrasTotal) * (1 - disc / 100));
  };

  const toggleExtra = (extraId: string, nombre: string, precio: number) => {
    const existing = item.preconfigExtras || [];
    let next: PromoItemExtraDraft[];
    if (existing.some((e) => e.extra_item_carta_id === extraId)) {
      next = existing.filter((e) => e.extra_item_carta_id !== extraId);
    } else {
      next = [...existing, { extra_item_carta_id: extraId, name: nombre, quantity: 1, precio_extra: precio }];
    }
    const newPrice = computeAutoPrice(item.base_price, next, discountPercent);
    onUpdate({ ...item, preconfigExtras: next.length > 0 ? next : undefined, precio_promo: newPrice });
  };

  const updateQty = (extraId: string, qty: number) => {
    const next = (item.preconfigExtras || []).map((e) => e.extra_item_carta_id === extraId ? { ...e, cantidad: Math.max(1, qty) } : e);
    const newPrice = computeAutoPrice(item.base_price, next, discountPercent);
    onUpdate({ ...item, preconfigExtras: next, precio_promo: newPrice });
  };

  const extrasSubtotal = (item.preconfigExtras || []).reduce((s, e) => s + e.precio_extra * e.cantidad, 0);
  const baseWithExtras = item.base_price + extrasSubtotal;
  const autoPrice = discountPercent > 0 ? computeAutoPrice(item.base_price, item.preconfigExtras || [], discountPercent) : null;
  const effectivePercent = baseWithExtras > 0 ? Math.max(0, Math.min(100, Math.round((1 - item.precio_promo / baseWithExtras) * 1000) / 10)) : 0;
  const isOverride = autoPrice != null && item.precio_promo !== autoPrice;
  const isMoreDiscountThanConfigured = autoPrice != null && item.precio_promo < autoPrice;

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm truncate flex-1">{item.name}</span>
        <span className="text-xs text-muted-foreground line-through">${(item.base_price ?? 0).toLocaleString('es-AR')}</span>
        <span className="text-xs">→</span>
        <Input type="number" value={item.precio_promo} onChange={(e) => onUpdate({ ...item, precio_promo: Math.max(0, Number(e.target.value) || 0) })} className="h-7 w-24 text-xs" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}><X className="w-3.5 h-3.5 text-destructive" /></Button>
      </div>

      {discountPercent > 0 && autoPrice != null && (
        <div className="flex items-center justify-between gap-2">
          <div className={`text-[11px] ${isMoreDiscountThanConfigured ? 'text-destructive' : 'text-muted-foreground'}`}>
            Auto ({discountPercent}%): ${autoPrice.toLocaleString('es-AR')}
            {isOverride && (
              <><span className="text-muted-foreground/40"> · </span><span>Equivale a {effectivePercent.toLocaleString('es-AR')}%</span>
              {isMoreDiscountThanConfigured && (<><span className="text-muted-foreground/40"> · </span><span className="font-medium">Más descuento del configurado</span></>)}</>
            )}
          </div>
          {isOverride && (
            <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => onUpdate({ ...item, precio_promo: autoPrice })} title="Volver al precio auto-calculado">Usar auto</Button>
          )}
        </div>
      )}

      {availableExtras.length > 0 && (
        <>
          <button type="button" onClick={() => setShowExtras(!showExtras)} className="text-[11px] text-primary hover:underline">
            {showExtras ? '▾ Ocultar extras' : '▸ Extras preconfigurados'}
            {(item.preconfigExtras?.length ?? 0) > 0 && ` (${item.preconfigExtras!.length})`}
          </button>
          {showExtras && (
            <div className="pl-3 border-l-2 border-primary/20 space-y-1">
              {availableExtras.map((ex) => {
                const selected = (item.preconfigExtras || []).find((pe) => pe.extra_item_carta_id === ex.id);
                return (
                  <div key={ex.id} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={!!selected} onCheckedChange={() => toggleExtra(ex.id, ex.nombre, ex.precio)} />
                    <span className="truncate flex-1">{ex.nombre}</span>
                    <span className="text-muted-foreground shrink-0">${ex.precio.toLocaleString('es-AR')}</span>
                    {selected && (<><span className="text-muted-foreground">×</span><Input type="number" min={1} max={10} value={selected.cantidad} onChange={(e) => updateQty(ex.id, Number(e.target.value) || 1)} className="h-6 w-14 text-xs text-center" /></>)}
                  </div>
                );
              })}
              <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t">
                <div className="flex justify-between"><span>Base</span><span>${(item.base_price ?? 0).toLocaleString('es-AR')}</span></div>
                {extrasSubtotal > 0 && <div className="flex justify-between"><span>+ Extras</span><span>${extrasSubtotal.toLocaleString('es-AR')}</span></div>}
                {discountPercent > 0 && (
                  <><div className="flex justify-between"><span>= Subtotal</span><span>${((item.base_price ?? 0) + extrasSubtotal).toLocaleString('es-AR')}</span></div>
                  <div className="flex justify-between text-red-500"><span>- {discountPercent}% desc</span><span>-${Math.round((((item.base_price ?? 0) + extrasSubtotal) * discountPercent) / 100).toLocaleString('es-AR')}</span></div></>
                )}
                <div className="flex justify-between font-semibold text-green-600"><span>= Promo</span><span>${(item.precio_promo ?? 0).toLocaleString('es-AR')}</span></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
