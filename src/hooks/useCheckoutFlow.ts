import { useMemo } from 'react';
import type {
  CheckoutPaymentMethod,
  CheckoutPaymentRestriction,
  CheckoutServiceKey,
  ServicePaymentsConfig,
} from '@/types/checkout';

interface PromoItemLike {
  item_carta_id: string;
  promocion_id: string;
  restriccion_pago?: CheckoutPaymentRestriction | null;
}

interface PromoLike {
  id: string;
  restriccion_pago?: CheckoutPaymentRestriction | null;
}

interface CartItemLike {
  itemId: string;
  sourceItemId?: string;
}

interface CheckoutFlowParams {
  activePromoItems: PromoItemLike[];
  activePromos: PromoLike[];
  cartItems: CartItemLike[];
  servicePayments: ServicePaymentsConfig;
  mpEnabled: boolean;
  serviceKey: CheckoutServiceKey;
}

export function useCheckoutPaymentRestrictions({
  activePromoItems,
  activePromos,
  cartItems,
  servicePayments,
  mpEnabled,
  serviceKey,
}: CheckoutFlowParams) {
  return useMemo(() => {
    const promoItemByItemId = new Map(
      activePromoItems.map((pi) => [pi.item_carta_id, pi] as const),
    );
    const promoById = new Map(activePromos.map((p) => [p.id, p] as const));

    let hasCashOnly = false;
    let hasDigitalOnly = false;
    for (const ci of cartItems) {
      const pi = promoItemByItemId.get(ci.sourceItemId ?? ci.itemId);
      if (!pi) continue;
      const promo = promoById.get(pi.promocion_id);
      const r = promo?.restriccion_pago ?? pi.restriccion_pago ?? 'cualquiera';
      if (r === 'solo_efectivo') hasCashOnly = true;
      if (r === 'solo_digital') hasDigitalOnly = true;
    }

    const cashAllowed = !!servicePayments.efectivo;
    const mpAllowed = !!servicePayments.mercadopago && mpEnabled;

    let allowCash = cashAllowed;
    let allowMp = mpAllowed;
    if (hasCashOnly) allowMp = false;
    if (hasDigitalOnly) allowCash = false;

    const conflict = (hasCashOnly && hasDigitalOnly) || (!allowCash && !allowMp);

    const forced: CheckoutPaymentMethod | null = conflict
      ? null
      : allowCash !== allowMp
        ? allowCash
          ? 'efectivo'
          : 'mercadopago'
        : null;

    const svcLabel = serviceKey === 'delivery' ? 'delivery' : 'retiro';
    const reason = conflict
      ? hasCashOnly && !cashAllowed
        ? `Este local no acepta efectivo para ${svcLabel}.`
        : hasDigitalOnly && !mpAllowed
          ? `Este local no acepta MercadoPago para ${svcLabel}.`
          : !cashAllowed && !mpAllowed
            ? `Este local no tiene medios de pago habilitados para ${svcLabel}.`
            : hasCashOnly && hasDigitalOnly
              ? 'Tu carrito tiene promociones con restricciones incompatibles (solo efectivo y solo digital).'
              : 'No hay un método de pago disponible para este carrito.'
      : hasCashOnly
        ? 'Esta promo requiere pago en efectivo.'
        : hasDigitalOnly
          ? 'Esta promo requiere pago digital (MercadoPago).'
          : !cashAllowed
            ? `Efectivo no está habilitado para ${svcLabel}.`
            : null;

    return { conflict, forced, cashAllowed, mpAllowed, hasCashOnly, hasDigitalOnly, reason };
  }, [activePromoItems, activePromos, cartItems, servicePayments, mpEnabled, serviceKey]);
}
