import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Términos de servicio — RestoStack',
  description: 'Términos y condiciones del servicio RestoStack.',
};

export default function TerminosPage() {
  return (
    <LegalPage kicker="LEGAL" title="Términos de servicio" lastUpdated="1 de mayo de 2026">
      <p>
        <strong>Próximamente.</strong> El texto completo de los términos de servicio está siendo
        revisado por el equipo legal. Publicaremos la versión definitiva antes del lanzamiento
        general. Si necesitás información específica, escribinos a{' '}
        <a href="mailto:legal@restostack.com" style={{ color: 'var(--brasa)' }}>
          legal@restostack.com
        </a>
        .
      </p>
    </LegalPage>
  );
}
