/**
 * MisComunicadosPage - Comunicados recibidos por el usuario
 */
import MyCommunicationsCard from '@/components/cuenta/MyCommunicationsCard';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisComunicadosPage() {
  return (
    <CuentaSectionPage title="Comunicados" subtitle="Mensajes y novedades de la marca">
      <MyCommunicationsCard />
    </CuentaSectionPage>
  );
}
