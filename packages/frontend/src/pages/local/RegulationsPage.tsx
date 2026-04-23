import { useOutletContext } from 'react-router-dom';
import type { Tables } from '@/types/database';
import RegulationSignaturesPanel from '@/components/local/RegulationSignaturesPanel';
import { PageHeader } from '@/components/ui/page-header';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function RegulationsPage() {
  const { branch } = useOutletContext<OutletContext>();

  if (!branch?.id) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Firmas de Reglamento"
        subtitle="Gestión de firmas del reglamento interno para el equipo"
      />
      <RegulationSignaturesPanel branchId={branch.id} />
    </div>
  );
}
