import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/services/apiClient';
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

interface AfipConfigRow {
  branch_id: string;
  cuit: string;
  business_name: string;
  direccion_fiscal: string;
  inicio_actividades: string;
  punto_venta: number | null;
}

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

  const { data: configuredBranches, isLoading } = useQuery({
    queryKey: ['arca-configured-branches-fiscal', targetBranchId],
    queryFn: async () => {
      const data = await apiGet<AfipConfigRow[]>(
        `/fiscal/afip-configs`,
        { excludeBranchId: targetBranchId },
      );

      const branchIds = data.map((d) => d.branch_id);
      if (!branchIds.length) return [];

      const branches = await fetchBranchesByIds(branchIds);

      return data.map((cfg) => ({
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

    const source = configuredBranches?.find((b) => b.branch_id === selectedBranchId);
    if (!source) return;

    setIsCopying(true);
    try {
      await apiPost(`/fiscal/afip-config/${targetBranchId}/copy-from/${selectedBranchId}`);

      queryClient.invalidateQueries({ queryKey: ['afip-config', targetBranchId] });
      onOpenChange(false);
      onCopied();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Error al copiar: ${message}`);
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
            {configuredBranches.map((b) => (
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
                      CUIT: {b.cuit} · {b.business_name}
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
