import { useParams } from 'react-router-dom';
import { GestorInversiones } from '@/components/rdo/GestorInversiones';

export default function InversionesPage() {
  const { branchId } = useParams<{ branchId: string }>();

  return (
    <div>
      <GestorInversiones branchId={branchId!} />
    </div>
  );
}
