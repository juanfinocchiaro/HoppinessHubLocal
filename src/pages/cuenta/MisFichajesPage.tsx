/**
 * MisFichajesPage - Historial de fichajes del usuario
 */
import MyClockInsCard from '@/components/cuenta/MyClockInsCard';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisFichajesPage() {
  return (
    <CuentaSectionPage title="Mis Fichajes" subtitle="Historial de entradas y salidas">
      <MyClockInsCard />
    </CuentaSectionPage>
  );
}
