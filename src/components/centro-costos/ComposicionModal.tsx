import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormSection } from '@/components/ui/forms-pro';
import { Plus, Trash2, Save, Layers, Tag } from 'lucide-react';
import { useItemCartaComposicion } from '@/hooks/useItemsCarta';
import { useGruposOpcionales, useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';
import type { GrupoOpcional } from '@/hooks/useGruposOpcionales';
import { fmt, fmtPct, calcFC, fcColor, badgeVar } from './helpers';
import type { ComposicionRow, GrupoEditItem, ItemCartaMutations, GruposMutations } from './types';
import { useState as useStateReact, useEffect } from 'react';

interface ComposicionModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: any;
  preparaciones: any[];
  insumos: any[];
  mutations: ItemCartaMutations;
}

export function ComposicionModal({ open, onOpenChange, item, preparaciones, insumos, mutations }: ComposicionModalProps) {
  const { data: composicionActual } = useItemCartaComposicion(item?.id);
  const { data: grupos } = useGruposOpcionales(item?.id);
  const gruposMutations = useGruposOpcionalesMutations();
  const [rows, setRows] = useState<ComposicionRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [grupoNuevoNombre, setGrupoNuevoNombre] = useState('');
  const [showNewGrupo, setShowNewGrupo] = useState(false);

  useEffect(() => {
    if (composicionActual) {
      setRows(
        (composicionActual as any[]).map((c: any) => ({
          tipo: (c.preparacion_id ? 'preparacion' : 'insumo') as ComposicionRow['tipo'],
          preparacion_id: c.preparacion_id || '',
          insumo_id: c.insumo_id || '',
          quantity: c.quantity,
          _label: c.recipes?.name || c.supplies?.name || '',
          _costo: c.recipes?.calculated_cost || c.supplies?.base_unit_cost || 0,
        })),
      );
      setHasChanges(false);
    }
  }, [composicionActual]);

  const addRow = () => {
    setRows([...rows, { tipo: 'preparacion', preparacion_id: '', insumo_id: '', quantity: 1, _label: '', _costo: 0 }]);
    setHasChanges(true);
  };
  const removeRow = (i: number) => { setRows(rows.filter((_, idx) => idx !== i)); setHasChanges(true); };
  const updateRow = (i: number, field: string, value: string | number) => {
    const nr = [...rows];
    nr[i] = { ...nr[i], [field]: value };
    if (field === 'tipo') { nr[i].preparacion_id = ''; nr[i].insumo_id = ''; nr[i]._costo = 0; nr[i]._label = ''; }
    if (field === 'preparacion_id') { const p = preparaciones.find((x: any) => x.id === value); nr[i]._label = p?.name || ''; nr[i]._costo = p?.calculated_cost || 0; }
    if (field === 'insumo_id') { const ins = insumos.find((x: any) => x.id === value); nr[i]._label = ins?.name || ''; nr[i]._costo = ins?.base_unit_cost || 0; }
    setRows(nr);
    setHasChanges(true);
  };

  const costoFijo = rows.filter((r) => r.quantity > 0).reduce((t, r) => t + r.quantity * r._costo, 0);
  const costoGrupos = (grupos || []).reduce((t: number, g: any) => t + (g.average_cost || 0), 0);
  const costoTotal = costoFijo + costoGrupos;

  const handleSave = async () => {
    await mutations.saveComposicion.mutateAsync({
      item_carta_id: item.id,
      items: rows.filter((r) => r.preparacion_id || r.insumo_id).map((r) => ({
        preparacion_id: r.tipo === 'preparacion' ? r.preparacion_id : undefined,
        insumo_id: r.tipo === 'insumo' ? r.insumo_id : undefined,
        cantidad: r.quantity,
      })),
    });
    setHasChanges(false);
  };

  const handleCreateGrupo = async () => {
    if (!grupoNuevoNombre.trim()) return;
    await gruposMutations.createGrupo.mutateAsync({ item_carta_id: item.id, nombre: grupoNuevoNombre.trim(), orden: grupos?.length || 0 });
    setGrupoNuevoNombre('');
    setShowNewGrupo(false);
  };

  const renderInsumoSelect = (row: ComposicionRow, i: number) => {
    const productos = insumos.filter((x: any) => x.item_type === 'producto');
    const ingredientes = insumos.filter((x: any) => x.item_type === 'ingrediente');
    const insumosItems = insumos.filter((x: any) => x.item_type === 'insumo' || !x.item_type);
    return (
      <Select value={row.insumo_id || 'none'} onValueChange={(v) => updateRow(i, 'insumo_id', v === 'none' ? '' : v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Seleccionar...</SelectItem>
          {productos.length > 0 && (<><SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>{productos.map((ins: any) => (<SelectItem key={ins.id} value={ins.id}>{ins.name} ({fmt(ins.base_unit_cost || 0)})</SelectItem>))}</>)}
          {ingredientes.length > 0 && (<><SelectItem value="__h_ing" disabled className="text-xs font-semibold text-muted-foreground">── Ingredientes ──</SelectItem>{ingredientes.map((ins: any) => (<SelectItem key={ins.id} value={ins.id}>{ins.name} ({fmt(ins.base_unit_cost || 0)})</SelectItem>))}</>)}
          {insumosItems.length > 0 && (<><SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>{insumosItems.map((ins: any) => (<SelectItem key={ins.id} value={ins.id}>{ins.name} ({fmt(ins.base_unit_cost || 0)})</SelectItem>))}</>)}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Composición: {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormSection title="Composición" icon={Layers}>
            {rows.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground border rounded-lg text-sm">Sin componentes</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
                  <span className="w-[100px] shrink-0">Tipo</span><span className="flex-1">Componente</span>
                  <span className="w-16 shrink-0 text-right">Cant.</span><span className="w-20 shrink-0 text-right">Subtotal</span><span className="w-6 shrink-0" />
                </div>
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2">
                    <Select value={row.tipo} onValueChange={(v) => updateRow(i, 'tipo', v)}>
                      <SelectTrigger className="h-7 w-[100px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="preparacion">Receta</SelectItem><SelectItem value="insumo">Catálogo</SelectItem></SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0">
                      {row.tipo === 'preparacion' ? (
                        <Select value={row.preparacion_id || 'none'} onValueChange={(v) => updateRow(i, 'preparacion_id', v === 'none' ? '' : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar...</SelectItem>
                            {preparaciones.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name} ({fmt(p.calculated_cost || 0)})</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : renderInsumoSelect(row, i)}
                    </div>
                    <Input type="number" className="h-7 w-16 text-xs shrink-0" value={row.quantity} onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))} />
                    <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">{fmt(row.quantity * row._costo)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRow(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={addRow} className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Agregar Componente</Button>
          </FormSection>

          <FormSection title="Grupos Opcionales" icon={Tag}>
            <p className="text-xs text-muted-foreground mb-2">Para componentes variables (ej: bebida).</p>
            {(grupos || []).map((grupo: any) => (
              <GrupoEditor key={grupo.id} grupo={grupo} itemId={item.id} insumos={insumos} preparaciones={preparaciones} mutations={gruposMutations} />
            ))}
            {showNewGrupo ? (
              <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg">
                <Input value={grupoNuevoNombre} onChange={(e) => setGrupoNuevoNombre(e.target.value)} placeholder="Nombre del grupo (ej: Bebida)" className="text-sm h-8" onKeyDown={(e) => e.key === 'Enter' && handleCreateGrupo()} />
                <Button size="sm" className="h-8" onClick={handleCreateGrupo} disabled={!grupoNuevoNombre.trim() || gruposMutations.createGrupo.isPending}>Crear</Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowNewGrupo(false); setGrupoNuevoNombre(''); }}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowNewGrupo(true)} className="w-full"><Plus className="w-4 h-4 mr-2" /> Agregar Grupo Opcional</Button>
            )}
          </FormSection>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Comp. fija:</span><span className="font-mono">{fmt(costoFijo)}</span></div>
              {costoGrupos > 0 && (<div className="flex justify-between"><span className="text-muted-foreground">Grupos (prom.):</span><span className="font-mono">{fmt(costoGrupos)}</span></div>)}
              <div className="flex justify-between items-center pt-2 border-t">
                <div><p className="text-sm text-muted-foreground">Costo Total</p><p className="text-2xl font-bold font-mono text-primary">{fmt(costoTotal)}</p></div>
                {item.base_price > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">FC% (s/neto)</p>
                    <Badge variant={badgeVar[fcColor(calcFC(costoTotal, item.base_price), item.fc_objetivo || 32)]} className="text-lg px-3 py-1">
                      {fmtPct(calcFC(costoTotal, item.base_price))}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{hasChanges ? 'Cancelar' : 'Cerrar'}</Button>
            {hasChanges && (<LoadingButton loading={mutations.saveComposicion.isPending} onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Guardar Composición</LoadingButton>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GrupoEditor({ grupo, itemId, insumos, preparaciones, mutations }: {
  grupo: GrupoOpcional; itemId: string; insumos: any[]; preparaciones: any[]; mutations: GruposMutations;
}) {
  const [editItems, setEditItems] = useStateReact<GrupoEditItem[]>([]);
  const [editing, setEditing] = useStateReact(false);
  const [nombre, setNombre] = useStateReact(grupo.name);

  useEffect(() => {
    if (grupo.items)
      setEditItems(grupo.items.map((gi: any) => ({
        tipo: (gi.preparacion_id ? 'preparacion' : 'insumo') as GrupoEditItem['tipo'],
        insumo_id: gi.insumo_id || '', preparacion_id: gi.preparacion_id || '', quantity: gi.quantity,
        costo_unitario: gi.unit_cost || gi.supplies?.base_unit_cost || gi.recipes?.calculated_cost || 0,
        _nombre: gi.supplies?.name || gi.recipes?.name || '',
      })));
  }, [grupo.items]);

  const addItem = () => {
    setEditItems([...editItems, { tipo: 'insumo', insumo_id: '', preparacion_id: '', cantidad: 1, costo_unitario: 0, _nombre: '' }]);
    setEditing(true);
  };
  const updateItem = (i: number, field: string, value: string | number) => {
    const next = [...editItems];
    next[i] = { ...next[i], [field]: value };
    if (field === 'tipo') { next[i].insumo_id = ''; next[i].preparacion_id = ''; next[i].costo_unitario = 0; next[i]._nombre = ''; }
    if (field === 'insumo_id') { const ins = insumos.find((x: any) => x.id === value); next[i].costo_unitario = ins?.base_unit_cost || 0; next[i]._nombre = ins?.name || ''; }
    if (field === 'preparacion_id') { const p = preparaciones.find((x: any) => x.id === value); next[i].costo_unitario = p?.calculated_cost || 0; next[i]._nombre = p?.name || ''; }
    setEditItems(next);
    setEditing(true);
  };
  const removeItem = (i: number) => { setEditItems(editItems.filter((_, idx) => idx !== i)); setEditing(true); };
  const promedio = editItems.length > 0 ? editItems.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0) / editItems.length : 0;

  const handleSave = async () => {
    if (nombre !== grupo.name) await mutations.updateGrupo.mutateAsync({ id: grupo.id, item_carta_id: itemId, data: { name: nombre } });
    await mutations.saveGrupoItems.mutateAsync({
      grupo_id: grupo.id, item_carta_id: itemId,
      items: editItems.filter((i) => i.insumo_id || i.preparacion_id).map((i) => ({
        insumo_id: i.tipo === 'insumo' ? i.insumo_id : null, preparacion_id: i.tipo === 'preparacion' ? i.preparacion_id : null,
        cantidad: i.cantidad, costo_unitario: i.costo_unitario,
      })),
    });
    setEditing(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Grupo</Badge>
          <Input value={nombre} onChange={(e) => { setNombre(e.target.value); setEditing(true); }} className="h-7 text-sm font-medium w-40" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Prom:</span>
          <span className="font-mono text-sm font-semibold">{fmt(promedio)}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => mutations.deleteGrupo.mutate({ id: grupo.id, item_carta_id: itemId })}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {editItems.map((ei, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs pl-4">
          <Select value={ei.tipo} onValueChange={(v) => updateItem(i, 'tipo', v)}>
            <SelectTrigger className="h-6 w-[80px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="insumo">Catálogo</SelectItem><SelectItem value="preparacion">Receta</SelectItem></SelectContent>
          </Select>
          <div className="flex-1 min-w-0">
            {ei.tipo === 'insumo' ? (() => {
              const selectedIds = editItems.filter((_, idx) => idx !== i).map((x) => x.insumo_id).filter(Boolean);
              const available = insumos.filter((x: any) => (x.item_type === 'insumo' || x.item_type === 'producto') && !selectedIds.includes(x.id));
              const productos = available.filter((x: any) => x.item_type === 'producto');
              const otros = available.filter((x: any) => x.item_type !== 'producto');
              return (
                <Select value={ei.insumo_id || 'none'} onValueChange={(v) => updateItem(i, 'insumo_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {productos.length > 0 && (<><SelectItem value="__h_prod" disabled className="text-xs font-semibold text-muted-foreground">── Productos ──</SelectItem>{productos.map((ins: any) => (<SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>))}</>)}
                    {otros.length > 0 && (<><SelectItem value="__h_ins" disabled className="text-xs font-semibold text-muted-foreground">── Insumos ──</SelectItem>{otros.map((ins: any) => (<SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>))}</>)}
                  </SelectContent>
                </Select>
              );
            })() : (() => {
              const selectedIds = editItems.filter((_, idx) => idx !== i).map((x) => x.preparacion_id).filter(Boolean);
              return (
                <Select value={ei.preparacion_id || 'none'} onValueChange={(v) => updateItem(i, 'preparacion_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {preparaciones.filter((p: any) => !selectedIds.includes(p.id)).map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
          <Input type="number" className="h-6 w-14 text-xs" value={ei.cantidad} onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value))} />
          <span className="font-mono text-xs w-16 text-right">{fmt(ei.cantidad * ei.costo_unitario)}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
        </div>
      ))}
      <div className="flex items-center gap-2 pl-4">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Agregar opción</Button>
        {editing && (<Button size="sm" className="h-6 text-xs ml-auto" onClick={handleSave} disabled={mutations.saveGrupoItems.isPending}><Save className="w-3 h-3 mr-1" /> Guardar</Button>)}
      </div>
    </div>
  );
}
