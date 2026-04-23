import type { Metadata } from 'next';
import { PageHero } from '@/components/marketing/PageHero';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { ProductSection } from '@/components/marketing/ProductSection';

export const metadata: Metadata = {
  title: 'Para cadenas — RestoStack multi-location nativo',
  description: 'Dashboard consolidado, catálogo compartido, permisos por location. Escalá desde 1 hasta 50+ locales sin migrar.',
};

export default function ParaChainsPage() {
  return (
    <>
      <PageHero
        kicker="PARA CADENAS"
        headline="De uno a cincuenta. Mismo stack."
        body="RestoStack fue diseñado multi-location desde el core. No es un add-on. No es una licencia extra. Es la arquitectura base del sistema."
        background="carbon"
      />

      <ProductSection
        kicker="CATÁLOGO COMPARTIDO"
        headline="Un catálogo. Todos los locales."
        body="Definís el catálogo base en casa central. Cada local puede tener sus overrides de precio, disponibilidad e imagen. Cuando actualizás algo global, se propaga. Sin duplicar nada."
        bullets={[
          'Catálogo master compartido entre todos los locales',
          'Overrides de precio, imagen y disponibilidad por local',
          'Sincronización multi-canal por local',
          'Historial de cambios auditado',
        ]}
        direction="left"
        background="papel"
      />

      <ProductSection
        kicker="REPORTING CONSOLIDADO"
        headline="Ves todo. Desde una pantalla."
        body="Dashboard con ventas, CMV y margen de todos tus locales en tiempo real. Podés ver el agregado, o hacer drill-down por local, por canal, por turno."
        bullets={[
          'Dashboard consolidado de ventas multi-local',
          'Comparativa de performance entre locales',
          'CMV y margen por local en tiempo real',
          'Exportación unificada para contaduría',
        ]}
        direction="right"
        background="crema"
      />

      <ProductSection
        kicker="PERMISOS GRANULARES"
        headline="Cada uno accede a lo suyo."
        body="El dueño ve todo. El gerente de local ve su local. El cajero ve solo caja. Todo configurado desde permisos por scope × capability, sin roles rígidos."
        bullets={[
          'Permisos scope × capability por usuario',
          'Acceso cross-location para supervisores',
          'Restricciones por módulo y acción',
          'Log de auditoría completo',
        ]}
        direction="left"
        background="papel"
      />

      <FinalCTA />
    </>
  );
}
