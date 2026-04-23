import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Seguridad — RestoStack',
  description: 'Prácticas de seguridad de RestoStack.',
};

export default function SeguridadPage() {
  return (
    <LegalPage kicker="LEGAL" title="Seguridad" lastUpdated="1 de mayo de 2026">
      <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: 'var(--carbon)', marginBottom: 16, marginTop: 32 }}>
        Principios
      </h2>
      <p>
        RestoStack fue diseñado con seguridad desde el core. Todos los datos de tu operación se
        almacenan cifrados. El acceso está protegido por autenticación de doble factor. Los permisos
        son granulares por scope y capability.
      </p>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: 'var(--carbon)', marginBottom: 16, marginTop: 32 }}>
        Reporte de vulnerabilidades
      </h2>
      <p>
        Si encontrás una vulnerabilidad, reportala a{' '}
        <a href="mailto:seguridad@restostack.com" style={{ color: 'var(--brasa)' }}>
          seguridad@restostack.com
        </a>
        . Respondemos en menos de 48 horas.
      </p>
    </LegalPage>
  );
}
