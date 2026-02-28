export type DaySchedule = { enabled: boolean; from: string; to: string };

export type WebappPaymentMethods = { efectivo: boolean; mercadopago: boolean };

export type ServiceScheduleV2 = {
  enabled: boolean;
  prep_time: number;
  days: Record<string, DaySchedule>;
  payment_methods?: WebappPaymentMethods;
  radio_km?: number;
  costo?: number;
  pedido_minimo?: number;
};

export type BranchWebappAvailabilityRow = {
  itemId: string;
  nombre: string;
  categoriaNombre: string;
  categoriaOrden: number;
  productoOrden: number;
  marcaDisponibleWebapp: boolean;
  localDisponibleWebapp: boolean;
  outOfStock: boolean;
};

export const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

export const DAY_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sábado: 'Sábado',
  domingo: 'Domingo',
};
