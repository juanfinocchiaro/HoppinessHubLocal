import { useParams } from 'react-router-dom';
import { RdoFinancieroDashboard } from '@/components/rdo/RdoFinancieroDashboard';

export default function RdoFinancieroPage() {
  const { branchId } = useParams<{ branchId: string }>();

  return (
    <div>
      <RdoFinancieroDashboard branchId={branchId!} />
    </div>
  );
}
