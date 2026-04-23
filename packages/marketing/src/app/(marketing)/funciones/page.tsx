import type { Metadata } from 'next';
import { ProductSections } from '@/components/marketing/ProductSections';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { PageHero } from '@/components/marketing/PageHero';

export const metadata: Metadata = {
  title: 'Funciones — Todo lo que RestoStack hace por tu operación',
  description: 'POS multi-canal, costeo de recetas, KDS, cierre de caja, multi-location, facturación ARCA/AFIP. Todo en un sistema.',
};

export default function FuncionesPage() {
  return (
    <>
      <PageHero
        kicker="FUNCIONES"
        headline="Todo lo que necesitás para operar."
        body="Un sistema. No ocho. RestoStack unifica tu POS, tu catálogo multi-canal, tu costeo, tu operación y tu equipo en una sola plataforma."
        background="carbon"
      />
      <ProductSections />
      <FinalCTA />
    </>
  );
}
