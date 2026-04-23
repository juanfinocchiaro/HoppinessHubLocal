import type { CartItem, LocalPayment, OrderConfig } from '@/types/pos';

export interface POSTotals {
  subtotal: number;
  costoEnvio: number;
  descRestauranteCalc: number;
  promoDescTotal: number;
  descuentos: number;
  voucherDesc: number;
  totalToPay: number;
  totalPaid: number;
  paidCash: number;
  paidDigital: number;
  minCashRequired: number;
  minDigitalRequired: number;
  minCashRemaining: number;
  minDigitalRemaining: number;
  saldo: number;
  canSend: boolean;
}

export function calculatePOSTotals(
  cart: CartItem[],
  payments: LocalPayment[],
  orderConfig: OrderConfig,
): POSTotals {
  const isAppsChannel = orderConfig.canalVenta === 'apps';

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const costoEnvio =
    orderConfig.tipoServicio === 'delivery' || isAppsChannel ? (orderConfig.costoDelivery ?? 0) : 0;

  const descRestauranteRaw = orderConfig.descuentoRestaurante ?? 0;
  const descRestauranteCalc =
    orderConfig.descuentoModo === 'porcentaje'
      ? Math.round((subtotal * descRestauranteRaw) / 100)
      : descRestauranteRaw;

  const voucherDesc = orderConfig.voucherDescuento ?? 0;
  const promoDescTotal = cart.reduce((s, i) => s + (i.promo_descuento ?? 0) * i.quantity, 0);
  const descuentos = (orderConfig.descuentoPlataforma ?? 0) + descRestauranteCalc + promoDescTotal;
  const totalToPay = subtotal + costoEnvio - descuentos - voucherDesc;

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const paidCash = payments
    .filter((p) => p.method === 'cash')
    .reduce((s, p) => s + p.amount, 0);
  const paidDigital = totalPaid - paidCash;

  const minCashRequired = cart
    .filter((i) => i.promo_restriccion_pago === 'solo_efectivo')
    .reduce((s, i) => s + i.subtotal, 0);
  const minDigitalRequired = cart
    .filter((i) => i.promo_restriccion_pago === 'solo_digital')
    .reduce((s, i) => s + i.subtotal, 0);
  const minCashRemaining = Math.max(0, minCashRequired - paidCash);
  const minDigitalRemaining = Math.max(0, minDigitalRequired - paidDigital);

  const saldo = isAppsChannel ? 0 : totalToPay - totalPaid;
  const meetsPromoPaymentRestrictions =
    paidCash + 0.0001 >= minCashRequired && paidDigital + 0.0001 >= minDigitalRequired;
  const canSend = isAppsChannel
    ? cart.length > 0
    : Math.abs(totalToPay - totalPaid) < 0.01 && cart.length > 0 && meetsPromoPaymentRestrictions;

  return {
    subtotal,
    costoEnvio,
    descRestauranteCalc,
    promoDescTotal,
    descuentos,
    voucherDesc,
    totalToPay,
    totalPaid,
    paidCash,
    paidDigital,
    minCashRequired,
    minDigitalRequired,
    minCashRemaining,
    minDigitalRemaining,
    saldo,
    canSend,
  };
}
