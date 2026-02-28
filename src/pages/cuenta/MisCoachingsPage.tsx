/**
 * MisCoachingsPage - Coachings recibidos por el usuario
 */
import { MyCoachingsCardEnhanced } from '@/components/cuenta/MyCoachingsCardEnhanced';
import { CuentaSectionPage } from '@/components/shared/CuentaSectionPage';

export default function MisCoachingsPage() {
  return (
    <CuentaSectionPage title="Mis Coachings" subtitle="Evaluaciones de desempeño recibidas">
      <MyCoachingsCardEnhanced />
    </CuentaSectionPage>
  );
}
