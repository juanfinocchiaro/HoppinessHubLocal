import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, GripVertical, Check, X, ChefHat, Ticket, Ban } from 'lucide-react';
import { useMenuCategorias, useMenuCategoriaMutations } from '@/hooks/useMenu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

type TipoImpresion = 'comanda' | 'vale' | 'no_imprimir';

const TIPO_IMPRESION_OPTIONS: {
  value: TipoImpresion;
  label: string;
  icon: typeof ChefHat;
  color: string;
}[] = [
  { value: 'comanda', label: 'Comanda', icon: ChefHat, color: 'text-orange-600 bg-orange-50' },
  { value: 'vale', label: 'Vale', icon: Ticket, color: 'text-blue-600 bg-blue-50' },
  {
    value: 'no_imprimir',
    label: 'No imprimir',
    icon: Ban,
    color: 'text-muted-foreground bg-muted',
  },
];

function TipoImpresionBadge({ tipo }: { tipo: TipoImpresion }) {
  const opt = TIPO_IMPRESION_OPTIONS.find((o) => o.value === tipo) || TIPO_IMPRESION_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}
    >
      <Icon className="w-3 h-3" />
      {opt.label}
    </span>
  );
}

interface SortableCategoryProps {
  cat: any;
  editingId: string | null;
  editingNombre: string;
  editingTipoImpresion: TipoImpresion;
  setEditingNombre: (v: string) => void;
  setEditingTipoImpresion: (v: TipoImpresion) => void;
  setEditingId: (v: string | null) => void;
  handleUpdate: () => void;
  handleTipoChange: (id: string, tipo: TipoImpresion) => void;
  setDeleting: (v: any) => void;
}

function SortableCategory({
  cat,
  editingId,
  editingNombre,
  editingTipoImpresion,
  setEditingNombre,
  setEditingTipoImpresion,
  setEditingId,
  handleUpdate,
  handleTipoChange: _handleTipoChange,
  setDeleting,
}: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {editingId === cat.id ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingNombre}
                onChange={(e) => setEditingNombre(e.target.value)}
                className="w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
              <Select
                value={editingTipoImpresion}
                onValueChange={(v) => setEditingTipoImpresion(v as TipoImpresion)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_IMPRESION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={handleUpdate}>
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-medium">{cat.name}</span>
              <TipoImpresionBadge tipo={cat.print_type || 'comanda'} />
            </>
          )}
        </div>
        {editingId !== cat.id && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(cat.id);
                setEditingNombre(cat.name);
                setEditingTipoImpresion(cat.print_type || 'comanda');
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(cat)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CategoriasCartaPage() {
  const { data: categorias, isLoading } = useMenuCategorias();
  const { create, update, reorder, softDelete } = useMenuCategoriaMutations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingTipoImpresion, setEditingTipoImpresion] = useState<TipoImpresion>('comanda');
  const [newNombre, setNewNombre] = useState('');
  const [newTipoImpresion, setNewTipoImpresion] = useState<TipoImpresion>('comanda');
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleCreate = async () => {
    if (!newNombre.trim()) return;
    await create.mutateAsync({
      name: newNombre.trim(),
      sort_order: (categorias?.length || 0) + 1,
      print_type: newTipoImpresion,
    } as any);
    setNewNombre('');
    setNewTipoImpresion('comanda');
    setShowNew(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !editingNombre.trim()) return;
    await update.mutateAsync({
      id: editingId,
      data: { name: editingNombre.trim(), print_type: editingTipoImpresion } as any,
    });
    setEditingId(null);
  };

  const handleTipoChange = async (id: string, tipo: TipoImpresion) => {
    await update.mutateAsync({ id, data: { print_type: tipo } as any });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categorias) return;

    const oldIndex = categorias.findIndex((c: any) => c.id === active.id);
    const newIndex = categorias.findIndex((c: any) => c.id === over.id);
    const reordered = arrayMove(categorias, oldIndex, newIndex);

    await reorder.mutateAsync(reordered.map((c: any, i: number) => ({ id: c.id, orden: i + 1 })));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Categorías de la Carta"
          subtitle="Organización del menú para los clientes"
        />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías de la Carta"
        subtitle="Organización del menú para los clientes"
      />

      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
        </Button>
      </div>

      {showNew && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Input
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setShowNew(false);
                  setNewNombre('');
                }
              }}
            />
            <Select
              value={newTipoImpresion}
              onValueChange={(v) => setNewTipoImpresion(v as TipoImpresion)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_IMPRESION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newNombre.trim() || create.isPending}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNew(false);
                setNewNombre('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {(!categorias || categorias.length === 0) && !showNew ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              icon={GripVertical}
              title="Sin categorías"
              description="Creá categorías para organizar la carta"
            />
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={categorias?.map((c: any) => c.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categorias?.map((cat: any) => (
                <SortableCategory
                  key={cat.id}
                  cat={cat}
                  editingId={editingId}
                  editingNombre={editingNombre}
                  editingTipoImpresion={editingTipoImpresion}
                  setEditingNombre={setEditingNombre}
                  setEditingTipoImpresion={setEditingTipoImpresion}
                  setEditingId={setEditingId}
                  handleUpdate={handleUpdate}
                  handleTipoChange={handleTipoChange}
                  setDeleting={setDeleting}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar categoría"
        description={`¿Eliminar "${deleting?.name}"? Los items de esta categoría quedarán sin categoría.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await softDelete.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
