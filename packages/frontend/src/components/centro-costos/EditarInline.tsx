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
    name: item.name || '',
    short_name: item.short_name || '',
    description: item.description || '',
    categoria_carta_id: item.categoria_carta_id || '',
    base_price: item.base_price || 0,
    reference_price: item.reference_price ? Number(item.reference_price) : '',
    fc_objetivo: item.fc_objetivo || 32,
    available_delivery: item.available_delivery ?? true,
  });
  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.base_price) return;
    const p = {
      ...form,
      categoria_carta_id: form.categoria_carta_id || null,
      reference_price: form.reference_price ? Number(form.reference_price) : null,
    };
    await mutations.update.mutateAsync({ id: item.id, data: p });
    onSaved();
  };

  const hasDiscount = form.reference_price && Number(form.reference_price) > form.base_price;
  const descuento = hasDiscount ? Number(form.reference_price) - form.base_price : 0;
  const descuentoPct = hasDiscount
    ? Math.round((descuento / Number(form.reference_price)) * 100)
    : 0;

  return (
    <div className="space-y-4 max-w-lg">
      <FormRow label="Nombre" required>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Nombre corto" hint="Para tickets">
          <Input value={form.short_name} onChange={(e) => set('short_name', e.target.value)} />
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
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
      </div>
      <FormRow label="Descripción">
          <Textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
        />
      </FormRow>
      <div className="grid grid-cols-3 gap-3">
        <FormRow label="Precio carta (con IVA)" required>
          <Input
            type="number"
            value={form.base_price || ''}
            onChange={(e) => set('base_price', Number(e.target.value))}
          />
        </FormRow>
        <FormRow
          label="Precio referencia (sin promo)"
          hint="Opcional. Si es mayor al precio carta, el POS muestra descuento."
        >
          <Input
            type="number"
            value={form.reference_price}
            onChange={(e) => set('reference_price', e.target.value ? Number(e.target.value) : '')}
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
          checked={form.available_delivery}
          onCheckedChange={(v) => set('available_delivery', v)}
        />
        <span className="text-sm text-muted-foreground">Disponible en delivery</span>
      </div>
      <LoadingButton loading={mutations.update.isPending} onClick={submit} className="w-full">
        <Save className="w-4 h-4 mr-2" /> Guardar Cambios
      </LoadingButton>
    </div>
  );
}
