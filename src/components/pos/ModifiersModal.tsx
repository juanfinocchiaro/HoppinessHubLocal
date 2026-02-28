/**
 * ModifiersModal - Extras, removibles y grupos opcionales al agregar un producto
 * If item has no extras/removibles/opcionales, auto-adds to cart without showing modal.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { POSDialogContent } from './POSDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus, AlertCircle } from 'lucide-react';
import { useItemExtras } from '@/hooks/useItemExtras';
import { useItemRemovibles } from '@/hooks/useItemRemovibles';
import { useGruposOpcionales } from '@/hooks/useGruposOpcionales';
import { Skeleton } from '@/components/ui/skeleton';
import type { CartItem, CartItemExtra, CartItemRemovible, CartItemOpcional } from '@/types/pos';

interface ModifiersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onConfirm: (cartItem: CartItem) => void;
}

interface GroupOption {
  id: string;
  nombre: string;
}

interface ParsedGroup {
  id: string;
  nombre: string;
  es_obligatorio: boolean;
  max_selecciones: number;
  opciones: GroupOption[];
}

const MAX_EXTRA_QTY = 10;

export function ModifiersModal({ open, onOpenChange, item, onConfirm }: ModifiersModalProps) {
  const itemId = item?.id;
  const promoPrice: number | undefined = item?._promoPrice;
  const preconfigExtras:
    | Array<{ extra_item_carta_id: string; cantidad: number; nombre?: string }>
    | undefined = item?._preconfigExtras;
  const hasPreconfig = !!(preconfigExtras && preconfigExtras.length > 0);
  const promoId: string | undefined = item?._promoId;
  const promoRestriccionPago: 'cualquiera' | 'solo_efectivo' | 'solo_digital' | undefined =
    item?._promoRestriccionPago;
  const promoNombre: string | undefined = item?._promoNombre;
  const originalPrecioBase: number | undefined = item?._originalPrecioBase;

  const { data: extras, isLoading: loadingExtras } = useItemExtras(itemId);
  const { data: removibles, isLoading: loadingRemovibles } = useItemRemovibles(itemId);
  const { data: gruposOpcionales, isLoading: loadingGrupos } = useGruposOpcionales(itemId);

  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [selectedRemovibles, setSelectedRemovibles] = useState<Record<string, boolean>>({});
  const [groupSelections, setGroupSelections] = useState<Record<string, GroupOption[]>>({});
  const autoAddedRef = useRef<string | null>(null);
  const preconfigAppliedRef = useRef<string | null>(null);

  // Reset state when item changes
  useEffect(() => {
    if (itemId) {
      setSelectedExtras({});
      setSelectedRemovibles({});
      setGroupSelections({});
      autoAddedRef.current = null;
      preconfigAppliedRef.current = null;
    }
  }, [itemId]);

  // Pre-select extras from promo preconfig once extras list is loaded
  useEffect(() => {
    if (!hasPreconfig || !extras || preconfigAppliedRef.current === itemId) return;
    preconfigAppliedRef.current = itemId;
    const preselected: Record<string, number> = {};
    for (const pc of preconfigExtras!) {
      const match = extras.find((e) => {
        const source = e.preparaciones || e.insumos;
        return (
          source && (e.id === pc.extra_item_carta_id || e.item_carta_id === pc.extra_item_carta_id)
        );
      });
      if (match) {
        preselected[match.id] = pc.cantidad;
      }
    }
    if (Object.keys(preselected).length > 0) {
      setSelectedExtras(preselected);
    }
  }, [hasPreconfig, preconfigExtras, extras, itemId]);

  const extrasList = useMemo(() => {
    if (!extras) return [];
    return extras
      .map((e) => {
        const source = e.preparaciones || e.insumos;
        if (!source) return null;
        return {
          id: e.id,
          nombre: source.nombre,
          precio: source.precio_extra ?? 0,
        };
      })
      .filter(Boolean) as { id: string; nombre: string; precio: number }[];
  }, [extras]);

  const removiblesList = useMemo(() => {
    if (!removibles) return [];
    return removibles.map((r: any) => {
      const nombre =
        r.nombre_display || r.insumos?.nombre || r.preparaciones?.nombre || 'Ingrediente';
      return { id: r.id, nombre };
    });
  }, [removibles]);

  const parsedGroups = useMemo<ParsedGroup[]>(() => {
    if (!gruposOpcionales) return [];
    return (gruposOpcionales as Array<Record<string, unknown>>).map((g: any) => ({
      id: g.id,
      nombre: g.nombre,
      es_obligatorio: g.es_obligatorio ?? false,
      max_selecciones: g.max_selecciones ?? 1,
      opciones: ((g.items || []) as Array<Record<string, unknown>>).map((it: any) => ({
        id: it.id,
        nombre: it.insumos?.nombre || it.preparaciones?.nombre || 'Opción',
      })),
    }));
  }, [gruposOpcionales]);

  const precioBase = item?.precio_base ?? 0;
  const precioRef = item?.precio_referencia ? Number(item.precio_referencia) : undefined;
  const hasDiscount = precioRef != null && precioRef > precioBase;
  const nombre = item?.nombre_corto ?? item?.nombre ?? '';

  const isLoading = loadingExtras || loadingRemovibles || loadingGrupos;
  const hasRegularContent =
    extrasList.length > 0 || removiblesList.length > 0 || parsedGroups.length > 0;
  const hasContent = hasRegularContent || hasPreconfig;

  // Auto-add: no modifiers and no preconfig → instant add
  // Also auto-add: has preconfig but no interactive modifiers → add with promo notes
  useEffect(() => {
    if (open && !isLoading && item && autoAddedRef.current !== itemId) {
      if (!hasContent) {
        autoAddedRef.current = itemId;
        onConfirm({
          item_carta_id: item.id,
          nombre,
          cantidad: 1,
          precio_unitario: precioBase,
          subtotal: precioBase,
          precio_referencia: hasDiscount ? precioRef : undefined,
          categoria_carta_id: item.categoria_carta_id ?? null,
          promo_id: undefined,
          promo_restriccion_pago: undefined,
        });
        onOpenChange(false);
      } else if (hasPreconfig && !hasRegularContent) {
        autoAddedRef.current = itemId;
        const origPrice = item._originalPrecioBase ?? precioBase;
        const discount = origPrice - (promoPrice ?? precioBase);
        const notes = preconfigExtras!
          .map((e) => `+${e.cantidad} ${e.nombre || 'extra'} (incl.)`)
          .join(', ');
        onConfirm({
          item_carta_id: item.id,
          nombre: `${nombre} (PROMO)`,
          cantidad: 1,
          precio_unitario: origPrice,
          subtotal: origPrice,
          notas: notes || undefined,
          categoria_carta_id: item.categoria_carta_id ?? null,
          promo_id: promoId,
          promo_restriccion_pago: promoRestriccionPago,
          promo_descuento: discount > 0 ? discount : undefined,
          promo_nombre: promoNombre || 'Promoción',
        });
        onOpenChange(false);
      }
    }
  }, [
    open,
    isLoading,
    hasContent,
    hasRegularContent,
    hasPreconfig,
    item,
    itemId,
    nombre,
    precioBase,
    promoPrice,
    preconfigExtras,
    hasDiscount,
    precioRef,
    onConfirm,
    onOpenChange,
  ]);

  const preconfigExtraIds = useMemo(() => {
    if (!preconfigExtras) return new Set<string>();
    return new Set(preconfigExtras.map((pe) => pe.extra_item_carta_id));
  }, [preconfigExtras]);

  const preconfigQtyMap = useMemo(() => {
    if (!preconfigExtras) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const pe of preconfigExtras) m.set(pe.extra_item_carta_id, pe.cantidad);
    return m;
  }, [preconfigExtras]);

  const extrasTotal = useMemo(() => {
    return extrasList.reduce((sum, ex) => {
      const qty = selectedExtras[ex.id] || 0;
      return sum + ex.precio * qty;
    }, 0);
  }, [extrasList, selectedExtras]);

  const additionalExtrasTotal = useMemo(() => {
    return extrasList.reduce((sum, ex) => {
      const qty = selectedExtras[ex.id] || 0;
      const freeQty = preconfigQtyMap.get(ex.id) ?? 0;
      const chargeableQty = Math.max(0, qty - freeQty);
      return sum + ex.precio * chargeableQty;
    }, 0);
  }, [extrasList, selectedExtras, preconfigQtyMap]);

  const isPromo = promoPrice != null;
  const origBase = originalPrecioBase ?? precioBase;
  const fullPrice = isPromo ? origBase + additionalExtrasTotal : precioBase + extrasTotal;
  const promoDescuento = isPromo ? origBase - promoPrice : 0;
  const effectivePrice = fullPrice - promoDescuento;

  // Validation: mandatory groups must have selections
  const missingRequired = parsedGroups.filter(
    (g) => g.es_obligatorio && !(groupSelections[g.id]?.length > 0),
  );
  const canConfirm = missingRequired.length === 0;

  const handleExtraQty = (id: string, delta: number) => {
    setSelectedExtras((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(MAX_EXTRA_QTY, current + delta));
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleRemovibleToggle = (id: string) => {
    setSelectedRemovibles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleGroupSelect = (groupId: string, option: GroupOption, maxSelections: number) => {
    setGroupSelections((prev) => {
      const current = prev[groupId] || [];
      const exists = current.find((e) => e.id === option.id);

      if (exists) {
        return { ...prev, [groupId]: current.filter((e) => e.id !== option.id) };
      }

      if (maxSelections === 1) {
        return { ...prev, [groupId]: [option] };
      }

      if (current.length >= maxSelections) return prev;
      return { ...prev, [groupId]: [...current, option] };
    });
  };

  const handleConfirm = () => {
    if (!canConfirm) return;

    const cartExtras: CartItemExtra[] = extrasList
      .filter((ex) => (selectedExtras[ex.id] || 0) > 0)
      .map((ex) => ({
        id: ex.id,
        nombre: ex.nombre,
        precio: ex.precio,
        cantidad: selectedExtras[ex.id],
      }));

    const cartRemovibles: CartItemRemovible[] = removiblesList
      .filter((r: any) => selectedRemovibles[r.id])
      .map((r: any) => ({ id: r.id, nombre: r.nombre }));

    const cartOpcionales: CartItemOpcional[] = [];
    const notasParts: string[] = [];

    // Build opcionales and notes from group selections
    for (const group of parsedGroups) {
      const selected = groupSelections[group.id] || [];
      if (selected.length > 0) {
        for (const sel of selected) {
          cartOpcionales.push({
            grupoId: group.id,
            grupoNombre: group.nombre,
            itemId: sel.id,
            nombre: sel.nombre,
          });
        }
        notasParts.push(`${group.nombre}: ${selected.map((s) => s.nombre).join(', ')}`);
      }
    }

    if (cartExtras.length > 0) {
      const parts: string[] = [];
      for (const e of cartExtras) {
        const freeQty = preconfigQtyMap.get(e.id) ?? 0;
        if (freeQty > 0) {
          const inclQty = Math.min(e.cantidad, freeQty);
          parts.push(`+${inclQty} ${e.nombre} (incl.)`);
          const extraQty = e.cantidad - inclQty;
          if (extraQty > 0) parts.push(`+${extraQty} ${e.nombre}`);
        } else {
          parts.push(`+${e.cantidad} ${e.nombre}`);
        }
      }
      notasParts.push(parts.join(', '));
    }
    if (cartRemovibles.length > 0) {
      notasParts.push(cartRemovibles.map((r) => r.nombre).join(', '));
    }

    const displayName = isPromo ? `${nombre} (PROMO)` : nombre;

    onConfirm({
      item_carta_id: item.id,
      nombre: displayName,
      cantidad: 1,
      precio_unitario: fullPrice,
      subtotal: fullPrice,
      notas: notasParts.length > 0 ? notasParts.join(' | ') : undefined,
      extras: cartExtras.length > 0 ? cartExtras : undefined,
      removibles: cartRemovibles.length > 0 ? cartRemovibles : undefined,
      opcionales: cartOpcionales.length > 0 ? cartOpcionales : undefined,
      precio_referencia: !isPromo && hasDiscount ? precioRef : undefined,
      categoria_carta_id: item.categoria_carta_id ?? null,
      promo_id: isPromo ? promoId : undefined,
      promo_restriccion_pago: isPromo ? promoRestriccionPago : undefined,
      promo_descuento: promoDescuento > 0 ? promoDescuento : undefined,
      promo_nombre: isPromo ? promoNombre || 'Promoción' : undefined,
    });

    onOpenChange(false);
  };

  if (!open || !item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <POSDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{nombre}</span>
            {promoPrice != null ? (
              <span className="flex items-center gap-1.5 ml-2 shrink-0">
                <span className="text-muted-foreground text-sm line-through">
                  $ {(item._originalPrecioBase ?? precioBase).toLocaleString('es-AR')}
                </span>
                <span className="text-green-600 font-semibold text-base">
                  $ {promoPrice.toLocaleString('es-AR')}
                </span>
              </span>
            ) : (
              <span className="text-primary font-semibold text-base ml-2 shrink-0">
                $ {precioBase.toLocaleString('es-AR')}
              </span>
            )}
          </DialogTitle>
          {hasPreconfig && (
            <p className="text-xs text-green-600 font-medium">Promo con extras incluidos</p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto">
            {/* Optional groups (e.g. "Bebida a elección") */}
            {parsedGroups.map((group) => {
              const isRadio = group.max_selecciones === 1;
              const currentSelections = groupSelections[group.id] || [];
              const isMissing = group.es_obligatorio && currentSelections.length === 0;

              return (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.nombre}
                    </h4>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        group.es_obligatorio
                          ? isMissing
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {group.es_obligatorio ? 'Obligatorio' : 'Opcional'}
                      {isRadio ? ' · Elegí 1' : ` · Hasta ${group.max_selecciones}`}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.opciones.map((option) => {
                      const isSelected = currentSelections.some((s) => s.id === option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleGroupSelect(group.id, option, group.max_selecciones)}
                          className={`
                            w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors
                            ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}
                          `}
                        >
                          <div
                            className={`w-4.5 h-4.5 ${isRadio ? 'rounded-full' : 'rounded'} border-2 flex items-center justify-center shrink-0 transition-colors
                            ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}
                          >
                            {isSelected &&
                              (isRadio ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                              ) : (
                                <span className="text-primary-foreground text-[10px] leading-none">
                                  ✓
                                </span>
                              ))}
                          </div>
                          <span className="text-sm font-medium">{option.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {extrasList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Extras
                </h4>
                <div className="space-y-2">
                  {extrasList.map((ex) => {
                    const qty = selectedExtras[ex.id] || 0;
                    const isIncluded = preconfigExtraIds.has(ex.id);
                    const freeQty = preconfigQtyMap.get(ex.id) ?? 0;
                    const chargeableQty = Math.max(0, qty - freeQty);
                    return (
                      <div
                        key={ex.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${isIncluded ? 'bg-green-50 border border-green-200' : 'bg-muted/50'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{ex.nombre}</p>
                            {isIncluded && (
                              <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                {freeQty} gratis
                              </span>
                            )}
                          </div>
                          {ex.precio > 0 && (
                            <p className="text-xs text-primary font-semibold">
                              +$ {ex.precio.toLocaleString('es-AR')} c/u
                              {isIncluded && chargeableQty > 0 && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  ({chargeableQty} extra{chargeableQty > 1 ? 's' : ''} a cobrar)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleExtraQty(ex.id, -1)}
                            disabled={qty <= 0}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{qty}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleExtraQty(ex.id, 1)}
                            disabled={qty >= MAX_EXTRA_QTY}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {removiblesList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Sin ingrediente
                </h4>
                <div className="space-y-2">
                  {removiblesList.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm font-medium">{r.nombre}</span>
                      <Switch
                        checked={!!selectedRemovibles[r.id]}
                        onCheckedChange={() => handleRemovibleToggle(r.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!isLoading && missingRequired.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-destructive w-full">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Seleccioná: {missingRequired.map((g) => g.nombre).join(', ')}</span>
            </div>
          )}
          {isPromo && promoDescuento > 0 && (
            <div className="text-xs text-muted-foreground w-full text-right space-y-0.5">
              {additionalExtrasTotal > 0 && (
                <div>Extras adicionales: +$ {additionalExtrasTotal.toLocaleString('es-AR')}</div>
              )}
              <div className="text-green-600">
                Desc. promo: -$ {promoDescuento.toLocaleString('es-AR')}
              </div>
            </div>
          )}
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading || !canConfirm} className="flex-1">
              Agregar — $ {effectivePrice.toLocaleString('es-AR')}
            </Button>
          </div>
        </DialogFooter>
      </POSDialogContent>
    </Dialog>
  );
}
