import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow, FormSection, StickyActions } from '@/components/ui/forms-pro';
import { DollarSign, Package } from 'lucide-react';
import { fmt, IVA } from './helpers';

import type { ItemCartaMutations } from './types';

type ItemType = 'simple' | 'combo';

interface ItemFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: any | null;
  categorias: any[] | undefined;
  cmvCats: any[];
  mutations: ItemCartaMutations;
}

export function ItemFormModal({ open, onOpenChange, item, categorias, cmvCats: _cmvCats, mutations }: ItemFormModalProps) {
  const [form, setForm] = useState<{
    nombre: string; short_name: string; descripcion: string; categoria_carta_id: string;
    rdo_category_code: string; precio_base: number; fc_objetivo: number; disponible_delivery: boolean;
    tipo: ItemType;
  }>({
    nombre: '', short_name: '', descripcion: '', categoria_carta_id: '',
    rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true,
    tipo: 'simple',
  });
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }));
  const isEdit = !!item;
  const navigate = useNavigate();

  useEffect(() => {
    if (item)
      setForm({
        nombre: item.name || item.nombre, short_name: item.short_name || '', descripcion: item.description || item.descripcion || '',
        categoria_carta_id: item.categoria_carta_id || '', rdo_category_code: item.rdo_category_code || '',
        precio_base: item.base_price || item.precio_base, fc_objetivo: item.fc_objetivo || 32,
        disponible_delivery: item.available_delivery ?? item.disponible_delivery ?? true,
        tipo: item.type === 'combo' ? 'combo' : 'simple',
      });
    else
      setForm({
        nombre: '', short_name: '', descripcion: '', categoria_carta_id: '',
        rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true,
        tipo: 'simple',
      });
  }, [item, open]);

  const submit = async () => {
    if (!form.nombre || !form.precio_base) return;
    // Backend espera `tipo` (se mapea a `menu_items.type`).
    // - 'combo' → enviamos explícito.
    // - 'simple' en edición: si el item ANTES era 'combo', enviamos null
    //   para desactivar combo; si era 'extra', no tocamos (preservamos).
    //   Si era simple, tampoco tocamos.
    // - 'simple' en creación: null (default).
    const previousType = item?.type as string | undefined;
    const tipoPayload = form.tipo === 'combo'
      ? 'combo'
      : isEdit
        ? previousType === 'combo' ? null : undefined
        : null;
    const p = {
      ...form,
      categoria_carta_id: form.categoria_carta_id || null,
      rdo_category_code: form.rdo_category_code || null,
      ...(tipoPayload !== undefined && { tipo: tipoPayload }),
    };
    if (isEdit) {
      await mutations.update.mutateAsync({ id: item.id, data: p });
    } else {
      // Fase 4: al crear, navegar al hub del producto en vez de solo cerrar.
      // `create.mutateAsync` devuelve el item creado; navegamos a su detalle.
      const created = await mutations.create.mutateAsync(p);
      onOpenChange(false);
      const createdId = (created as { id?: string } | null | undefined)?.id;
      if (createdId) {
        navigate(`/mimarca/productos/${createdId}`);
        return;
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} Item de Carta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormRow label="Tipo" hint="Un combo se arma con otros productos y calcula su costo automáticamente">
            <div className="grid grid-cols-2 gap-2">
              <TypeOption
                active={form.tipo === 'simple'}
                onClick={() => set('tipo', 'simple')}
                icon={<DollarSign className="w-4 h-4" />}
                label="Producto simple"
                description="Tiene receta y costo propio"
              />
              <TypeOption
                active={form.tipo === 'combo'}
                onClick={() => set('tipo', 'combo')}
                icon={<Package className="w-4 h-4" />}
                label="Combo"
                description="Se arma con otros productos"
              />
            </div>
          </FormRow>
          <FormRow label="Nombre" required>
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder={form.tipo === 'combo' ? 'Ej: Combo Familiar PY' : 'Ej: Argenta Burger'} />
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Nombre corto" hint="Para tickets">
              <Input value={form.short_name} onChange={(e) => set('short_name', e.target.value)} />
            </FormRow>
            <FormRow label="Categoría carta">
              <Select value={form.categoria_carta_id || 'none'} onValueChange={(v) => set('categoria_carta_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>
          <FormRow label="Descripción">
            <Textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} />
          </FormRow>
          <FormSection title="Precio y CMV" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Precio carta (con IVA)" required>
                <Input type="number" value={form.precio_base || ''} onChange={(e) => set('precio_base', Number(e.target.value))} />
              </FormRow>
              <FormRow label="CMV Objetivo (%)" hint="Meta de food cost">
                <Input type="number" value={form.fc_objetivo || ''} onChange={(e) => set('fc_objetivo', Number(e.target.value))} />
              </FormRow>
            </div>
            {form.precio_base > 0 && (
              <p className="text-xs text-muted-foreground">Precio neto (sin IVA): {fmt(form.precio_base / IVA)}</p>
            )}
          </FormSection>
          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton loading={mutations.create.isPending || mutations.update.isPending} onClick={submit} disabled={!form.nombre || !form.precio_base}>
              {isEdit ? 'Guardar' : 'Crear Item'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeOption({ active, onClick, icon, label, description }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors ${
        active
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="text-[11px] leading-tight">{description}</div>
    </button>
  );
}
