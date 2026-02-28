export type CheckoutPaymentMethod = 'mercadopago' | 'efectivo';
export type CheckoutServiceKey = 'retiro' | 'delivery';
export type CheckoutPaymentRestriction = 'cualquiera' | 'solo_efectivo' | 'solo_digital';

export interface SavedAddress {
  id: string;
  etiqueta: string;
  direccion: string;
  piso: string | null;
  referencia: string | null;
}

export interface ServicePaymentsConfig {
  efectivo: boolean;
  mercadopago: boolean;
}
