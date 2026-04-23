/**
 * Tipos para el módulo POS
 */
export type PedidoTipo = 'mostrador' | 'delivery' | 'webapp';

/** Canal de venta: mostrador (local) o apps (Rappi, PeYa, MP) */
export type CanalVenta = 'mostrador' | 'apps';

/** Tipo de servicio cuando canal = mostrador */
export type TipoServicio = 'takeaway' | 'comer_aca' | 'delivery';

/** App de delivery cuando canal = apps */
export type CanalApp = 'rappi' | 'pedidos_ya' | 'mp_delivery';

/** Tipo de comprobante fiscal (RI emite A o B, nunca C) */
export type TipoFactura = 'B' | 'A';

export interface OrderConfig {
  canalVenta: CanalVenta;
  tipoServicio: TipoServicio;
  canalApp: CanalApp;
  numeroLlamador: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  /** Identificador del pedido en la plataforma (Rappi: 6 dígitos, MP: 3 dígitos, PeYa: nombre) */
  referenciaApp: string;
  /** Tipo de comprobante fiscal */
  tipoFactura: TipoFactura;
  /** CUIT del receptor (requerido para A/B) */
  receptorCuit: string;
  /** Razón social del receptor (requerido para A/B) */
  receptorRazonSocial: string;
  /** Email para envío de factura (opcional) */
  receptorEmail: string;
  /** Costo de envío cobrado al cliente */
  costoDelivery?: number;
  /** Descuento aplicado por la plataforma (Rappi/PeYa/etc.) */
  descuentoPlataforma?: number;
  /** Descuento aplicado por el restaurante (promos propias) */
  descuentoRestaurante?: number;
  /** Modo del descuento restaurante: monto fijo o porcentaje sobre subtotal */
  descuentoModo?: 'pesos' | 'porcentaje';
  /** ID del código de descuento (voucher) aplicado */
  voucherCodigoId?: string;
  /** Texto del código de voucher (ej: "PROMO20") */
  voucherCodigo?: string;
  /** Monto descontado por el voucher */
  voucherDescuento?: number;
  /** user_id del cliente identificado por teléfono (para vincular pedido y guardar dirección) */
  clienteUserId?: string;
}

export const DEFAULT_ORDER_CONFIG: OrderConfig = {
  canalVenta: 'mostrador',
  tipoServicio: 'takeaway',
  canalApp: 'rappi',
  numeroLlamador: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  referenciaApp: '',
  tipoFactura: 'B',
  receptorCuit: '',
  receptorRazonSocial: '',
  receptorEmail: '',
  costoDelivery: 0,
  descuentoPlataforma: 0,
  descuentoRestaurante: 0,
};

export type PedidoEstado =
  | 'pendiente_pago'
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'listo_retiro'
  | 'listo_mesa'
  | 'listo_envio'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export type PedidoItemEstacion = 'parrilla' | 'armado' | 'fritura' | 'entrega' | 'bebidas';

export type ModificadorTipo = 'extra' | 'sin' | 'cambio';

export type MetodoPago =
  | 'cash'
  | 'debit_card'
  | 'credit_card'
  | 'mercadopago_qr'
  | 'transfer';

export interface CartItemExtra {
  id: string;
  name: string;
  precio: number;
  quantity: number;
}

export interface CartItemRemovible {
  id: string;
  name: string;
}

export interface CartItemOpcional {
  grupoId: string;
  grupoNombre: string;
  itemId: string;
  name: string;
}

export interface CartItem {
  item_carta_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
  extras?: CartItemExtra[];
  removibles?: CartItemRemovible[];
  opcionales?: CartItemOpcional[];
  reference_price?: number;
  categoria_carta_id?: string | null;
  createdAt?: number;
  /** Promo aplicada (si corresponde) */
  promo_id?: string;
  /** Restricción de pago de la promo aplicada */
  promo_restriccion_pago?: 'cualquiera' | 'solo_efectivo' | 'solo_digital';
  /** Descuento unitario automático por promoción */
  promo_descuento?: number;
  /** Nombre de la promoción aplicada */
  promo_nombre?: string;
}

/** Pago registrado localmente antes de enviar a cocina */
export interface LocalPayment {
  id: string;
  method: MetodoPago;
  amount: number;
  montoRecibido?: number;
  vuelto?: number;
  createdAt: number;
}
