// Pricing tiers — fuente canónica para la V1.
// Cuando el endpoint /api/plans esté disponible, consumirlo desde la página /precios.
// La landing usa estos datos hardcoded para evitar una dependencia de runtime en SSG.

export interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  locales: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: 'USD';
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Para arrancar',
    locales: '1 local',
    priceMonthly: 30,
    priceAnnual: 25,
    currency: 'USD',
    cta: 'Empezar gratis',
    ctaHref: '/signup?plan=starter',
    highlighted: false,
    features: [
      'POS + KDS + delivery screen',
      'WebApp de pedidos propia',
      'Catálogo con modificadores',
      'Costeo de recetas',
      'Cierre de caja digital',
      'Reportes del turno',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para operar bien',
    locales: 'Hasta 3 locales',
    priceMonthly: 70,
    priceAnnual: 58,
    currency: 'USD',
    cta: 'Empezar gratis',
    ctaHref: '/signup?plan=pro',
    highlighted: true,
    features: [
      'Todo de Starter',
      'Integración Rappi, PedidosYa y MPD',
      'Dashboard multi-local',
      'Facturación ARCA/AFIP integrada',
      'Gestión de equipo y fichaje',
      'Reportes de P&L por local',
    ],
  },
  {
    id: 'chain',
    name: 'Chain',
    tagline: 'Para cadenas',
    locales: 'Locales ilimitados',
    priceMonthly: 180,
    priceAnnual: 150,
    currency: 'USD',
    cta: 'Empezar gratis',
    ctaHref: '/signup?plan=chain',
    highlighted: false,
    features: [
      'Todo de Pro',
      'Dashboard consolidado global',
      'Catálogo compartido entre locales',
      'Permisos por scope + capability',
      'Reporting multi-location avanzado',
      'Soporte prioritario',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Para grupos grandes',
    locales: 'Negociable',
    priceMonthly: null,
    priceAnnual: null,
    currency: 'USD',
    cta: 'Hablar con ventas',
    ctaHref: '/contacto?motivo=ventas',
    highlighted: false,
    features: [
      'Todo de Chain',
      'SLA personalizado',
      'Onboarding dedicado',
      'Integraciones custom',
      'Contrato anual con descuento',
      'Account manager asignado',
    ],
  },
];
