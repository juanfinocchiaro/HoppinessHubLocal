/**
 * MisApercibimientosPage - Apercibimientos del usuario
 */
import MyWarningsCard from '@/components/cuenta/MyWarningsCard';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisApercibimientosPage() {
  return (
    <CuentaSectionPage
      title="Mis Apercibimientos"
      subtitle="Historial de apercibimientos recibidos"
    >
      <MyWarningsCard />
    </CuentaSectionPage>
  );
}
