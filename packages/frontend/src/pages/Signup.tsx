import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '../services/apiClient.js';
import { setAuthTokens } from '../services/apiClient.js';

interface BusinessType {
  key: string;
  label: string;
}

const COUNTRIES = [
  { code: 'AR', label: 'Argentina' },
  { code: 'MX', label: 'México' },
  { code: 'CL', label: 'Chile' },
  { code: 'CO', label: 'Colombia' },
  { code: 'UY', label: 'Uruguay' },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    business_name: '',
    business_type: '',
    country: 'AR',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: businessTypes = [] } = useQuery<BusinessType[]>({
    queryKey: ['saas', 'business-types'],
    queryFn: () => apiGet<BusinessType[]>('/saas/business-types'),
  });

  const signupMutation = useMutation({
    mutationFn: (data: typeof form) => apiPost('/saas/signup', data),
    onSuccess: (data: any) => {
      if (data?.tokens) {
        setAuthTokens(data.tokens);
      }
      navigate('/bienvenido', { replace: true });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    signupMutation.mutate(form);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Empezá gratis</h1>
          <p className="text-muted-foreground mt-2">14 días sin tarjeta de crédito. Cancelá cuando quieras.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email del negocio</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="hola@turestaurante.com"
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre de tu negocio</label>
            <input
              type="text"
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              placeholder="Ej: La Burguesía, Pizzería Don Vito..."
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo de negocio</label>
            <select
              name="business_type"
              value={form.business_type}
              onChange={handleChange}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccioná tu tipo de negocio</option>
              {businessTypes.map(bt => (
                <option key={bt.key} value={bt.key}>{bt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">País</label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signupMutation.isPending}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {signupMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Al crear tu cuenta aceptás los{' '}
            <a href="#" className="underline">Términos de servicio</a> y la{' '}
            <a href="#" className="underline">Política de privacidad</a>.
          </p>
        </form>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{' '}
          <Link to="/ingresar" className="font-medium text-primary hover:underline">
            Ingresá acá
          </Link>
        </p>
      </div>
    </div>
  );
}
