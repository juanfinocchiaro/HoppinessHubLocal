'use client';

// PostHog analytics wrapper
// Init: llamar initAnalytics() desde el root layout client component.
// Tracking: usar las funciones exportadas en los event handlers.

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (distinctId: string, properties?: Record<string, unknown>) => void;
      init: (token: string, options?: Record<string, unknown>) => void;
    };
  }
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!window.posthog) return;
  window.posthog.capture(event, { ...getUtmParams(), ...properties });
}

/** Extrae parámetros UTM del URL actual y los persiste en sessionStorage */
export function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const result: Record<string, string> = {};

  UTM_KEYS.forEach((key) => {
    const val = params.get(key);
    if (val) {
      sessionStorage.setItem(key, val);
      result[key] = val;
    } else {
      const stored = sessionStorage.getItem(key);
      if (stored) result[key] = stored;
    }
  });

  return result;
}

/** Agrega UTMs almacenados al href del CTA de signup */
export function buildSignupUrl(base: string): string {
  if (typeof window === 'undefined') return base;
  const utms = getUtmParams();
  const params = new URLSearchParams(utms);
  const query = params.toString();
  return query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base;
}

// Eventos canónicos del plan
export const EVENTS = {
  HERO_CTA_CLICK: 'landing_hero_cta_click',
  SECTION_VIEW: 'landing_section_view',
  PRICING_PREVIEW_CLICK: 'landing_pricing_preview_click',
  FINAL_CTA_CLICK: 'landing_final_cta_click',
  SIGNUP_STARTED: 'signup_started',
} as const;
