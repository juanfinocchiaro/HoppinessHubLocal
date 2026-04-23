import type { Metadata } from 'next';
import { PricingPreview } from '@/components/marketing/PricingPreview';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { PageHero } from '@/components/marketing/PageHero';

export const metadata: Metadata = {
  title: 'Precios — RestoStack',
  description: 'Starter desde USD 30/mes. Pro, Chain y Enterprise. Sin tarjeta para el trial de 14 días.',
};

export default function PreciosPage() {
  return (
    <>
      <PageHero
        kicker="PRECIOS"
        headline="Un plan que crece con vos."
        body="Empezás con un local. Escalás sin migrar. Todos los planes incluyen 14 días gratis, sin tarjeta."
        background="carbon"
      />
      <PricingPreview />
      <FAQ />
      <FinalCTA />
    </>
  );
}
