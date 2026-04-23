/**
 * FiscalReportsPage — Reportes Fiscales ARCA
 *
 * Informe X, Cierre Z, Auditoría, Reimpresión de comprobantes.
 * Accessible desde Historial de Ventas (tab "Reportes Fiscales").
 */
import { format } from 'date-fns';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'react-router-dom';
import { useFiscalBranchData, useLastZClosing } from '@/hooks/useFiscalReports';

import { InformeXCard } from './fiscal/InformeXCard';
import { CierreZCard } from './fiscal/CierreZCard';
import { AuditoriaCard } from './fiscal/AuditoriaCard';
import { ReimprimirCard } from './fiscal/ReimprimirCard';

export default function FiscalReportsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branchData } = useFiscalBranchData(branchId);
  const { data: lastZ, isLoading: loadingLastZ } = useLastZClosing(branchId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes Fiscales</h2>
          <p className="text-muted-foreground">ARCA — Informes X, Cierres Z y Auditoría</p>
        </div>
        {!loadingLastZ && lastZ && (
          <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Último Z: N° {String(lastZ.z_number).padStart(4, '0')} —{' '}
            {format(new Date(lastZ.date), 'dd/MM/yyyy')}
          </Badge>
        )}
        {!loadingLastZ && !lastZ && (
          <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Sin cierres Z registrados
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InformeXCard branchId={branchId!} branchData={branchData} />
        <CierreZCard branchId={branchId!} branchData={branchData} lastZ={lastZ} />
        <AuditoriaCard branchId={branchId!} branchData={branchData} />
        <ReimprimirCard branchId={branchId!} branchData={branchData} />
      </div>
    </div>
  );
}

export { FiscalReportsPage };
