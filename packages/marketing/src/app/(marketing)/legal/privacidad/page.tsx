import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Política de privacidad — RestoStack',
  description: 'Cómo RestoStack trata tus datos.',
};

export default function PrivacidadPage() {
  return (
    <LegalPage kicker="LEGAL" title="Política de privacidad" lastUpdated="1 de mayo de 2026">
      <p>
        <strong>Próximamente.</strong> El texto completo de la política de privacidad está siendo
        revisado. Escribinos a{' '}
        <a href="mailto:legal@restostack.com" style={{ color: 'var(--brasa)' }}>
          legal@restostack.com
        </a>{' '}
        con cualquier consulta sobre el tratamiento de tus datos.
      </p>
    </LegalPage>
  );
}
