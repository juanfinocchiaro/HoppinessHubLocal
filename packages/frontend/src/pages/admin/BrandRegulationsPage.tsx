import RegulationsManager from '@/components/admin/RegulationsManager';
import { RequireBrandPermission } from '@/components/guards';
import { PageHeader } from '@/components/ui/page-header';

function BrandRegulationsPageContent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reglamento Interno" subtitle="Gestión del reglamento de la marca" />
      <RegulationsManager />
    </div>
  );
}

export default function BrandRegulationsPage() {
  return (
    <RequireBrandPermission
      permission="canEditBrandConfig"
      noAccessMessage="Solo el Superadmin puede gestionar reglamentos."
    >
      <BrandRegulationsPageContent />
    </RequireBrandPermission>
  );
}
