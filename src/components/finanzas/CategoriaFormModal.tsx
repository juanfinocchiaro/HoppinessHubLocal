import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormLayout, FormRow } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { LoadingButton } from '@/components/ui/loading-button';
import { useCategoriaInsumoMutations } from '@/hooks/useInsumos';
import { TIPO_CATEGORIA_OPTIONS } from '@/types/financial';
import type { CategoriaInsumo, CategoriaInsumoFormData } from '@/types/financial';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: CategoriaInsumo | null;
}

const EMPTY: CategoriaInsumoFormData = {
  name: '',
  tipo: 'materia_prima',
};

export function CategoriaFormModal({ open, onOpenChange, categoria }: Props) {
  const { create, update } = useCategoriaInsumoMutations();
  const isEdit = !!categoria;
  const [form, setForm] = useState<CategoriaInsumoFormData>(EMPTY);

  useEffect(() => {
    if (categoria) {
      setForm({
        name: categoria.name || categoria.nombre,
        tipo: categoria.tipo,
        description: categoria.description || categoria.descripcion || undefined,
        orden: categoria.orden || undefined,
      });
    } else {
      setForm(EMPTY);
    }
  }, [categoria, open]);

  const set = (key: keyof CategoriaInsumoFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    if (isEdit) {
      await update.mutateAsync({ id: categoria!.id, data: form });
    } else {
      await create.mutateAsync(form);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormLayout columns={1}>
            <FormRow label="Nombre" required>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </FormRow>
            <FormRow label="Tipo" required>
              <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_CATEGORIA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Orden">
              <Input
                type="number"
                value={form.orden ?? ''}
                onChange={(e) => set('orden', e.target.value ? Number(e.target.value) : undefined)}
              />
            </FormRow>
          </FormLayout>
          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <LoadingButton loading={isPending} onClick={handleSubmit}>
              {isEdit ? 'Guardar' : 'Crear'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
