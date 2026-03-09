import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, MessageSquare, X } from 'lucide-react';
import type { CartItem } from '@/types/pos';
import { EditableQty } from './EditableQty';

export function ItemRow({
  item,
  index,
  editingNoteIdx,
  setEditingNoteIdx,
  onUpdateQty,
  onRemove,
  onUpdateNotes,
  onSetQty,
}: {
  item: CartItem;
  index: number;
  editingNoteIdx: number | null;
  setEditingNoteIdx: (v: number | null) => void;
  onUpdateQty: (i: number, d: number) => void;
  onRemove: (i: number) => void;
  onUpdateNotes?: (i: number, n: string) => void;
  onSetQty?: (i: number, qty: number) => void;
}) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.reference_price && item.reference_price > (item.unit_price ?? 0) ? (
              <>
                <span className="line-through mr-1">
                  $ {(item.reference_price ?? 0).toLocaleString('es-AR')}
                </span>
                <span className="text-destructive font-semibold">
                  $ {(item.unit_price ?? 0).toLocaleString('es-AR')}
                </span>
                <span className="ml-1"> × {item.quantity}</span>
              </>
            ) : (
              <>
                $ {(item.unit_price ?? 0).toLocaleString('es-AR')} × {item.quantity}
              </>
            )}
          </p>
          {item.notes && editingNoteIdx !== index && (
            <div className="mt-0.5 space-y-0">
              {item.notes.split(/[,|]/).map((note, ni) => {
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
            onClick={() => onUpdateQty(index, -1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateQty(index, 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {onUpdateNotes && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${item.notas ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setEditingNoteIdx(editingNoteIdx === index ? null : index)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {editingNoteIdx === index && onUpdateNotes && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Input
            placeholder="Ej: sin lechuga, bien cocida..."
            value={item.notes || ''}
            onChange={(e) => onUpdateNotes(index, e.target.value)}
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
  );
}
