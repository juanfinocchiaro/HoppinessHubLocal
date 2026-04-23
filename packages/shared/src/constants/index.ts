export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_TYPES = ['salon', 'takeaway', 'delivery', 'webapp'] as const;
export type OrderType = typeof ORDER_TYPES[number];

export const ORDER_AREAS = ['salon', 'barra', 'terraza', 'delivery'] as const;
export type OrderArea = typeof ORDER_AREAS[number];

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'mercadopago',
  'qr',
  'point',
  'cuenta_corriente',
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const STOCK_MOVEMENT_TYPES = [
  'ingreso',
  'egreso',
  'ajuste',
  'venta',
  'merma',
  'transferencia',
] as const;
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number];

export const COMMUNICATION_TYPES = ['comunicado', 'novedad', 'alerta', 'protocolo'] as const;
export type CommunicationType = typeof COMMUNICATION_TYPES[number];

export const RECEIPT_TYPES = ['A', 'B', 'C'] as const;
export type ReceiptType = typeof RECEIPT_TYPES[number];

export const PERMISSION_SCOPES = ['brand', 'branch'] as const;
export type PermissionScope = typeof PERMISSION_SCOPES[number];

export const ROLE_KEYS = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'encargado',
  HR: 'rrhh',
  CASHIER: 'cajero',
  STAFF: 'empleado',
  FINANCIAL: 'finanzas',
  KITCHEN: 'cocina',
} as const;
