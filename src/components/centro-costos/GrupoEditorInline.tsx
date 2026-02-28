import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Save } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { GrupoOpcional, GrupoOpcionalItem } from '@/hooks/useGruposOpcionales';
import type { useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';
import { formatCurrency } from '@/lib/formatters';

type GrupoMutations = ReturnType<typeof useGruposOpcionalesMutations>;

interface GrupoEditItem {
  tipo: string;
  insumo_id: string;
  preparacion_id: string;
  cantidad: number;
  costo_unitario: number;
  _nombre: string;
}

export function GrupoEditorInline({ grupo, itemId, insumos, preparaciones, mutations }: {
  grupo: GrupoOpcional;
  itemId: string;
  insumos: Tables<'insumos'>[];
  preparaciones: Tables<'preparaciones'>[];
  mutations: GrupoMutations;
}) {
  const [editItems, setEditItems] = useState<GrupoEditItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);

  useEffect(() => {
    if (grupo.items)
      setEditItems(
        grupo.items.map((gi: GrupoOpcionalItem) => ({
          tipo: gi.preparacion_id ? 'preparacion' : 'insumo',
          insumo_id: gi.insumo_id || '',
          preparacion_id: gi.preparacion_id || '',
          cantidad: gi.cantidad,
          costo_unitario:
            gi.costo_unitario ||
            gi.insumos?.costo_por_unidad_base ||
            gi.preparaciones?.costo_calculado ||
            0,
          _nombre: gi.insumos?.nombre || gi.preparaciones?.nombre || '',
        })),
      );
  }, [grupo.items]);

  const addItem = () => {
    setEditItems([
      ...editItems,
      {
        tipo: 'insumo',
        insumo_id: '',
        preparacion_id: '',
        cantidad: 1,
        costo_unitario: 0,
        _nombre: '',
      },
    ]);
    setEditing(true);
  };
  const updateItem = (i: number, field: string, value: string | number) => {
    const next = [...editItems];
    next[i] = { ...next[i], [field]: value };
    if (field === 'tipo') {
      next[i].insumo_id = '';
      next[i].preparacion_id = '';
      next[i].costo_unitario = 0;
      next[i]._nombre = '';
    }
    if (field === 'insumo_id') {
      const ins = insumos.find((x: Tables<'insumos'>) => x.id === value);
      next[i].costo_unitario = ins?.costo_por_unidad_base || 0;
      next[i]._nombre = ins?.nombre || '';
    }
    if (field === 'preparacion_id') {
      const p = preparaciones.find((x: Tables<'preparaciones'>) => x.id === value);
      next[i].costo_unitario = p?.costo_calculado || 0;
      next[i]._nombre = p?.nombre || '';
    }
    setEditItems(next);
    setEditing(true);
  };
  const removeItem = (i: number) => {
    setEditItems(editItems.filter((_, idx) => idx !== i));
    setEditing(true);
  };
  const promedio =
    editItems.length > 0
      ? editItems.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) / editItems.length
      : 0;

  const handleSave = async () => {
    if (nombre !== grupo.nombre)
      await mutations.updateGrupo.mutateAsync({
        id: grupo.id,
        item_carta_id: itemId,
        data: { nombre },
      });
    await mutations.saveGrupoItems.mutateAsync({
      grupo_id: grupo.id,
      item_carta_id: itemId,
      items: editItems
        .filter((i) => i.insumo_id || i.preparacion_id)
        .map((i) => ({
          insumo_id: i.tipo === 'insumo' ? i.insumo_id : null,
          preparacion_id: i.tipo === 'preparacion' ? i.preparacion_id : null,
          cantidad: i.cantidad,
          costo_unitario: i.costo_unitario,
        })),
    });
    setEditing(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Grupo
          </Badge>
          <Input
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setEditing(true);
            }}
            className="h-7 text-sm font-medium w-40"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Prom:</span>
          <span className="font-mono text-sm font-semibold">{formatCurrency(promedio)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-2"
            onClick={() => mutations.deleteGrupo.mutate({ id: grupo.id, item_carta_id: itemId })}
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {editItems.map((ei, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs pl-4">
          <Select value={ei.tipo} onValueChange={(v) => updateItem(i, 'tipo', v)}>
            <SelectTrigger className="h-6 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="insumo">Catálogo</SelectItem>
              <SelectItem value="preparacion">Receta</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 min-w-0">
            {ei.tipo === 'insumo'
              ? (() => {
                  const selectedIds = editItems
                    .filter((_, idx) => idx !== i)
                    .map((x) => x.insumo_id)
                    .filter(Boolean);
                  const available = insumos.filter(
                    (x: Tables<'insumos'>) =>
                      (x.tipo_item === 'insumo' || x.tipo_item === 'producto') &&
                      !selectedIds.includes(x.id),
                  );
                  const productos = available.filter((x: Tables<'insumos'>) => x.tipo_item === 'producto');
                  const otros = available.filter((x: Tables<'insumos'>) => x.tipo_item !== 'producto');
                  return (
                    <Select
                      value={ei.insumo_id || 'none'}
                      onValueChange={(v) => updateItem(i, 'insumo_id', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {productos.length > 0 && (
                          <>
                            <SelectItem
                              value="__h_prod"
                              disabled
                              className="text-xs font-semibold text-muted-foreground"
                            >
                              ── Productos ──
                            </SelectItem>
                            {productos.map((ins: Tables<'insumos'>) => (
                              <SelectItem key={ins.id} value={ins.id}>
                                {ins.nombre}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {otros.length > 0 && (
                          <>
                            <SelectItem
                              value="__h_ins"
                              disabled
                              className="text-xs font-semibold text-muted-foreground"
                            >
                              ── Insumos ──
                            </SelectItem>
                            {otros.map((ins: Tables<'insumos'>) => (
                              <SelectItem key={ins.id} value={ins.id}>
                                {ins.nombre}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  );
                })()
              : (() => {
                  const selectedIds = editItems
                    .filter((_, idx) => idx !== i)
                    .map((x) => x.preparacion_id)
                    .filter(Boolean);
                  return (
                    <Select
                      value={ei.preparacion_id || 'none'}
                      onValueChange={(v) => updateItem(i, 'preparacion_id', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {preparaciones
                          .filter((p: Tables<'preparaciones'>) => !selectedIds.includes(p.id))
                          .map((p: Tables<'preparaciones'>) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
          </div>
          <Input
            type="number"
            className="h-6 w-14 text-xs"
            value={ei.cantidad}
            onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))}
          />
          <span className="font-mono text-xs w-16 text-right">
            {formatCurrency(ei.cantidad * ei.costo_unitario)}
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(i)}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2 pl-4">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}>
          <Plus className="w-3 h-3 mr-1" /> Agregar opción
        </Button>
        {editing && (
          <Button
            size="sm"
            className="h-6 text-xs ml-auto"
            onClick={handleSave}
            disabled={mutations.saveGrupoItems.isPending}
          >
            <Save className="w-3 h-3 mr-1" /> Guardar
          </Button>
        )}
      </div>
    </div>
  );
}
