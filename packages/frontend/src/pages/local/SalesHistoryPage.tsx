/**
 * SalesHistoryPage - Historial de ventas
 *
 * - POS habilitado: Tabs con Pedidos (filtros avanzados) + Mapa de calor
 * - Sin POS: Vista de cierres de turno (legacy)
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchInfo } from '@/services/rdoService';
import { PageHeader } from '@/components/ui/page-header';
import { usePosEnabled } from '@/hooks/usePosEnabled';
import { PosHistoryView } from '@/components/local/sales/PosHistoryView';
import { ClosureHistoryView } from '@/components/local/sales/ClosureHistoryView';

export default function SalesHistoryPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [daysBack, setDaysBack] = useState('7');
  const posEnabled = usePosEnabled(branchId);

  const { data: branch } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => fetchBranchInfo(branchId!),
    enabled: !!branchId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Ventas"
        subtitle="Cierres de turno registrados"
        breadcrumb={[
          { label: 'Dashboard', href: `/milocal/${branchId}` },
          { label: 'Historial de Ventas' },
        ]}
      />
      {posEnabled ? (
        <PosHistoryView branchId={branchId || ''} branchName={branch?.name || ''} daysBack={daysBack} setDaysBack={setDaysBack} />
      ) : (
        <ClosureHistoryView branchId={branchId || ''} branchName={branch?.name || ''} daysBack={daysBack} setDaysBack={setDaysBack} />
      )}
    </div>
  );
}
