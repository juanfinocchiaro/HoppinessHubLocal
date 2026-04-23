import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus, ShoppingCart, AlertCircle } from 'lucide-react';
import {
  useWebappItemExtras,
  useWebappItemRemovables,
  useWebappItemOptionalGroups,
} from '@/hooks/useWebappMenu';
import type { WebappMenuItem, CartItem, CartItemModifier } from '@/types/webapp';
import { formatPrice } from '@/lib/formatters';

interface Props {
  item: WebappMenuItem | null;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, 'cartId'>) => void;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

function ProductDetailContent({
  item,
  onAdd,
}: {
  item: WebappMenuItem;
  onAdd: Props['onAdd'];
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [groupSelections, setGroupSelections] = useState<Record<string, CartItemModifier[]>>({});

  const sourceItemId = item.source_item_id ?? item.id;
  const { data: extrasList } = useWebappItemExtras(sourceItemId);
  const { data: removables } = useWebappItemRemovables(sourceItemId);
  const { data: optionalGroups } = useWebappItemOptionalGroups(sourceItemId);

  const freeQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    if (item.is_promo_article && item.promo_included_modifiers && extrasList) {
      for (const inc of item.promo_included_modifiers) {
        const match = (extrasList as Array<Record<string, unknown>>).find((e: any) => e.name === inc.name);
        if (match) map.set(match.id as string, inc.quantity);
      }
    }
    return map;
  }, [item.is_promo_article, item.promo_included_modifiers, extrasList]);

  useEffect(() => {
    if (freeQtyMap.size > 0) {
      setExtraQty((prev) => {
        const next = { ...prev };
        for (const [id, qty] of freeQtyMap) {
          if (!(id in next)) next[id] = qty;
        }
        return next;
      });
    }
  }, [freeQtyMap]);

  const groupExtras = Object.values(groupSelections).flat();

  const extrasTotal = useMemo(() => {
    let total = 0;
    for (const [id, qty] of Object.entries(extraQty)) {
      if (qty <= 0) continue;
      const extra = (extrasList as Array<Record<string, unknown>> | undefined)?.find((e: any) => e.id === id);
      if (!extra) continue;
      const free = freeQtyMap.get(id) ?? 0;
      total += (extra.precio as number) * Math.max(0, qty - free);
    }
    return total + groupExtras.reduce((s, e) => s + e.precio, 0);
  }, [extraQty, extrasList, freeQtyMap, groupExtras]);

  const effectivePrice =
    item.precio_promo != null && item.precio_promo < item.base_price
      ? item.precio_promo
      : item.base_price;
  const total = (effectivePrice + extrasTotal) * quantity;

  const missingRequired = (optionalGroups || []).filter(
    (g) => g.is_required && !(groupSelections[g.id]?.length > 0),
  );
  const canAdd = missingRequired.length === 0;

  const incrExtra = (id: string) => setExtraQty((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  const decrExtra = (id: string) =>
    setExtraQty((prev) => {
      const cur = prev[id] ?? 0;
      if (cur <= 0) return prev;
      const next = { ...prev, [id]: cur - 1 };
      if (next[id] === 0) delete next[id];
      return next;
    });

  const toggleRemovido = (displayName: string) => {
    setRemovidos((prev) =>
      prev.includes(displayName) ? prev.filter((r) => r !== displayName) : [...prev, displayName],
    );
  };

  const handleGroupSelect = (
    groupId: string,
    option: CartItemModifier,
    maxSelections: number | null,
  ) => {
    setGroupSelections((prev) => {
      const current = prev[groupId] || [];
      const exists = current.find((e) => e.id === option.id);

      if (exists) {
        return { ...prev, [groupId]: current.filter((e) => e.id !== option.id) };
      }

      if (maxSelections === 1) {
        return { ...prev, [groupId]: [option] };
      }

      if (maxSelections && current.length >= maxSelections) return prev;
      return { ...prev, [groupId]: [...current, option] };
    });
  };

  const handleAdd = () => {
    if (!canAdd) return;
    const chargedExtras: CartItemModifier[] = [];
    for (const [id, qty] of Object.entries(extraQty)) {
      if (qty <= 0) continue;
      const extra = (extrasList as Array<Record<string, unknown>> | undefined)?.find((e: any) => e.id === id);
      if (!extra) continue;
      const free = freeQtyMap.get(id) ?? 0;
      const chargeableQty = Math.max(0, qty - free);
      if (chargeableQty > 0) {
        chargedExtras.push({
          id,
          name: extra.name as string,
          precio: extra.precio as number,
          tipo: 'extra',
          quantity: chargeableQty,
        });
      }
    }
    const allExtras = [...chargedExtras, ...groupExtras];

    onAdd({
      itemId: item.id,
      sourceItemId,
      isPromoArticle: item.is_promo_article,
      promocionId: item.promocion_id ?? null,
      promocionItemId: item.promocion_item_id ?? null,
      includedModifiers: item.promo_included_modifiers,
      name: item.name,
      image_url: item.image_url,
      precioUnitario: effectivePrice,
      quantity,
      extras: allExtras,
      removidos,
      notes,
    });
    setQuantity(1);
    setExtraQty({});
    setRemovidos([]);
    setGroupSelections({});
    setNotes('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Product image */}
      {item.image_url ? (
        <div className="w-full h-48 lg:h-64 overflow-hidden shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-32 bg-muted flex items-center justify-center shrink-0">
          <span className="text-6xl">🍔</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <h2 className="font-brand text-xl font-black text-foreground">{item.name}</h2>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
          {(item.promo_included_modifiers?.length ?? 0) > 0 && (
            <p className="text-xs text-accent font-semibold mt-1">
              Incluye:{' '}
              {item
                .promo_included_modifiers!.map(
                  (m) => `${m.quantity > 1 ? `${m.quantity}x ` : ''}${m.name}`,
                )
                .join(', ')}
            </p>
          )}
          <div className="mt-2">
            {item.precio_promo != null && item.precio_promo < item.base_price ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-accent">
                  {formatPrice(item.precio_promo)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(item.base_price)}
                </span>
              </div>
            ) : (
              <p className="text-lg font-bold text-primary">{formatPrice(item.base_price)}</p>
            )}
          </div>
        </div>

        {/* Optional groups (e.g. "Bebida a elección") */}
        {optionalGroups &&
          optionalGroups.length > 0 &&
          optionalGroups.map((group) => {
            const effectiveMax = group.max_selecciones ?? 1;
            const isRadio = effectiveMax === 1;
            const currentSelections = groupSelections[group.id] || [];
            const isMissing = group.is_required && currentSelections.length === 0;

            return (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-foreground">{group.name}</h3>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      group.is_required
                        ? isMissing
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {group.is_required ? 'Obligatorio' : 'Opcional'}
                    {effectiveMax === 1 ? ' · Elegí 1' : ` · Hasta ${effectiveMax}`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.opciones.map((option) => {
                    const isSelected = currentSelections.some((s) => s.id === option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() =>
                          handleGroupSelect(
                            group.id,
                            {
                              id: option.id,
                              name: option.name,
                              precio: option.precio_extra,
                              tipo: 'extra',
                            },
                            effectiveMax,
                          )
                        }
                        className={`
                        w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors
                        ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}
                      `}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 ${isRadio ? 'rounded-full' : 'rounded'} border-2 flex items-center justify-center transition-colors
                          ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}
                          >
                            {isSelected &&
                              (isRadio ? (
                                <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                              ) : (
                                <span className="text-primary-foreground text-xs">✓</span>
                              ))}
                          </div>
                          <span className="text-sm">{option.name}</span>
                        </div>
                        {option.precio_extra > 0 && (
                          <span className="text-xs text-muted-foreground">
                            +{formatPrice(option.precio_extra)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {/* Extras - flat list from item_extra_asignaciones */}
        {extrasList && extrasList.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">Extras</h3>
            <div className="space-y-1.5">
              {(extrasList as Array<Record<string, unknown>>).map((extra: any) => {
                const qty = extraQty[extra.id] ?? 0;
                const freeQty = freeQtyMap.get(extra.id) ?? 0;
                const chargeableQty = Math.max(0, qty - freeQty);
                return (
                  <div
                    key={extra.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors
                      ${qty > 0 ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="min-w-0">
                      <span className="text-sm">{extra.name}</span>
                      {extra.precio > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{formatPrice(extra.precio)}
                        </span>
                      )}
                      {freeQty > 0 && qty > 0 && (
                        <div className="text-[11px] text-green-600 mt-0.5">
                          {Math.min(freeQty, qty)} gratis
                          {chargeableQty > 0 ? ` · ${chargeableQty} extra` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {qty > 0 && (
                        <button
                          onClick={() => decrExtra(extra.id)}
                          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95"
                          aria-label="Quitar uno"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {qty > 0 && <span className="w-6 text-center text-sm font-bold">{qty}</span>}
                      <button
                        onClick={() => incrExtra(extra.id)}
                        className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
                        aria-label="Agregar uno"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Removables - from item_removibles */}
        {removables && removables.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">¿Querés sacar algo?</h3>
            <div className="space-y-2">
              {removables.map((comp: any) => {
                const displayName = comp.display_name;
                const isRemoved = removidos.includes(displayName);
                return (
                  <div
                    key={comp.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isRemoved ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                    }`}
                  >
                    <span
                      className={`text-sm ${isRemoved ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {displayName}
                    </span>
                    <Switch checked={!isRemoved} onCheckedChange={() => toggleRemovido(displayName)} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Notas</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Algún pedido especial?"
            className="resize-none h-20 text-sm"
            maxLength={200}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-5 py-4 bg-background shrink-0">
        {extrasTotal > 0 && (
          <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Base</span>
              <span>{formatPrice(effectivePrice)}</span>
            </div>
            {Object.entries(extraQty)
              .filter(([, q]) => q > 0)
              .map(([id, qty]) => {
                const extra = (extrasList as Array<Record<string, unknown>> | undefined)?.find((e: any) => e.id === id);
                if (!extra) return null;
                const free = freeQtyMap.get(id) ?? 0;
                const chargeable = Math.max(0, qty - free);
                if (chargeable === 0) return null;
                return (
                  <div key={id} className="flex justify-between">
                    <span>
                      + {chargeable > 1 ? `${chargeable}× ` : ''}
                      {extra.name as string}
                    </span>
                    <span>{formatPrice((extra.precio as number) * chargeable)}</span>
                  </div>
                );
              })}
            {groupExtras.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>+ {e.name}</span>
                <span>{formatPrice(e.precio)}</span>
              </div>
            ))}
            {quantity > 1 && (
              <div className="flex justify-between font-medium text-foreground pt-0.5 border-t border-dashed">
                <span>× {quantity}</span>
                <span>{formatPrice(total)}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95"
              aria-label="Quitar uno"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95"
              aria-label="Agregar uno"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!canAdd && missingRequired.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-destructive mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Seleccioná: {missingRequired.map((g) => g.name).join(', ')}</span>
          </div>
        )}
        <Button
          size="lg"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base gap-2"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          <ShoppingCart className="w-4 h-4" />
          Agregar al carrito · {formatPrice(total)}
        </Button>
      </div>
    </div>
  );
}

export function ProductCustomizeSheet({ item, onClose, onAdd }: Props) {
  const isDesktop = useIsDesktop();

  if (!item) return null;

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isDesktop) {
    return (
      <Dialog open={!!item} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] h-[90vh] flex flex-col">
          <ProductDetailContent key={item.id} item={item} onAdd={onAdd} onClose={onClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={!!item} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 flex flex-col">
        <ProductDetailContent key={item.id} item={item} onAdd={onAdd} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
