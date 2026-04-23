import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../../services/apiClient.js';
import type { Plan, Subscription, Invoice } from '../../services/billingService.js';

interface MrrMetrics {
  mrr_usd: number;
  arr_usd: number;
  active_accounts: number;
  new_signups_30d: number;
  churn_rate_30d: number;
  breakdown: Array<{
    plan: string;
    plan_name: string;
    billing_cycle: string;
    count: number;
    mrr_usd: number;
  }>;
}

interface AdminAccount {
  account: {
    id: string;
    name: string;
    slug: string;
    country_code: string;
    business_type: string;
    is_grandfathered: boolean;
    created_at: string;
  };
  subscription: Subscription | null;
  plan: Plan | null;
}

type AdminView = 'overview' | 'accounts' | 'plans' | 'features';

export default function SaasAdminPage() {
  const [view, setView] = useState<AdminView>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">RestoStack Admin</div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Panel interno</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
          {(['overview', 'accounts', 'plans', 'features'] as AdminView[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setSelectedAccountId(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                view === v ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {{ overview: 'Overview', accounts: 'Cuentas', plans: 'Planes', features: 'Feature flags' }[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {view === 'overview' && <OverviewPanel />}
        {view === 'accounts' && (
          selectedAccountId
            ? <AccountDetail accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
            : <AccountsPanel onSelectAccount={setSelectedAccountId} />
        )}
        {view === 'plans' && <PlansPanel />}
        {view === 'features' && <FeatureFlagsPanel />}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewPanel() {
  const { data: metrics, isLoading } = useQuery<MrrMetrics>({
    queryKey: ['saas-admin', 'metrics', 'mrr'],
    queryFn: () => apiGet('/billing/admin/metrics/mrr'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingState />;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={`USD ${metrics.mrr_usd.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`} />
        <KpiCard label="ARR proyectado" value={`USD ${metrics.arr_usd.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`} />
        <KpiCard label="Cuentas activas" value={String(metrics.active_accounts)} />
        <KpiCard label="Nuevas (30d)" value={String(metrics.new_signups_30d)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Churn rate (30d)" value={`${metrics.churn_rate_30d}%`} alert={metrics.churn_rate_30d > 5} />
      </div>

      {/* MRR breakdown */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">MRR por plan</h3>
        <div className="space-y-3">
          {metrics.breakdown.map(row => (
            <div key={`${row.plan}-${row.billing_cycle}`} className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{row.plan_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{row.billing_cycle === 'yearly' ? 'anual' : 'mensual'}</span>
                <span className="ml-2 text-xs text-muted-foreground">× {row.count}</span>
              </div>
              <span className="text-sm font-semibold">USD {row.mrr_usd.toFixed(0)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total MRR</span>
            <span>USD {metrics.mrr_usd.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? 'border-red-200 bg-red-50' : 'bg-card'}`}>
      <div className={`text-xs font-medium mb-1 ${alert ? 'text-red-600' : 'text-muted-foreground'}`}>{label}</div>
      <div className={`text-2xl font-bold ${alert ? 'text-red-700' : ''}`}>{value}</div>
    </div>
  );
}

// ── Accounts List ─────────────────────────────────────────────────────────────

function AccountsPanel({ onSelectAccount }: { onSelectAccount: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: accounts = [], isLoading } = useQuery<AdminAccount[]>({
    queryKey: ['saas-admin', 'accounts'],
    queryFn: () => apiGet('/billing/admin/accounts'),
  });

  const filtered = accounts.filter(a => {
    const matchSearch = !search ||
      a.account.name.toLowerCase().includes(search.toLowerCase()) ||
      a.account.slug.includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.subscription?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cuentas</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Todos los estados</option>
            <option value="trialing">En prueba</option>
            <option value="active">Activas</option>
            <option value="past_due">Pago vencido</option>
            <option value="suspended">Suspendidas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {isLoading ? <LoadingState /> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Negocio</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">País</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Registro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ account, subscription, plan }) => (
                <tr key={account.id} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => onSelectAccount(account.id)}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-xs text-muted-foreground">{account.business_type}</div>
                    {account.is_grandfathered && (
                      <span className="text-xs text-purple-600 font-medium">★ grandfathered</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{plan?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={subscription?.status} />
                  </td>
                  <td className="px-4 py-3">{account.country_code}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(account.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-primary text-xs hover:underline">Ver →</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Account Detail ────────────────────────────────────────────────────────────

function AccountDetail({ accountId, onBack }: { accountId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{
    account: AdminAccount['account'];
    subscription: Subscription | null;
    plan: Plan | null;
    features: Array<{ feature_slug: string; is_enabled: boolean; source: string }>;
    invoices: Invoice[];
  }>({
    queryKey: ['saas-admin', 'accounts', accountId],
    queryFn: () => apiGet(`/billing/admin/accounts/${accountId}`),
  });

  const suspendMutation = useMutation({
    mutationFn: () => apiPut(`/billing/admin/accounts/${accountId}/suspend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saas-admin', 'accounts', accountId] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => apiPut(`/billing/admin/accounts/${accountId}/reactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saas-admin', 'accounts', accountId] }),
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => apiPost(`/billing/admin/impersonate/${userId}`),
    onSuccess: (result: any) => {
      if (result?.tokens) {
        window.open(`/mimarca?impersonate=1`, '_blank');
      }
    },
  });

  if (isLoading) return <LoadingState />;
  if (!data) return null;

  const { account, subscription, plan, features, invoices } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground text-sm">← Volver</button>
        <h2 className="text-xl font-semibold">{account.name}</h2>
        {account.is_grandfathered && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">★ grandfathered</span>
        )}
        <StatusBadge status={subscription?.status} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Plan" value={plan?.name ?? 'Sin plan'} />
        <KpiCard label="Estado" value={subscription?.status ?? '—'} />
        <KpiCard label="País" value={account.country_code} />
        <KpiCard label="Tipo" value={account.business_type} />
      </div>

      {/* Subscription details */}
      {subscription && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-3">Suscripción</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Ciclo</div>
              <div>{subscription.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}</div>
            </div>
            {subscription.trial_ends_at && (
              <div>
                <div className="text-muted-foreground">Trial termina</div>
                <div>{new Date(subscription.trial_ends_at).toLocaleDateString('es-AR')}</div>
              </div>
            )}
            {subscription.current_period_end && (
              <div>
                <div className="text-muted-foreground">Próximo cobro</div>
                <div>{new Date(subscription.current_period_end).toLocaleDateString('es-AR')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature flags */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3">Feature flags</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {features.map(f => (
            <div key={f.feature_slug} className={`flex items-center justify-between rounded-md px-3 py-2 text-xs ${f.is_enabled ? 'bg-green-50 text-green-800' : 'bg-muted text-muted-foreground'}`}>
              <span className="font-mono">{f.feature_slug}</span>
              <span className="text-xs opacity-60">{f.source === 'manual_override' ? '✎' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3">Facturas</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin facturas</p>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">USD {inv.amount_usd.toFixed(2)}</span>
                  <span className="ml-2 text-muted-foreground text-xs">{new Date(inv.created_at).toLocaleDateString('es-AR')}</span>
                </div>
                <StatusBadge status={inv.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3">Acciones administrativas</h3>
        <div className="flex flex-wrap gap-3">
          {subscription?.status !== 'suspended' && !account.is_grandfathered && (
            <button
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Suspender cuenta
            </button>
          )}
          {subscription?.status === 'suspended' && (
            <button
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="rounded-md border border-green-600 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
            >
              Reactivar cuenta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plans Management ──────────────────────────────────────────────────────────

function PlansPanel() {
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['saas-admin', 'plans'],
    queryFn: () => apiGet('/billing/admin/plans'),
  });

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formValues, setFormValues] = useState<Partial<Plan>>({});

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<Plan> }) =>
      apiPut(`/billing/admin/plans/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-admin', 'plans'] });
      setEditingPlan(null);
    },
  });

  function startEdit(plan: Plan) {
    setEditingPlan(plan);
    setFormValues({
      name: plan.name,
      description: plan.description,
      price_monthly_usd: plan.price_monthly_usd,
      price_yearly_usd: plan.price_yearly_usd,
      max_locations: plan.max_locations,
      is_active: plan.is_active,
    });
  }

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Planes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold">{plan.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{plan.slug}</div>
              </div>
              <div className="flex gap-2">
                {!plan.is_active && <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactivo</span>}
                <button onClick={() => startEdit(plan)} className="text-xs text-primary hover:underline">Editar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Mensual</div>
                <div className="font-medium">USD {plan.price_monthly_usd}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Anual</div>
                <div className="font-medium">USD {plan.price_yearly_usd}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {plan.max_locations ? `Hasta ${plan.max_locations} locales` : 'Locales ilimitados'}
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Editar plan: {editingPlan.name}</h3>
              <button onClick={() => setEditingPlan(null)} className="text-muted-foreground">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nombre</label>
                <input
                  value={formValues.name ?? ''}
                  onChange={e => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Descripción</label>
                <input
                  value={formValues.description ?? ''}
                  onChange={e => setFormValues(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Precio mensual (USD)</label>
                  <input
                    type="number"
                    value={formValues.price_monthly_usd ?? 0}
                    onChange={e => setFormValues(prev => ({ ...prev, price_monthly_usd: Number(e.target.value) }))}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Precio anual (USD)</label>
                  <input
                    type="number"
                    value={formValues.price_yearly_usd ?? 0}
                    onChange={e => setFormValues(prev => ({ ...prev, price_yearly_usd: Number(e.target.value) }))}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Máx. locales (vacío = ilimitado)</label>
                <input
                  type="number"
                  value={formValues.max_locations ?? ''}
                  onChange={e => setFormValues(prev => ({ ...prev, max_locations: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formValues.is_active ?? true}
                  onChange={e => setFormValues(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                Plan activo
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => updateMutation.mutate({ id: editingPlan.id, values: formValues })}
                disabled={updateMutation.isPending}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditingPlan(null)} className="rounded-md border px-4 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feature Flags Overrides ───────────────────────────────────────────────────

function FeatureFlagsPanel() {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [featureSlug, setFeatureSlug] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const overrideMutation = useMutation({
    mutationFn: () => apiPut(`/billing/admin/accounts/${accountId}/features`, { featureSlug, isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-admin'] });
      setAccountId('');
      setFeatureSlug('');
    },
  });

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-xl font-semibold">Feature flags — override manual</h2>
      <p className="text-sm text-muted-foreground">
        Activá o desactivá features específicas por cuenta, independientemente del plan.
        Útil para beta testers, soporte, y configuraciones especiales.
      </p>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Account ID</label>
          <input
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            placeholder="uuid de la cuenta"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Feature slug</label>
          <input
            value={featureSlug}
            onChange={e => setFeatureSlug(e.target.value)}
            placeholder="ej: cost_tracking"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background font-mono"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />
          Habilitar feature
        </label>
        <button
          onClick={() => overrideMutation.mutate()}
          disabled={!accountId || !featureSlug || overrideMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {overrideMutation.isPending ? 'Aplicando...' : 'Aplicar override'}
        </button>
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700' },
    active: { label: 'Activa', className: 'bg-green-100 text-green-700' },
    past_due: { label: 'Vencida', className: 'bg-yellow-100 text-yellow-700' },
    read_only: { label: 'Solo lectura', className: 'bg-orange-100 text-orange-700' },
    suspended: { label: 'Suspendida', className: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600' },
    pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700' },
    paid: { label: 'Pagado', className: 'bg-green-100 text-green-700' },
    failed: { label: 'Fallido', className: 'bg-red-100 text-red-700' },
    refunded: { label: 'Reembolsado', className: 'bg-blue-100 text-blue-700' },
  };
  const c = config[status ?? ''] ?? { label: status ?? '—', className: 'bg-muted text-muted-foreground' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>{c.label}</span>;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
      Cargando...
    </div>
  );
}
