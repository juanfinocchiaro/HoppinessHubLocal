import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pencil, Trash2, ChevronDown, GripVertical, Check, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PrepRow } from './PrepRow';
import type { Preparacion, CategoriaPreparacion, PreparacionMutations } from './types';

export function SortableCategoryCard({
  cat,
  items,
  isOpen,
  onToggle,
  editingId,
  editingNombre,
  setEditingNombre,
  setEditingId,
  handleUpdateCat,
  setDeletingCat,
  expandedId,
  setExpandedId,
  mutations,
  setDeletingPrep,
  categorias,
}: {
  cat: CategoriaPreparacion;
  items: Preparacion[];
  isOpen: boolean;
  onToggle: () => void;
  editingId: string | null;
  editingNombre: string;
  setEditingNombre: (v: string) => void;
  setEditingId: (v: string | null) => void;
  handleUpdateCat: () => void;
  setDeletingCat: (v: CategoriaPreparacion | null) => void;
  expandedId: string | null;
  setExpandedId: (v: string | null) => void;
  mutations: PreparacionMutations;
  setDeletingPrep: (v: Preparacion | null) => void;
  categorias: CategoriaPreparacion[] | undefined;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const isEditing = editingId === cat.id;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card ref={setNodeRef} style={style} className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                value={editingNombre}
                onChange={(e) => setEditingNombre(e.target.value)}
                className="h-7 w-48 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateCat();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdateCat}>
                <Check className="w-3.5 h-3.5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setEditingId(null)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <span className="font-semibold text-sm">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {items.length}
                  </Badge>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditingNombre(cat.name);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeletingCat(cat)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
        <CollapsibleContent>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin recetas en esta categoría
            </div>
          ) : (
            <div className="divide-y">
              {items.map((prep) => (
                <PrepRow
                  key={prep.id}
                  prep={prep}
                  isExpanded={expandedId === prep.id}
                  onToggle={() => setExpandedId(expandedId === prep.id ? null : prep.id)}
                  mutations={mutations}
                  onDelete={() => setDeletingPrep(prep)}
                  categorias={categorias}
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
