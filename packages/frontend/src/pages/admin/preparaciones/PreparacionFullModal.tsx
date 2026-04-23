import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { LoadingButton } from '@/components/ui/loading-button';
import { ChefHat } from 'lucide-react';
import { FichaTecnicaTab } from './FichaTecnicaTab';
import { OpcionesTab } from './OpcionesTab';
import type { Preparacion, CategoriaPreparacion, PreparacionMutations } from './types';

export function PreparacionFullModal({
  open,
  onOpenChange,
  preparacion,
  mutations,
  categorias,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preparacion: Preparacion | null;
  mutations: PreparacionMutations;
  categorias: CategoriaPreparacion[];
}) {
  const isEdit = !!preparacion;
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'elaborado',
    is_interchangeable: false,
    costing_method: 'promedio',
    categoria_preparacion_id: '',
  });
  const set = (k: string, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));
  const [savedId, setSavedId] = useState<string | null>(preparacion?.id || null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (preparacion) {
      setForm({
        name: preparacion.name,
        description: preparacion.description || '',
        type: preparacion.type,
        is_interchangeable: preparacion.is_interchangeable || false,
        costing_method: preparacion.costing_method || 'promedio',
        categoria_preparacion_id: preparacion.categoria_preparacion_id || '',
      });
      setSavedId(preparacion.id);
    } else {
      setForm({
        name: '',
        description: '',
        type: 'elaborado',
        is_interchangeable: false,
        costing_method: 'promedio',
        categoria_preparacion_id: '',
      });
      setSavedId(null);
    }
  }, [preparacion, open]);

  const handleSaveGeneral = async () => {
    if (!form.name.trim()) return;
    if (isEdit || savedId) {
      await mutations.update.mutateAsync({ id: savedId || preparacion.id, data: form });
    } else {
      const result = await mutations.create.mutateAsync({
        nombre: form.name,
        descripcion: form.description,
        tipo: form.type,
        is_interchangeable: form.is_interchangeable,
        metodo_costeo: form.costing_method,
        // P2 #12 fix: el `categoria_preparacion_id` elegido en el form se
        // pasaba al update pero no al create. Ahora la categoría queda
        // fija desde el primer guardado.
        categoria_preparacion_id: form.categoria_preparacion_id || null,
      } as Parameters<typeof mutations.create.mutateAsync>[0]);
      setSavedId(result.id);
      setActiveTab('ficha');
    }
  };

  const effectiveTipo = form.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? preparacion.name : 'Nueva Receta'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              General
            </TabsTrigger>
            <TabsTrigger value="ficha" className="flex-1" disabled={!savedId}>
              {effectiveTipo === 'elaborado' ? '🍳 Ficha Técnica' : '📦 Opciones'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <FormRow label="Nombre" required>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Hamburguesa Clásica"
              />
            </FormRow>
            <FormRow label="Descripción">
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
              />
            </FormRow>
            <FormRow label="Categoría">
              <Select
                value={form.categoria_preparacion_id || 'none'}
                onValueChange={(v) => set('categoria_preparacion_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormSection title="Tipo" icon={ChefHat}>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set('type', 'elaborado')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === 'elaborado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <p className="font-medium text-sm">🍳 Elaborado</p>
                  <p className="text-xs text-muted-foreground">
                    Tiene ficha técnica con ingredientes
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => set('type', 'componente_terminado')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === 'componente_terminado' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <p className="font-medium text-sm">📦 Componente</p>
                  <p className="text-xs text-muted-foreground">Porción de insumo terminado</p>
                </button>
              </div>
            </FormSection>

            {form.type === 'componente_terminado' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Intercambiable (múltiples opciones)</span>
                  <Switch
                    checked={form.is_interchangeable}
                    onCheckedChange={(v) => set('is_interchangeable', v)}
                  />
                </div>
                {form.is_interchangeable && (
                  <FormRow label="Método de costeo">
                    <Select
                      value={form.costing_method}
                      onValueChange={(v) => set('costing_method', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promedio">Promedio</SelectItem>
                        <SelectItem value="mas_caro">Más caro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormRow>
                )}
              </div>
            )}

            <StickyActions>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <LoadingButton
                loading={mutations.create.isPending || mutations.update.isPending}
                onClick={handleSaveGeneral}
                disabled={!form.name}
              >
                {savedId ? 'Guardar Cambios' : 'Crear y Continuar →'}
              </LoadingButton>
            </StickyActions>
          </TabsContent>

          <TabsContent value="ficha" className="mt-4">
            {savedId && effectiveTipo === 'elaborado' && (
              <FichaTecnicaTab
                preparacionId={savedId}
                mutations={mutations}
                onClose={() => onOpenChange(false)}
              />
            )}
            {savedId && effectiveTipo === 'componente_terminado' && (
              <OpcionesTab
                preparacionId={savedId}
                mutations={mutations}
                onClose={() => onOpenChange(false)}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
