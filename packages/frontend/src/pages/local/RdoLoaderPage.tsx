import { useParams, useOutletContext } from 'react-router-dom';
import { CargadorRdoUnificado } from '@/components/rdo/CargadorRdoUnificado';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePosEnabled } from '@/hooks/usePosEnabled';
import type { Tables } from '@/types/database';

export default function RdoLoaderPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const context = useOutletContext<{ branch?: Tables<'branches'> }>();
  const posEnabled = usePosEnabled(branchId || undefined);

  if (posEnabled) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Con POS habilitado, el Cargador RDO está deshabilitado. Los consumos y costos se
            gestionan desde el módulo de Stock y Compras.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <CargadorRdoUnificado branchId={branchId!} branchName={context?.branch?.name} />
    </div>
  );
}
