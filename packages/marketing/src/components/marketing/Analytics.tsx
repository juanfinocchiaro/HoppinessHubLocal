'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getUtmParams, captureEvent, EVENTS } from '@/lib/analytics';

const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

/**
 * Analytics — monta PostHog, captura UTMs, trackea page views y section_view.
 * Incluir una vez en el root layout (client component).
 */
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  // Init PostHog
  useEffect(() => {
    if (initialized.current || !POSTHOG_TOKEN) return;
    initialized.current = true;

    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
        persistence: 'localStorage+cookie',
      });
      (window as Window & { posthog?: typeof posthog }).posthog = posthog;

      // Persistir UTMs
      getUtmParams();

      // Page view inicial
      posthog.capture('$pageview', { path: pathname });
    });
  }, []);

  // Track page views on navigation
  useEffect(() => {
    if (!initialized.current) return;
    window.posthog?.capture('$pageview', { path: pathname });
    getUtmParams();
  }, [pathname, searchParams]);

  // Intercept data-event clicks (delegación en document)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('[data-event]') as HTMLElement | null;
      if (!target) return;
      const event = target.dataset.event;
      if (!event) return;
      const props: Record<string, string> = {};
      Object.entries(target.dataset).forEach(([k, v]) => {
        if (k !== 'event' && v) props[k] = v;
      });
      captureEvent(event, props);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Intersection Observer para section_view
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('section[data-section]');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = (entry.target as HTMLElement).dataset.section;
            if (section) {
              captureEvent(EVENTS.SECTION_VIEW, { section });
              observer.unobserve(entry.target); // once
            }
          }
        });
      },
      { threshold: 0.2 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
