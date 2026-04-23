import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMySubscription, getPlans, getMyInvoices,
  cancelSubscription, changePlan,
  type Plan, type Subscription, type Invoice,
} from '../../services/billingService.js';
import { CheckoutCard } from '../../components/billing/CheckoutCard.js';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: getMySubscription,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: getPlans,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: getMyInvoices,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: ({ planId, cycle }: { planId: string; cycle: 'monthly' | 'yearly' }) =>
      changePlan(planId, cycle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setShowPlanModal(false);
    },
  });

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Cargando información de facturación...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Facturación y plan</h1>

      {/* Current plan */}
      <SubscriptionCard
        subscription={subscription}
        plans={plans}
        onUpgrade={() => setShowPlanModal(true)}
        onAddCard={() => setShowCheckout(true)}
        onCancel={() => {
          if (confirm('¿Cancelar suscripción al final del período?')) {
            cancelMutation.mutate();
          }
        }}
      />

      {/* Invoices */}
      <InvoicesList invoices={invoices} />

      {/* Checkout modal */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Agregar método de pago</h2>
              <button onClick={() => setShowCheckout(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <CheckoutCard
              plan={selectedPlan}
              billingCycle={billingCycle}
              onSuccess={() => {
                setShowCheckout(false);
                queryClient.invalidateQueries({ queryKey: ['billing'] });
              }}
            />
          </div>
        </div>
      )}

      {/* Plan change modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Cambiar plan</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >Mensual</button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${billingCycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >Anual <span className="text-xs opacity-75">(-15%)</span></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.filter(p => p.slug !== 'enterprise').map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billingCycle={billingCycle}
                  isCurrent={subscription?.plan_id === plan.id}
                  onSelect={() => {
                    if (!subscription?.mercadopago_preapproval_id) {
                      setSelectedPlan(plan);
                      setShowPlanModal(false);
                      setShowCheckout(true);
                    } else {
                      changePlanMutation.mutate({ planId: plan.id, cycle: billingCycle });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription, plans, onUpgrade, onAddCard, onCancel,
}: {
  subscription: Subscription | null;
  plans: Plan[];
  onUpgrade: () => void;
  onAddCard: () => void;
  onCancel: () => void;
}) {
  const currentPlan = plans.find(p => p.id === subscription?.plan_id);
  const statusLabel: Record<string, string> = {
    trialing: 'En prueba',
    active: 'Activa',
    past_due: 'Pago vencido',
    read_only: 'Solo lectura',
    suspended: 'Suspendida',
    cancelled: 'Cancelada',
  };
  const statusColor: Record<string, string> = {
    trialing: 'text-blue-600 bg-blue-50',
    active: 'text-green-600 bg-green-50',
    past_due: 'text-yellow-600 bg-yellow-50',
    read_only: 'text-orange-600 bg-orange-50',
    suspended: 'text-red-600 bg-red-50',
    cancelled: 'text-gray-600 bg-gray-50',
  };

  if (!subscription) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-muted-foreground">No tenés una suscripción activa.</p>
        <button onClick={onUpgrade} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ver planes
        </button>
      </div>
    );
  }

  const status = subscription.status;

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{currentPlan?.name ?? 'Plan actual'}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {subscription.billing_cycle === 'yearly' ? 'Facturación anual' : 'Facturación mensual'}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[status] ?? ''}`}>
          {statusLabel[status] ?? status}
        </span>
      </div>

      {subscription.trial_ends_at && status === 'trialing' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Tu prueba gratuita termina el{' '}
          <strong>{new Date(subscription.trial_ends_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
          {!subscription.mercadopago_preapproval_id && (
            <button onClick={onAddCard} className="ml-2 underline font-medium">Agregar método de pago</button>
          )}
        </div>
      )}

      {(status === 'past_due' || status === 'read_only') && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Hay un problema con tu método de pago. Tu cuenta está en modo{' '}
          {status === 'past_due' ? 'pago vencido' : 'solo lectura'}.
          <button onClick={onAddCard} className="ml-2 underline font-medium">Actualizar método de pago</button>
        </div>
      )}

      {currentPlan && (
        <div className="text-sm text-muted-foreground">
          USD {subscription.billing_cycle === 'yearly' ? currentPlan.price_yearly_usd : currentPlan.price_monthly_usd}
          /{subscription.billing_cycle === 'yearly' ? 'año' : 'mes'}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onUpgrade} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          Cambiar plan
        </button>
        {status === 'active' && !subscription.cancel_at_period_end && (
          <button onClick={onCancel} className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
            Cancelar suscripción
          </button>
        )}
        {subscription.cancel_at_period_end && (
          <span className="text-sm text-muted-foreground self-center">Cancela al final del período</span>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan, billingCycle, isCurrent, onSelect,
}: {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const price = billingCycle === 'yearly' ? plan.price_yearly_usd : plan.price_monthly_usd;
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${isCurrent ? 'border-primary bg-primary/5' : 'bg-card'}`}>
      <div>
        <h3 className="font-semibold">{plan.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
      </div>
      <div className="text-2xl font-bold">
        USD {price}
        <span className="text-sm font-normal text-muted-foreground">/{billingCycle === 'yearly' ? 'año' : 'mes'}</span>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1">
        {plan.max_locations
          ? <li>Hasta {plan.max_locations} local{plan.max_locations > 1 ? 'es' : ''}</li>
          : <li>Locales ilimitados</li>
        }
      </ul>
      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`mt-auto rounded-md px-3 py-2 text-sm font-medium transition-colors ${isCurrent ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
      >
        {isCurrent ? 'Plan actual' : 'Seleccionar'}
      </button>
    </div>
  );
}

function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Historial de pagos</h2>
        <p className="text-sm text-muted-foreground">No hay pagos registrados todavía.</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', paid: 'Pagado', failed: 'Fallido', refunded: 'Reembolsado',
  };
  const statusColor: Record<string, string> = {
    pending: 'text-yellow-600', paid: 'text-green-600', failed: 'text-red-600', refunded: 'text-blue-600',
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Historial de pagos</h2>
      <div className="space-y-2">
        {invoices.map(inv => (
          <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <div className="text-sm font-medium">USD {inv.amount_usd.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(inv.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <span className={`text-xs font-medium ${statusColor[inv.status] ?? ''}`}>
              {statusLabel[inv.status] ?? inv.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
