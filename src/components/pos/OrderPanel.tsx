/**
 * OrderPanel - Carrito actual del pedido
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Minus, Plus, Trash2, CreditCard, ShoppingBag, MessageSquare, X } from 'lucide-react';
import type { CartItem } from '@/types/pos';
import { EditableQty } from './EditableQty';

interface OrderPanelProps {
  items: CartItem[];
  onUpdateQty: (index: number, delta: number) => void;
  onSetQty?: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
  onUpdateNotes?: (index: number, notes: string) => void;
  onCobrar: () => void;
  onCancelOrder?: () => void;
  disabled?: boolean;
}

export function OrderPanel({
  items,
  onUpdateQty,
  onRemove,
  onUpdateNotes,
  onCobrar,
  onCancelOrder,
  disabled,
}: OrderPanelProps) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="p-3 border-b font-medium flex items-center justify-between">
        <span>Pedido actual</span>
        {items.length > 0 && onCancelOrder && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar pedido?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los productos cargados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancelOrder}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, cancelar pedido
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0 p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Agregá productos para empezar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Elegí items del menú y sumalos al pedido
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={`${it.item_carta_id}-${idx}`} className="p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.reference_price && it.reference_price > (it.unit_price ?? 0) ? (
                        <>
                          <span className="line-through mr-1">
                            $ {(it.reference_price ?? 0).toLocaleString('es-AR')}
                          </span>
                          <span className="text-destructive font-semibold">
                            $ {(it.unit_price ?? 0).toLocaleString('es-AR')}
                          </span>
                          <span className="ml-1"> × {it.quantity}</span>
                        </>
                      ) : (
                        <>
                          $ {(it.unit_price ?? 0).toLocaleString('es-AR')} × {it.quantity}
                        </>
                      )}
                    </p>
                    {/* Show existing notes (from modifiers or manual) */}
                    {it.notes && editingNoteIdx !== idx && (
                      <div className="mt-0.5 space-y-0">
                        {it.notes.split(/[,|]/).map((note, ni) => {
                          const trimmed = note.trim();
                          return trimmed ? (
                            <p key={ni} className="text-xs text-primary truncate">
                              {trimmed}
                            </p>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQty(idx, -1)}
                      disabled={it.quantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{it.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQty(idx, 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {onUpdateNotes && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${it.notas ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setEditingNoteIdx(editingNoteIdx === idx ? null : idx)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onRemove(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Inline note editor */}
                {editingNoteIdx === idx && onUpdateNotes && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      placeholder="Ej: sin lechuga, bien cocida..."
                      value={it.notes || ''}
                      onChange={(e) => onUpdateNotes(idx, e.target.value)}
                      className="h-8 text-xs flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingNoteIdx(null);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditingNoteIdx(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="p-3 border-t space-y-2">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>$ {subtotal.toLocaleString('es-AR')}</span>
        </div>
        <Button
          className="w-full hidden lg:flex"
          size="lg"
          onClick={onCobrar}
          disabled={items.length === 0 || disabled}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Cobrar
        </Button>
      </div>
    </div>
  );
}
