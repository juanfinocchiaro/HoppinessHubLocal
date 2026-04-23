import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { FormLayout, FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { FileText, BarChart3 } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  useConceptoServicioMutations,
  type ConceptoServicioFormData,
} from '@/hooks/useConceptosServicio';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';

const TIPO_CONCEPTO_OPTIONS = [
  { value: 'servicio_publico', label: 'Servicio Público' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'impuesto', label: 'Impuesto' },
  { value: 'servicio_profesional', label: 'Servicio Profesional' },
  { value: 'otro', label: 'Otro' },
] as const;

const PERIODICIDAD_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'eventual', label: 'Eventual' },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concepto?: any | null;
}

const EMPTY: ConceptoServicioFormData = {
  nombre: '',
  tipo: 'otro',
};

export function ConceptoServicioFormModal({ open, onOpenChange, concepto }: Props) {
  const { create, update } = useConceptoServicioMutations();
  const isEdit = !!concepto;
  const [form, setForm] = useState<ConceptoServicioFormData>(EMPTY);

  useEffect(() => {
    if (concepto) {
      setForm({
        nombre: concepto.nombre,
        descripcion: concepto.descripcion || undefined,
        categoria_gasto: concepto.categoria_gasto || undefined,
        subcategoria: concepto.subcategoria || undefined,
        tipo: concepto.tipo,
        periodicidad: concepto.periodicidad || undefined,
        rdo_category_code: concepto.rdo_category_code || undefined,
      });
    } else {
      setForm(EMPTY);
    }
  }, [concepto, open]);

  const set = (key: keyof ConceptoServicioFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    if (isEdit) {
      await update.mutateAsync({ id: concepto!.id, data: form });
    } else {
      await create.mutateAsync(form);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Concepto' : 'Nuevo Concepto de Servicio'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <FormSection title="Datos del Concepto" icon={FileText}>
            <FormLayout columns={1}>
              <FormRow label="Nombre" required>
                <Input
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej: Energía Eléctrica EPEC"
                />
              </FormRow>
              <FormLayout columns={2}>
                <FormRow label="Tipo" required>
                  <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_CONCEPTO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Periodicidad">
                  <Select
                    value={form.periodicidad || 'none'}
                    onValueChange={(v) => set('periodicidad', v === 'none' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin definir</SelectItem>
                      {PERIODICIDAD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              </FormLayout>
              <FormRow label="Descripción">
                <Textarea
                  value={form.descripcion || ''}
                  onChange={(e) => set('descripcion', e.target.value)}
                  rows={2}
                />
              </FormRow>
            </FormLayout>
          </FormSection>

          <FormSection title="Clasificación RDO" icon={BarChart3}>
            <FormLayout columns={1}>
              <FormRow label="Categoría RDO" hint="Posición en el Estado de Resultados (RDO)">
                <RdoCategorySelector
                  value={form.rdo_category_code}
                  onChange={(v) => set('rdo_category_code', v)}
                  itemType="servicio"
                  placeholder="Seleccionar categoría RDO..."
                />
              </FormRow>
            </FormLayout>
          </FormSection>

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <LoadingButton loading={isPending} onClick={handleSubmit}>
              {isEdit ? 'Guardar' : 'Crear Concepto'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
