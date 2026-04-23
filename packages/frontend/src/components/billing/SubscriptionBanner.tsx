import { useQuery } from '@tanstack/react-query';
import { getMySubscription, type SubscriptionStatus } from '../../services/billingService.js';
import { Link } from 'react-router-dom';

/**
 * Shows a sticky banner when the subscription is past_due or read_only.
 * Renders nothing when the account is healthy.
 */
export function SubscriptionBanner() {
  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: getMySubscription,
    staleTime: 60_000,
    retry: false,
  });

  if (!subscription) return null;

  const { status, trial_ends_at } = subscription;

  if (status === 'past_due') {
    return (
      <PastDueBanner />
    );
  }

  if (status === 'read_only') {
    return (
      <ReadOnlyBanner />
    );
  }

  if (status === 'trialing' && trial_ends_at) {
    const daysLeft = Math.max(0, Math.ceil((new Date(trial_ends_at).getTime() - Date.now()) / 86_400_000));
    if (daysLeft <= 4) {
      return <TrialEndingBanner daysLeft={daysLeft} />;
    }
  }

  return null;
}

function PastDueBanner() {
  return (
    <div className="w-full bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <span className="text-yellow-800 font-medium">
        ⚠️ Hay un problema con tu pago. Tu acceso puede verse limitado.
      </span>
      <Link
        to="/billing"
        className="shrink-0 rounded-md bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-700 transition-colors"
      >
        Actualizar pago
      </Link>
    </div>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="w-full bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <span className="text-orange-800 font-medium">
        🔒 Tu cuenta está en modo solo lectura. Actualizá tu método de pago para seguir operando.
      </span>
      <Link
        to="/billing"
        className="shrink-0 rounded-md bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700 transition-colors"
      >
        Activar cuenta
      </Link>
    </div>
  );
}

function TrialEndingBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="w-full bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <span className="text-blue-800 font-medium">
        ℹ️ Tu prueba gratuita termina en {daysLeft === 0 ? 'hoy' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}.
      </span>
      <Link
        to="/billing"
        className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Elegir plan
      </Link>
    </div>
  );
}
