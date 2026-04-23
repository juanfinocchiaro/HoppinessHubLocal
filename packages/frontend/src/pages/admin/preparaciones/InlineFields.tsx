import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save } from 'lucide-react';
import type { Preparacion, CategoriaPreparacion, PreparacionMutations } from './types';

export function InlineNombre({
  prep,
  mutations,
}: {
  prep: Preparacion;
  mutations: PreparacionMutations;
}) {
  const [value, setValue] = useState(prep.name || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(prep.name || '');
    setDirty(false);
  }, [prep.name]);

  const save = async () => {
    if (!dirty || !value.trim()) return;
    await mutations.update.mutateAsync({ id: prep.id, data: { name: value.trim() } });
    setDirty(false);
  };

  return (
    <div className="flex items-center gap-2 pt-2 mb-1">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        placeholder="Nombre de la receta..."
        className="text-sm font-semibold h-8"
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') {
            setValue(prep.name);
            setDirty(false);
          }
        }}
      />
      {dirty && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8"
          onClick={save}
          disabled={mutations.update.isPending}
        >
          <Save className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

export function InlineDescripcion({
  prep,
  mutations,
}: {
  prep: Preparacion;
  mutations: PreparacionMutations;
}) {
  const [value, setValue] = useState(prep.description || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(prep.description || '');
    setDirty(false);
  }, [prep.description]);

  const save = async () => {
    if (!dirty) return;
    await mutations.update.mutateAsync({ id: prep.id, data: { description: value } });
    setDirty(false);
  };

  return (
    <div className="flex items-start gap-2 mb-3">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        placeholder="Descripción de la receta..."
        rows={1}
        className="text-sm resize-none min-h-[36px]"
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
      />
      {dirty && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={save}
          disabled={mutations.update.isPending}
        >
          <Save className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

export function InlineCategoria({
  prep,
  mutations,
  categorias,
}: {
  prep: Preparacion;
  mutations: PreparacionMutations;
  categorias: CategoriaPreparacion[] | undefined;
}) {
  const current = prep.categoria_preparacion_id || '';
  const save = async (value: string) => {
    const newVal = value === '_none' ? null : value;
    if (newVal === (prep.categoria_preparacion_id || null)) return;
    await mutations.update.mutateAsync({ id: prep.id, data: { categoria_preparacion_id: newVal } });
  };
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs text-muted-foreground shrink-0">Categoría:</span>
      <Select value={current || '_none'} onValueChange={save}>
        <SelectTrigger className="h-8 text-xs w-48">
          <SelectValue placeholder="Sin categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">Sin categoría</SelectItem>
          {categorias?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
