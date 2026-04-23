/**
 * Pricing tiers — fuente canónica del backend.
 * Sinronizar manualmente con packages/marketing/src/lib/pricing.ts
 * hasta que billing tenga tabla `plans` en DB.
 */

export interface PricingTier {
  id: string;
  name: string;
  locales: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: 'USD';
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    locales: '1 local',
    priceMonthly: 30,
    priceAnnual: 25,
    currency: 'USD',
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
    locales: 'Hasta 3 locales',
    priceMonthly: 70,
    priceAnnual: 58,
    currency: 'USD',
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
    locales: 'Locales ilimitados',
    priceMonthly: 180,
    priceAnnual: 150,
    currency: 'USD',
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
    locales: 'Negociable',
    priceMonthly: null,
    priceAnnual: null,
    currency: 'USD',
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
