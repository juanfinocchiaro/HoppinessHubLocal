export type CheckoutPaymentMethod = 'mercadopago' | 'cash';
export type CheckoutServiceKey = 'retiro' | 'delivery';
export type CheckoutPaymentRestriction = 'cualquiera' | 'solo_efectivo' | 'solo_digital';

export interface SavedAddress {
  id: string;
  etiqueta: string;
  address: string;
  piso: string | null;
  referencia: string | null;
}

export interface ServicePaymentsConfig {
  cash: boolean;
  mercadopago: boolean;
}
