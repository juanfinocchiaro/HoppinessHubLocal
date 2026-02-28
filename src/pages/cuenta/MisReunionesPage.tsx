/**
 * MisReunionesPage - Reuniones del usuario
 */
import { MyMeetingsCard } from '@/components/cuenta/MyMeetingsCard';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisReunionesPage() {
  return (
    <CuentaSectionPage title="Mis Reuniones" subtitle="Reuniones programadas y pendientes">
      <MyMeetingsCard />
    </CuentaSectionPage>
  );
}
