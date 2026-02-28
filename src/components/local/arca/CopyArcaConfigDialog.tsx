import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fromUntyped } from '@/lib/supabase-helpers';
import { fetchBranchesByIds } from '@/services/configService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

interface CopyArcaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetBranchId: string;
  onCopied: () => void;
}

export function CopyArcaConfigDialog({
  open,
  onOpenChange,
  targetBranchId,
  onCopied,
}: CopyArcaConfigDialogProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const queryClient = useQueryClient();

  // Fetch branches with fiscal data configured (excluding current)
  const { data: configuredBranches, isLoading } = useQuery({
    queryKey: ['arca-configured-branches-fiscal', targetBranchId],
    queryFn: async () => {
      const { data, error } = await (fromUntyped('afip_config')
        .select('branch_id, cuit, razon_social, direccion_fiscal, inicio_actividades, punto_venta')
        .not('cuit', 'is', null)
        .neq('branch_id', targetBranchId) as any);
      if (error) throw error;

      const branchIds = (data as Array<Record<string, unknown>>).map((d: any) => d.branch_id);
      if (!branchIds.length) return [];

      const branches = await fetchBranchesByIds(branchIds);

      return (data as Array<Record<string, unknown>>).map((cfg: any) => ({
        ...cfg,
        branch_name: branches?.find((b) => b.id === cfg.branch_id)?.name || 'Sin nombre',
      }));
    },
    enabled: open,
  });

  const handleCopy = async () => {
    if (!selectedBranchId) {
      toast.error('Seleccioná una sucursal');
      return;
    }

    const source = configuredBranches?.find((b: any) => b.branch_id === selectedBranchId);
    if (!source) return;

    setIsCopying(true);
    try {
      // Only copy fiscal data â€” NOT certificates, private key, or punto_venta
      const payload = {
        branch_id: targetBranchId,
        cuit: source.cuit,
        razon_social: source.razon_social,
        direccion_fiscal: source.direccion_fiscal,
        inicio_actividades: source.inicio_actividades,
      };

      const { data: existing } = await (fromUntyped('afip_config')
        .select('id')
        .eq('branch_id', targetBranchId)
        .maybeSingle() as any);

      if (existing) {
        const { error } = await (fromUntyped('afip_config')
          .update(payload)
          .eq('branch_id', targetBranchId) as any);
        if (error) throw error;
      } else {
        const { error } = await fromUntyped('afip_config').insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['afip-config', targetBranchId] });
      onOpenChange(false);
      onCopied();
    } catch (err: any) {
      toast.error(`Error al copiar: ${err.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar datos fiscales de otra sucursal</DialogTitle>
          <DialogDescription>
            Copiá CUIT, razón social, dirección e inicio de actividades. El punto de venta y el
            certificado NO se copian.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando sucursales...</p>}

        {!isLoading && (!configuredBranches || configuredBranches.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No hay otras sucursales con datos fiscales configurados.
          </p>
        )}

        {!isLoading && configuredBranches && configuredBranches.length > 0 && (
          <div className="space-y-2">
            {configuredBranches.map((b: any) => (
              <button
                key={b.branch_id}
                onClick={() => setSelectedBranchId(b.branch_id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedBranchId === b.branch_id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{b.branch_name}</p>
                    <p className="text-xs text-muted-foreground">
                      CUIT: {b.cuit} · {b.razon_social}
                    </p>
                  </div>
                  {selectedBranchId === b.branch_id && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCopy} disabled={!selectedBranchId || isCopying}>
            {isCopying ? 'Copiando...' : 'Copiar datos fiscales'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
