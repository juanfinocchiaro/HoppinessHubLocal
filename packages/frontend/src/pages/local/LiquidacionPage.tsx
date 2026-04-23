import { useOutletContext } from 'react-router-dom';
import LaborHoursSummary from '@/components/local/LaborHoursSummary';
import { PageHelp } from '@/components/ui/PageHelp';
import { PageHeader } from '@/components/ui/page-header';
import type { Tables } from '@/types/database';

interface OutletContext {
  branch: Tables<'branches'>;
}

export default function LiquidacionPage() {
  const { branch } = useOutletContext<OutletContext>();

  return (
    <div className="space-y-4">
      <PageHelp pageId="local-liquidacion" />
      <PageHeader
        title="Liquidación"
        subtitle="Resumen mensual de horas trabajadas para liquidación de haberes"
      />
      <LaborHoursSummary branchId={branch?.id} />
    </div>
  );
}
