import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChefHat, Check, X } from 'lucide-react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { usePreparaciones, usePreparacionMutations } from '@/hooks/usePreparaciones';
import {
  useCategoriasPreparacion,
  useCategoriaPreparacionMutations,
} from '@/hooks/useCategoriasPreparacion';

import { PrepRow } from './preparaciones/PrepRow';
import { SortableCategoryCard } from './preparaciones/SortableCategoryCard';
import { PreparacionFullModal } from './preparaciones/PreparacionFullModal';
import type { Preparacion, CategoriaPreparacion } from './preparaciones/types';

export default function PreparacionesPage() {
  const { data: preparaciones, isLoading: loadingPreps } = usePreparaciones();
  const { data: categorias, isLoading: loadingCats } = useCategoriasPreparacion();
  const mutations = usePreparacionMutations();
  const catMutations = useCategoriaPreparacionMutations();

  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPrep, setDeletingPrep] = useState<Preparacion | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatNombre, setEditingCatNombre] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatNombre, setNewCatNombre] = useState('');
  const [deletingCat, setDeletingCat] = useState<CategoriaPreparacion | null>(null);

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

  const filteredPreps = useMemo(() => {
    return (
      preparaciones?.filter((p) => {
        if (!search) return true;
        return p.name.toLowerCase().includes(search.toLowerCase());
      }) || []
    );
  }, [preparaciones, search]);

  const prepsByCategory = useMemo(() => {
    const map: Record<string, Preparacion[]> = {};
    for (const p of filteredPreps) {
      const catId = p.categoria_preparacion_id || 'sin-categoria';
      if (!map[catId]) map[catId] = [];
      map[catId].push(p);
    }
    return map;
  }, [filteredPreps]);

  const uncategorized = prepsByCategory['sin-categoria'] || [];
  const isLoading = loadingPreps || loadingCats;

  const handleCreateCat = async () => {
    if (!newCatNombre.trim()) return;
    await catMutations.create.mutateAsync({
      nombre: newCatNombre.trim(),
      orden: (categorias?.length || 0) + 1,
    });
    setNewCatNombre('');
    setShowNewCat(false);
  };

  const handleUpdateCat = async () => {
    if (!editingCatId || !editingCatNombre.trim()) return;
    await catMutations.update.mutateAsync({
      id: editingCatId,
      data: { name: editingCatNombre.trim() },
    });
    setEditingCatId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categorias) return;
    const oldIndex = categorias.findIndex((c) => c.id === active.id);
    const newIndex = categorias.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categorias, oldIndex, newIndex);
    await catMutations.reorder.mutateAsync(
      reordered.map((c: any, i) => ({ id: c.id, orden: i + 1 })),
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Recetas" subtitle="Fichas técnicas de lo que se prepara en la cocina" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetas"
        subtitle="Fichas técnicas de lo que se prepara en la cocina"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewCat(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Categoría
            </Button>
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Nueva Receta
            </Button>
          </div>
        }
      />

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar receta..."
      />

      {showNewCat && (
        <Card className="border-dashed border-primary/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Input
              value={newCatNombre}
              onChange={(e) => setNewCatNombre(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCat();
                if (e.key === 'Escape') {
                  setShowNewCat(false);
                  setNewCatNombre('');
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleCreateCat}
              disabled={!newCatNombre.trim() || catMutations.create.isPending}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewCat(false);
                setNewCatNombre('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {(!categorias || categorias.length === 0) && filteredPreps.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              icon={ChefHat}
              title="Sin recetas"
              description="Creá una receta para empezar a definir fichas técnicas"
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
              {categorias?.map((cat) => (
                <SortableCategoryCard
                  key={cat.id}
                  cat={cat}
                  items={prepsByCategory[cat.id] || []}
                  isOpen={!collapsedCats.has(cat.id)}
                  onToggle={() => toggleCat(cat.id)}
                  editingId={editingCatId}
                  editingNombre={editingCatNombre}
                  setEditingNombre={setEditingCatNombre}
                  setEditingId={setEditingCatId}
                  handleUpdateCat={handleUpdateCat}
                  setDeletingCat={setDeletingCat}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  mutations={mutations}
                  setDeletingPrep={setDeletingPrep}
                  categorias={categorias}
                />
              ))}

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
                    {uncategorized.map((prep) => (
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
                </Card>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isCreating && (
        <PreparacionFullModal
          open={isCreating}
          onOpenChange={(v) => {
            if (!v) setIsCreating(false);
          }}
          preparacion={null}
          mutations={mutations}
          categorias={categorias || []}
        />
      )}

      <ConfirmDialog
        open={!!deletingPrep}
        onOpenChange={() => setDeletingPrep(null)}
        title="Eliminar preparación"
        description={`¿Eliminar "${deletingPrep?.name}"? Los items de carta que la usen perderán su referencia a esta receta.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await mutations.softDelete.mutateAsync(deletingPrep!.id);
          setDeletingPrep(null);
        }}
      />

      <ConfirmDialog
        open={!!deletingCat}
        onOpenChange={() => setDeletingCat(null)}
        title="Eliminar categoría"
        description={`¿Eliminar "${deletingCat?.name}"? Las recetas quedarán sin categoría.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await catMutations.softDelete.mutateAsync(deletingCat!.id);
          setDeletingCat(null);
        }}
      />
    </div>
  );
}
