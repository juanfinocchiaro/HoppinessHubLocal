import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormRow } from '@/components/ui/forms-pro';
import { Tag, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useMenuCategorias } from '@/hooks/useMenu';

import type { ItemCartaMutations } from './types';
import { formatCurrency } from '@/lib/formatters';

export function EditarInline({
  item,
  mutations,
  onSaved,
}: {
  item: any;
  mutations: ItemCartaMutations;
  onSaved: () => void;
}) {
  const { data: categorias } = useMenuCategorias();
  const [form, setForm] = useState({
    nombre: item.nombre || '',
    nombre_corto: item.nombre_corto || '',
    descripcion: item.descripcion || '',
    categoria_carta_id: item.categoria_carta_id || '',
    precio_base: item.precio_base || 0,
    precio_referencia: item.precio_referencia ? Number(item.precio_referencia) : '',
    fc_objetivo: item.fc_objetivo || 32,
    disponible_delivery: item.disponible_delivery ?? true,
  });
  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre || !form.precio_base) return;
    const p = {
      ...form,
      categoria_carta_id: form.categoria_carta_id || null,
      precio_referencia: form.precio_referencia ? Number(form.precio_referencia) : null,
    };
    await mutations.update.mutateAsync({ id: item.id, data: p });
    onSaved();
  };

  const hasDiscount = form.precio_referencia && Number(form.precio_referencia) > form.precio_base;
  const descuento = hasDiscount ? Number(form.precio_referencia) - form.precio_base : 0;
  const descuentoPct = hasDiscount
    ? Math.round((descuento / Number(form.precio_referencia)) * 100)
    : 0;

  return (
    <div className="space-y-4 max-w-lg">
      <FormRow label="Nombre" required>
        <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Nombre corto" hint="Para tickets">
          <Input value={form.nombre_corto} onChange={(e) => set('nombre_corto', e.target.value)} />
        </FormRow>
        <FormRow label="Categoría carta">
          <Select
            value={form.categoria_carta_id || 'none'}
            onValueChange={(v) => set('categoria_carta_id', v === 'none' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categorias?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
      </div>
      <FormRow label="Descripción">
        <Textarea
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={2}
        />
      </FormRow>
      <div className="grid grid-cols-3 gap-3">
        <FormRow label="Precio carta (con IVA)" required>
          <Input
            type="number"
            value={form.precio_base || ''}
            onChange={(e) => set('precio_base', Number(e.target.value))}
          />
        </FormRow>
        <FormRow
          label="Precio referencia (sin promo)"
          hint="Opcional. Si es mayor al precio carta, el POS muestra descuento."
        >
          <Input
            type="number"
            value={form.precio_referencia}
            onChange={(e) => set('precio_referencia', e.target.value ? Number(e.target.value) : '')}
            placeholder="Sin promo"
          />
        </FormRow>
        <FormRow label="FC% Objetivo">
          <Input
            type="number"
            value={form.fc_objetivo || ''}
            onChange={(e) => set('fc_objetivo', Number(e.target.value))}
          />
        </FormRow>
      </div>
      {hasDiscount && (
        <div className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 bg-destructive/5 border-destructive/20">
          <Tag className="w-4 h-4 text-destructive" />
          <span className="text-destructive font-medium">
            Descuento promo: -{formatCurrency(descuento)} ({descuentoPct}%)
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch
          checked={form.disponible_delivery}
          onCheckedChange={(v) => set('disponible_delivery', v)}
        />
        <span className="text-sm text-muted-foreground">Disponible en delivery</span>
      </div>
      <LoadingButton loading={mutations.update.isPending} onClick={submit} className="w-full">
        <Save className="w-4 h-4 mr-2" /> Guardar Cambios
      </LoadingButton>
    </div>
  );
}
