import React from 'react';
import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { SocialProof } from '@/components/marketing/SocialProof';
import { ProblemStatement } from '@/components/marketing/ProblemStatement';
import { ProductSections } from '@/components/marketing/ProductSections';
import { Comparison } from '@/components/marketing/Comparison';
import { HoppinessCase } from '@/components/marketing/HoppinessCase';
import { PricingPreview } from '@/components/marketing/PricingPreview';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'RestoStack — Tu operación, en orden.',
  description:
    'RestoStack es el sistema operativo para operadores gastronómicos. Multi-canal nativo, costeo real, multi-location desde el core.',
  openGraph: {
    title: 'RestoStack — Tu operación, en orden.',
    description:
      'RestoStack es el sistema operativo para operadores gastronómicos. Un catálogo, todos tus canales. Costeo real. Multi-location nativo.',
    url: 'https://restostack.com',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'RestoStack',
  url: 'https://restostack.com',
  logo: 'https://restostack.com/logo.png',
  description: 'Sistema operativo para restaurantes y operadores gastronómicos en LatAm.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Córdoba',
    addressCountry: 'AR',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'hola@restostack.com',
    availableLanguage: 'Spanish',
  },
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RestoStack',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Restaurant OS multi-canal con POS, costeo de recetas, multi-location y facturación ARCA/AFIP.',
  offers: {
    '@type': 'Offer',
    price: '30',
    priceCurrency: 'USD',
    priceValidUntil: '2027-01-01',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Puedo probar RestoStack sin ingresar tarjeta?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. El trial de 14 días no pide tarjeta.',
      },
    },
    {
      '@type': 'Question',
      name: '¿RestoStack reemplaza mi POS actual?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. RestoStack es un POS completo que además gestiona catálogo multi-canal, costeo y reporting.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Funciona con Rappi, PedidosYa y MercadoPago Delivery?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Los tres están integrados nativamente desde el catálogo de RestoStack.',
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* S1 Hero */}
      <Hero />

      {/* S2 Social Proof */}
      <SocialProof />

      {/* S3 Problem */}
      <ProblemStatement />

      {/* S4 Product sections — Catálogo, Costeo, Operación, Escala */}
      <ProductSections />

      {/* S5 Comparison */}
      <Comparison />

      {/* S6 Case Hoppiness */}
      <HoppinessCase />

      {/* S7 Pricing Preview */}
      <PricingPreview />

      {/* S8 FAQ */}
      <FAQ />

      {/* S9 Final CTA */}
      <FinalCTA />
    </>
  );
}
