/**
 * Invoicing Rules - Determines whether an order should generate an electronic invoice
 * based on the branch's configured invoicing rules (reglas_facturacion).
 */

import type { ReglasFacturacion } from '@/types/shiftClosure';

export type PaymentMethod =
  | 'cash'
  | 'debito'
  | 'credito'
  | 'qr'
  | 'transfer'
  | 'mercadopago'
  | 'vouchers'
  | 'debit_card'
  | 'credit_card'
  | 'mercadopago_qr';

export interface OrderPayment {
  method: PaymentMethod;
  amount: number;
}

export type SalesChannel =
  | 'mostrador' // salon / comer_aca / takeaway
  | 'delivery' // delivery manual propio
  | 'rappi'
  | 'pedidosya'
  | 'mas_delivery'
  | 'mp_delivery';

/**
 * Maps a POS payment method to the corresponding invoicing rule key.
 * Returns null if the payment method isn't covered by the rules (shouldn't invoice).
 */
function getInternalRuleKey(
  method: PaymentMethod,
): keyof ReglasFacturacion['canales_internos'] | null {
  switch (method) {
    case 'cash':
      return 'efectivo';
    case 'debito':
    case 'debit_card':
      return 'debito';
    case 'credito':
    case 'credit_card':
      return 'credito';
    case 'qr':
    case 'mercadopago':
    case 'mercadopago_qr':
      return 'qr';
    case 'transfer':
      return 'transferencia';
    default:
      return null;
  }
}

/**
 * Determines whether an order should generate an invoice, and for how much.
 *
 * For internal channels (mostrador, delivery propio):
 *   - Each payment is checked against canales_internos rules
 *   - Only payments with enabled rules contribute to the invoiceable amount
 *
 * For external channels (apps):
 *   - Checked against canales_externos rules (the whole order is invoiced or not)
 */
export function evaluateInvoicing(
  payments: OrderPayment[],
  channel: SalesChannel,
  reglas: ReglasFacturacion | null | undefined,
): {
  shouldInvoice: boolean;
  invoiceableAmount: number;
  totalAmount: number;
} {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  // No rules = no auto-invoicing
  if (!reglas) {
    return { shouldInvoice: false, invoiceableAmount: 0, totalAmount };
  }

  // External channels: binary decision based on the channel rule
  if (channel === 'rappi') {
    const should = reglas.canales_externos.rappi;
    return { shouldInvoice: should, invoiceableAmount: should ? totalAmount : 0, totalAmount };
  }
  if (channel === 'pedidosya') {
    const should = reglas.canales_externos.pedidosya;
    return { shouldInvoice: should, invoiceableAmount: should ? totalAmount : 0, totalAmount };
  }
  if (channel === 'mp_delivery') {
    const should = reglas.canales_externos.mp_delivery;
    return { shouldInvoice: should, invoiceableAmount: should ? totalAmount : 0, totalAmount };
  }
  if (channel === 'mas_delivery') {
    // MásDelivery has split rules for cash vs digital
    let invoiceable = 0;
    for (const p of payments) {
      if (p.method === 'cash' && reglas.canales_externos.mas_delivery_efectivo) {
        invoiceable += p.amount;
      } else if (p.method !== 'cash' && reglas.canales_externos.mas_delivery_digital) {
        invoiceable += p.amount;
      }
    }
    return { shouldInvoice: invoiceable > 0, invoiceableAmount: invoiceable, totalAmount };
  }

  // Internal channels (mostrador, delivery propio): check each payment method
  let invoiceable = 0;
  for (const p of payments) {
    const ruleKey = getInternalRuleKey(p.method);
    if (ruleKey && reglas.canales_internos[ruleKey]) {
      invoiceable += p.amount;
    }
  }

  return {
    shouldInvoice: invoiceable > 0,
    invoiceableAmount: invoiceable,
    totalAmount,
  };
}
