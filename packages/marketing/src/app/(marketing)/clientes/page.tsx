import type { Metadata } from 'next';
import { PageHero } from '@/components/marketing/PageHero';
import { ClientesGrid } from '@/components/marketing/ClientesGrid';

export const metadata: Metadata = {
  title: 'Clientes — RestoStack',
  description: 'Conocé a los operadores que ya trabajan con RestoStack.',
};

export default function ClientesPage() {
  return (
    <>
      <PageHero
        kicker="CLIENTES"
        headline="Operadores reales. Resultados reales."
        background="carbon"
      />
      <ClientesGrid />
    </>
  );
}
