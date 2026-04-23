/**
 * MisAdelantosPage - Adelantos de sueldo del usuario
 */
import MySalaryAdvancesCard from '@/components/cuenta/MySalaryAdvancesCard';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisAdelantosPage() {
  return (
    <CuentaSectionPage title="Mis Adelantos" subtitle="Historial de adelantos de sueldo">
      <MySalaryAdvancesCard />
    </CuentaSectionPage>
  );
}
