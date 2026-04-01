import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow, FormSection, StickyActions } from '@/components/ui/forms-pro';
import { DollarSign } from 'lucide-react';
import { fmt, IVA } from './helpers';

import type { ItemCartaMutations } from './types';

interface ItemFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: any | null;
  categorias: any[] | undefined;
  cmvCats: any[];
  mutations: ItemCartaMutations;
}

export function ItemFormModal({ open, onOpenChange, item, categorias, cmvCats: _cmvCats, mutations }: ItemFormModalProps) {
  const [form, setForm] = useState({
    nombre: '', short_name: '', descripcion: '', categoria_carta_id: '',
    rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true,
  });
  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));
  const isEdit = !!item;

  useEffect(() => {
    if (item)
      setForm({
        nombre: item.name || item.nombre, short_name: item.short_name || '', descripcion: item.description || item.descripcion || '',
        categoria_carta_id: item.categoria_carta_id || '', rdo_category_code: item.rdo_category_code || '',
        precio_base: item.base_price || item.precio_base, fc_objetivo: item.fc_objetivo || 32,
        disponible_delivery: item.available_delivery ?? item.disponible_delivery ?? true,
      });
    else
      setForm({
        nombre: '', short_name: '', descripcion: '', categoria_carta_id: '',
        rdo_category_code: '', precio_base: 0, fc_objetivo: 32, disponible_delivery: true,
      });
  }, [item, open]);

  const submit = async () => {
    if (!form.nombre || !form.precio_base) return;
    const p = { ...form, categoria_carta_id: form.categoria_carta_id || null, rdo_category_code: form.rdo_category_code || null };
    if (isEdit) await mutations.update.mutateAsync({ id: item.id, data: p });
    else await mutations.create.mutateAsync(p);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar' : 'Nuevo'} Item de Carta</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormRow label="Nombre" required>
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Argenta Burger" />
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
            <LoadingButton loading={mutations.create.isPending || mutations.update.isPending} onClick={submit} disabled={!form.name || !form.base_price}>
              {isEdit ? 'Guardar' : 'Crear Item'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
