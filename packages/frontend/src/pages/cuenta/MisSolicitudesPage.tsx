/**
 * MisSolicitudesPage - Solicitudes de días libres del usuario
 */
import MyRequestsCard from '@/components/cuenta/MyRequestsCard';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisSolicitudesPage() {
  return (
    <CuentaSectionPage
      title="Mis Solicitudes"
      subtitle="Solicitudes de días libres y ausencias"
    >
      <MyRequestsCard />
    </CuentaSectionPage>
  );
}
