import { useState, useMemo } from 'react';
// Tables type removed - using any for renamed tables
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Calculator,
} from 'lucide-react';
import { ProductPreviewPanel } from '@/components/menu/ProductPreviewPanel';
import { TipoImpresionBadge, TIPO_IMPRESION_OPTIONS, type TipoImpresion } from '@/components/menu/TipoImpresionBadge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { useMenuCategorias, useMenuCategoriaMutations } from '@/hooks/useMenu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { formatCurrency } from '@/lib/formatters';

type MenuCategoria = any;
type ItemCarta = any;



/* ─── Sortable category card ─── */
interface SortableCatProps {
  cat: MenuCategoria;
  items: ItemCarta[];
  isOpen: boolean;
  onToggle: () => void;
  editingId: string | null;
  editingNombre: string;
  editingTipoImpresion: TipoImpresion;
  setEditingNombre: (v: string) => void;
  setEditingTipoImpresion: (v: TipoImpresion) => void;
  setEditingId: (v: string | null) => void;
  handleUpdate: () => void;
  setDeleting: (v: MenuCategoria | null) => void;
  onToggleVisibility: (cat: MenuCategoria) => void;
  expandedItemId: string | null;
  setExpandedItemId: (id: string | null) => void;
}

function SortableCategoryCard({
  cat,
  items,
  isOpen,
  onToggle,
  editingId,
  editingNombre,
  editingTipoImpresion,
  setEditingNombre,
  setEditingTipoImpresion,
  setEditingId,
  handleUpdate,
  setDeleting,
  onToggleVisibility,
  expandedItemId,
  setExpandedItemId,
}: SortableCatProps) {
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
          {/* Drag handle */}
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
                  if (e.key === 'Enter') handleUpdate();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
              <Select
                value={editingTipoImpresion}
                onValueChange={(v) => setEditingTipoImpresion(v as TipoImpresion)}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_IMPRESION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdate}>
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
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </Badge>
                  <TipoImpresionBadge tipo={cat.print_type} />
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
                  title={cat.is_visible_menu === false ? 'Mostrar en Carta' : 'Ocultar de Carta'}
                  onClick={() => onToggleVisibility(cat)}
                >
                  {cat.is_visible_menu === false ? (
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditingNombre(cat.name);
                    setEditingTipoImpresion((cat.print_type as TipoImpresion) || 'comanda');
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeleting(cat)}
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
              Sin items en esta categoría
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => {
                const isItemExpanded = expandedItemId === item.id;
                return (
                  <div key={item.id}>
                    <div
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${isItemExpanded ? 'bg-muted/20' : ''}`}
                      onClick={() => setExpandedItemId(isItemExpanded ? null : item.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[350px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-medium text-sm">
                          {formatCurrency(item.base_price)}
                        </span>
                        {item.fc_actual != null && (
                          <Badge
                            variant={
                              item.fc_actual <= 32
                                ? 'default'
                                : item.fc_actual <= 40
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-xs"
                          >
                            FC {item.fc_actual.toFixed(1)}%
                          </Badge>
                        )}
                        {item.disponible_delivery && (
                          <Badge variant="outline" className="text-xs">
                            Delivery
                          </Badge>
                        )}
                        {item.image_url && <span className="text-xs">📷</span>}
                      </div>
                    </div>
                    {isItemExpanded && <ProductPreviewPanel item={item} />}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ─── Main page ─── */
export default function MenuCartaPage() {
  const { data: items, isLoading: loadingItems } = useItemsCarta();
  const { data: categorias, isLoading: loadingCats } = useMenuCategorias();
  const { create, update, reorder, softDelete, toggleVisibility } = useMenuCategoriaMutations();

  const [search, setSearch] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Category inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingTipoImpresion, setEditingTipoImpresion] = useState<TipoImpresion>('comanda');
  const [showNew, setShowNew] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newTipoImpresion, setNewTipoImpresion] = useState<TipoImpresion>('comanda');
  const [deleting, setDeleting] = useState<MenuCategoria | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleCat = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const map: Record<string, ItemCarta[]> = {};
    const filtered = (items || []).filter((item) => {
      if (!search) return true;
      return item.name.toLowerCase().includes(search.toLowerCase());
    });
    for (const item of filtered) {
      const catId = item.categoria_carta_id || 'sin-categoria';
      if (!map[catId]) map[catId] = [];
      map[catId].push(item);
    }
    return map;
  }, [items, search]);

  const uncategorized = itemsByCategory['sin-categoria'] || [];
  const isLoading = loadingItems || loadingCats;

  const handleCreate = async () => {
    if (!newNombre.trim()) return;
    await create.mutateAsync({
      name: newNombre.trim(),
      sort_order: (categorias?.length || 0) + 1,
      print_type: newTipoImpresion,
    } as Parameters<typeof create.mutateAsync>[0]);
    setNewNombre('');
    setNewTipoImpresion('comanda');
    setShowNew(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !editingNombre.trim()) return;
    await update.mutateAsync({
      id: editingId,
      data: { name: editingNombre.trim(), print_type: editingTipoImpresion },
    } as Parameters<typeof update.mutateAsync>[0]);
    setEditingId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categorias) return;
    const oldIndex = categorias.findIndex((c) => c.id === active.id);
    const newIndex = categorias.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categorias, oldIndex, newIndex);
    await reorder.mutateAsync(reordered.map((c: any, i) => ({ id: c.id, sort_order: i + 1 })));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Items de Venta" subtitle="Lo que ve y compra el cliente" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items de Venta"
        subtitle="Lo que ve y compra el cliente · Para editar, usá el Centro de Costos"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/mimarca/centro-costos">
              <Button variant="outline" size="sm">
                <Calculator className="w-4 h-4 mr-1.5" /> Ir a Control de Costos
              </Button>
            </Link>
            <Button onClick={() => setShowNew(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Nueva Categoría
            </Button>
          </div>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar item..."
      />

      {/* New category inline form */}
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
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_IMPRESION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
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

      {(!categorias || categorias.length === 0) && uncategorized.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              icon={BookOpen}
              title="Carta vacía"
              description="Creá categorías y items desde el Centro de Costos"
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
            items={categorias?.map((c) => c.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {categorias
                ?.filter((cat) => cat.is_visible_menu !== false)
                .map((cat) => (
                  <SortableCategoryCard
                    key={cat.id}
                    cat={cat}
                    items={itemsByCategory[cat.id] || []}
                    isOpen={!collapsedCats.has(cat.id)}
                    onToggle={() => toggleCat(cat.id)}
                    editingId={editingId}
                    editingNombre={editingNombre}
                    editingTipoImpresion={editingTipoImpresion}
                    setEditingNombre={setEditingNombre}
                    setEditingTipoImpresion={setEditingTipoImpresion}
                    setEditingId={setEditingId}
                    handleUpdate={handleUpdate}
                    setDeleting={setDeleting}
                    onToggleVisibility={(c) =>
                      toggleVisibility.mutate({ id: c.id, visible: c.is_visible_menu === false })
                    }
                    expandedItemId={expandedItemId}
                    setExpandedItemId={setExpandedItemId}
                  />
                ))}

              {/* Hidden categories section */}
              {categorias?.some((cat) => cat.is_visible_menu === false) && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" /> Categorías ocultas
                  </p>
                  <div className="space-y-2">
                    {categorias
                      ?.filter((cat) => cat.is_visible_menu === false)
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-dashed"
                        >
                          <span className="text-sm text-muted-foreground">{cat.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(itemsByCategory[cat.id] || []).length} items
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-7 text-xs"
                            onClick={() => toggleVisibility.mutate({ id: cat.id, visible: true })}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Mostrar
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {uncategorized.length > 0 && (
                <Card className="overflow-hidden border-dashed">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b">
                    <span className="font-semibold text-sm text-muted-foreground">
                      Sin categoría
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {uncategorized.length}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {uncategorized.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3">
                        <p className="font-medium text-sm">{item.name}</p>
                        <span className="font-mono font-medium text-sm">
                          {formatCurrency(item.base_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        title="Eliminar categoría"
        description={`¿Eliminar "${deleting?.name}"? Los items quedarán sin categoría.`}
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
