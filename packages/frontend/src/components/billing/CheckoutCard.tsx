import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubscription, type Plan } from '../../services/billingService.js';

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY ?? '';

interface CheckoutCardProps {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: () => void;
}

/**
 * MercadoPago card tokenization form.
 * In production, uses @mercadopago/sdk-js to tokenize the card and obtain
 * a card_token_id. In development (no public key), shows a test form.
 */
export function CheckoutCard({ plan, billingCycle, onSuccess }: CheckoutCardProps) {
  const queryClient = useQueryClient();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const price = billingCycle === 'yearly' ? plan.price_yearly_usd : plan.price_monthly_usd;

  const mutation = useMutation({
    mutationFn: (cardTokenId: string) =>
      createSubscription({ planId: plan.id, billingCycle, cardTokenId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      onSuccess();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!MP_PUBLIC_KEY) {
      // Dev / sandbox mode: generate a fake token for testing
      mutation.mutate(`TEST-${Date.now()}`);
      return;
    }

    try {
      // Production: use MP SDK to tokenize
      const mp = (window as any).MercadoPago;
      if (!mp) throw new Error('MercadoPago SDK not loaded');

      const mpInstance = new mp(MP_PUBLIC_KEY);
      const [expMonth, expYear] = expiry.split('/');

      const tokenResult = await mpInstance.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName: cardName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: `20${expYear}`,
        securityCode: cvv,
      });

      if (tokenResult.error) throw new Error(tokenResult.error);
      mutation.mutate(tokenResult.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la tarjeta');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <span className="font-medium">{plan.name}</span> — USD {price}/{billingCycle === 'yearly' ? 'año' : 'mes'}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Número de tarjeta</label>
        <input
          type="text"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={e => setCardNumber(e.target.value)}
          maxLength={19}
          required
          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nombre en la tarjeta</label>
        <input
          type="text"
          placeholder="Como figura en la tarjeta"
          value={cardName}
          onChange={e => setCardName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Vencimiento</label>
          <input
            type="text"
            placeholder="MM/AA"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            maxLength={5}
            required
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CVV</label>
          <input
            type="text"
            placeholder="123"
            value={cvv}
            onChange={e => setCvv(e.target.value)}
            maxLength={4}
            required
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {mutation.isPending ? 'Procesando...' : `Activar plan ${plan.name}`}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Pago procesado de forma segura por MercadoPago. No almacenamos datos de tu tarjeta.
      </p>
    </form>
  );
}
