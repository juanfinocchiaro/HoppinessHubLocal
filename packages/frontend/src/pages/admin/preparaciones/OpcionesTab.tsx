import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { Save } from 'lucide-react';
import { usePreparacionOpciones } from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { formatCurrency } from './types';
import type { PreparacionMutations } from './types';

export function OpcionesTab({
  preparacionId,
  mutations,
  onClose,
}: {
  preparacionId: string;
  mutations: PreparacionMutations;
  onClose: () => void;
}) {
  const { data: opcionesActuales } = usePreparacionOpciones(preparacionId);
  const { data: insumos } = useInsumos();

  const productosDisponibles = useMemo(
    () => insumos?.filter((i) => i.item_type === 'producto') || [],
    [insumos],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (opcionesActuales) {
      setSelectedIds(opcionesActuales.map((o) => o.insumo_id));
      setHasChanges(false);
    }
  }, [opcionesActuales]);

  const toggleOption = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await mutations.saveOpciones.mutateAsync({
      preparacion_id: preparacionId,
      insumo_ids: selectedIds,
    });
    setHasChanges(false);
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Seleccioná los productos intercambiables para este componente:
      </p>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {productosDisponibles.map((prod) => (
          <button
            key={prod.id}
            type="button"
            onClick={() => toggleOption(prod.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left ${selectedIds.includes(prod.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <div>
              <p className="font-medium text-sm">{prod.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(prod.base_unit_cost || 0)}
              </p>
            </div>
            {selectedIds.includes(prod.id) && <Badge variant="default">✓</Badge>}
          </button>
        ))}
      </div>
      {hasChanges && (
        <div className="flex justify-end">
          <LoadingButton loading={mutations.saveOpciones.isPending} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Guardar Opciones
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
