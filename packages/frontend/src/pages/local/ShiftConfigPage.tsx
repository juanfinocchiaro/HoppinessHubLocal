import { useParams } from 'react-router-dom';
import { ShiftConfigCard } from '@/components/local/ShiftConfigCard';
import { PageHeader } from '@/components/ui/page-header';

export default function ShiftConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Turnos"
        subtitle="Habilita o deshabilita turnos para la carga de ventas"
      />
      <ShiftConfigCard branchId={branchId} />
    </div>
  );
}
