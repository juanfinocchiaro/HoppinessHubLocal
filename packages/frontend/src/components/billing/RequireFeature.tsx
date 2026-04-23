import { type ReactNode } from 'react';
import { useFeature } from '../../hooks/useFeature.js';

interface RequireFeatureProps {
  slug: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Gate a UI section behind a feature flag.
 * If the feature is not enabled for this account, renders a default
 * upsell message or the provided fallback.
 */
export function RequireFeature({ slug, children, fallback }: RequireFeatureProps) {
  const { enabled, isLoading, planRequired } = useFeature(slug);

  if (isLoading) return null;

  if (!enabled) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <FeatureUpsell featureSlug={slug} planRequired={planRequired} />;
  }

  return <>{children}</>;
}

interface FeatureUpsellProps {
  featureSlug: string;
  planRequired: string | null;
}

function FeatureUpsell({ planRequired }: FeatureUpsellProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-10 text-center">
      <div className="text-3xl">🔒</div>
      <h3 className="text-lg font-semibold">Feature no disponible</h3>
      {planRequired && (
        <p className="text-sm text-muted-foreground max-w-sm">
          Esta funcionalidad está disponible en el plan{' '}
          <span className="font-medium text-foreground">{planRequired}</span> y superior.
        </p>
      )}
      <a
        href="/billing"
        className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Ver planes
      </a>
    </div>
  );
}
