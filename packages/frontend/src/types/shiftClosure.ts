/**
 * Types for the Shift Closure System
 * Hoppiness Hub Platform
 */

// Shift values
export type ShiftType = 'mañana' | 'mediodía' | 'noche' | 'trasnoche';

// Burger categories and types
export interface HamburguesasData {
  clasicas: number;
  originales: number;
  mas_sabor: number;
  veggies: {
    not_american: number;
    not_claudio: number;
  };
  ultrasmash: {
    ultra_cheese: number;
    ultra_bacon: number;
  };
  extras: {
    extra_carne: number;
    extra_not_burger: number;
    extra_not_chicken: number;
  };
}

// Payment methods for local sales
export interface ChannelPayments {
  efectivo: number;
  debito: number;
  credito: number;
  qr: number;
  transferencia: number;
}

// Posnet comparison data
export interface ComparacionPosnet {
  total_posnet: number; // Total from Posnet terminal (cards)
}

// Local sales by channel and payment method
export interface VentasLocalData {
  salon: ChannelPayments;
  takeaway: ChannelPayments;
  delivery_manual: ChannelPayments;
  comparacion_posnet: ComparacionPosnet;
}

// App sales with their specific payment methods and panel comparison
export interface VentasAppsData {
  mas_delivery: {
    efectivo: number; // Payment type "Efectivo" in Núcleo
    mercadopago: number; // Payment type "MercadoPago" in Núcleo
    cobrado_posnet: number; // Orders entered as cash but paid by card at store
    total_panel: number; // Total from MásDelivery panel
  };
  rappi: {
    vales: number; // Payment type "Vales" in Núcleo
    total_panel: number; // Total from Rappi panel
  };
  pedidosya: {
    efectivo: number; // Payment type "Efectivo" in Núcleo
    vales: number; // Payment type "Vales" in Núcleo
    total_panel: number; // Total from PeYa panel
  };
  mp_delivery: {
    vales: number; // Payment type "Vales" in Núcleo
    total_panel: number; // Total from MP Delivery panel
  };
}

// Cash count data
export interface ArqueoCaja {
  diferencia_caja: number; // Cash difference from Núcleo (can be negative)
}

// Full shift closure record
export interface ShiftClosure {
  id: string;
  branch_id: string;
  date: string; // DATE as string 'YYYY-MM-DD'
  shift: ShiftType;
  source?: 'pos' | 'manual'; // pos = generado desde POS, manual = carga manual

  hamburguesas: HamburguesasData;
  ventas_local: VentasLocalData;
  ventas_apps: VentasAppsData;
  arqueo_caja: ArqueoCaja;

  total_facturado: number;
  total_hamburguesas: number;
  total_vendido: number;
  total_efectivo: number;
  total_digital: number;

  facturacion_esperada: number;
  facturacion_diferencia: number;
  tiene_alerta_facturacion: boolean;

  diferencia_posnet: number;
  diferencia_apps: number;
  tiene_alerta_posnet: boolean;
  tiene_alerta_apps: boolean;
  tiene_alerta_caja: boolean;

  notes: string | null;

  closed_by: string;
  cerrado_at: string;
  updated_at: string | null;
  updated_by: string | null;
}

// For creating/updating closures
export interface ShiftClosureInput {
  branch_id: string;
  date: string;
  shift: ShiftType;
  hamburguesas: HamburguesasData;
  ventas_local: VentasLocalData;
  ventas_apps: VentasAppsData;
  arqueo_caja: ArqueoCaja;
  total_facturado: number;
  notes?: string;
  reglas_facturacion?: ReglasFacturacion | null;
}

// Configuration types
export type ConfigTipo = 'categoria_hamburguesa' | 'tipo_hamburguesa' | 'extra' | 'app_delivery';

export interface ClosureConfigItem {
  id: string;
  type: ConfigTipo;
  key: string;
  label: string;
  categoria_padre: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BranchClosureConfig {
  id: string;
  branch_id: string;
  config_id: string;
  enabled: boolean;
}

// ==========================================
// CALCULATION FUNCTIONS
// ==========================================

export function calcularTotalesHamburguesas(data: HamburguesasData): number {
  return (
    data.clasicas +
    data.originales +
    data.mas_sabor +
    data.veggies.not_american +
    data.veggies.not_claudio +
    data.ultrasmash.ultra_cheese +
    data.ultrasmash.ultra_bacon
    // Extras no cuentan como hamburguesas completas
  );
}

export function calcularTotalCanal(canal: ChannelPayments): number {
  return canal.efectivo + canal.debito + canal.credito + canal.qr + canal.transferencia;
}

export function calcularTotalesVentasLocal(data: VentasLocalData): {
  total: number;
  efectivo: number;
  digital: number;
} {
  const salonTotal = calcularTotalCanal(data.salon);
  const takeawayTotal = calcularTotalCanal(data.takeaway);
  const deliveryTotal = calcularTotalCanal(data.delivery_manual);

  const efectivo = data.salon.efectivo + data.takeaway.efectivo + data.delivery_manual.efectivo;
  const total = salonTotal + takeawayTotal + deliveryTotal;

  return {
    total,
    efectivo,
    digital: total - efectivo,
  };
}

// Calculate total cards in Núcleo (for Posnet comparison)
// Includes cobrado_posnet from MásDelivery (orders that changed payment method to card)
export function calcularTotalTarjetasNucleo(
  ventasLocal: VentasLocalData,
  ventasApps?: VentasAppsData,
): number {
  const canales = [ventasLocal.salon, ventasLocal.takeaway, ventasLocal.delivery_manual];
  const tarjetasLocal = canales.reduce(
    (sum, canal) => sum + canal.debito + canal.credito + canal.qr,
    0,
  );
  const cobradoPosnet = ventasApps?.mas_delivery?.cobrado_posnet || 0;
  return tarjetasLocal + cobradoPosnet;
}

// Calculate card breakdown for display
export function calcularDesgloseTarjetas(ventasLocal: VentasLocalData): {
  debito: number;
  credito: number;
  qr: number;
} {
  const canales = [ventasLocal.salon, ventasLocal.takeaway, ventasLocal.delivery_manual];
  return {
    debito: canales.reduce((sum, c) => sum + c.debito, 0),
    credito: canales.reduce((sum, c) => sum + c.credito, 0),
    qr: canales.reduce((sum, c) => sum + c.qr, 0),
  };
}

// Calculate Posnet difference
export function calcularDiferenciaPosnet(
  ventasLocal: VentasLocalData,
  ventasApps?: VentasAppsData,
): {
  nucleo: number;
  posnet: number;
  diferencia: number;
  tieneAlerta: boolean;
} {
  const nucleo = calcularTotalTarjetasNucleo(ventasLocal, ventasApps);
  const posnet = ventasLocal.comparacion_posnet?.total_posnet || 0;
  const diferencia = nucleo - posnet;
  return {
    nucleo,
    posnet,
    diferencia,
    tieneAlerta: diferencia !== 0,
  };
}

// Calculate Núcleo totals for each app
function calcularNucleoApp(app: keyof VentasAppsData, data: VentasAppsData): number {
  switch (app) {
    case 'mas_delivery':
      return data.mas_delivery.efectivo + data.mas_delivery.mercadopago;
    case 'rappi':
      return data.rappi.vales;
    case 'pedidosya':
      return data.pedidosya.efectivo + data.pedidosya.vales;
    case 'mp_delivery':
      return data.mp_delivery.vales;
    default:
      return 0;
  }
}

// Calculate app differences
export function calcularDiferenciasApps(ventasApps: VentasAppsData): {
  porApp: {
    mas_delivery: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
    rappi: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
    pedidosya: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
    mp_delivery: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
  };
  totalNucleo: number;
  totalPaneles: number;
  diferencia: number;
  tieneAlerta: boolean;
} {
  const apps: Array<keyof VentasAppsData> = ['mas_delivery', 'rappi', 'pedidosya', 'mp_delivery'];

  const porApp = {} as any;
  let totalNucleo = 0;
  let totalPaneles = 0;

  for (const app of apps) {
    const nucleo = calcularNucleoApp(app, ventasApps);
    const panel = ventasApps[app].total_panel || 0;
    const diferencia = nucleo - panel;

    porApp[app] = {
      nucleo,
      panel,
      diferencia,
      tieneAlerta: diferencia !== 0 && panel > 0, // Only alert if panel was filled
    };

    totalNucleo += nucleo;
    totalPaneles += panel;
  }

  const diferencia = totalNucleo - totalPaneles;

  return {
    porApp,
    totalNucleo,
    totalPaneles,
    diferencia,
    tieneAlerta: diferencia !== 0 && totalPaneles > 0,
  };
}

export function calcularTotalesVentasApps(data: VentasAppsData): {
  total: number;
  efectivo: number;
  digital: number;
} {
  const masDeliveryTotal = data.mas_delivery.efectivo + data.mas_delivery.mercadopago;
  const rappiTotal = data.rappi.vales;
  const pedidosyaTotal = data.pedidosya.efectivo + data.pedidosya.vales;
  const mpDeliveryTotal = data.mp_delivery.vales;

  const efectivo = data.mas_delivery.efectivo + data.pedidosya.efectivo;
  const total = masDeliveryTotal + rappiTotal + pedidosyaTotal + mpDeliveryTotal;

  return {
    total,
    efectivo,
    digital: total - efectivo,
  };
}

export interface ReglasFacturacion {
  canales_internos: {
    efectivo: boolean;
    debito: boolean;
    credito: boolean;
    qr: boolean;
    transferencia: boolean;
  };
  canales_externos: {
    rappi: boolean;
    pedidosya: boolean;
    mas_delivery_efectivo: boolean;
    mas_delivery_digital: boolean;
    mp_delivery: boolean;
  };
}

const DEFAULT_REGLAS: ReglasFacturacion = {
  canales_internos: { efectivo: false, debito: true, credito: true, qr: true, transferencia: true },
  canales_externos: {
    rappi: true,
    pedidosya: true,
    mas_delivery_efectivo: false,
    mas_delivery_digital: true,
    mp_delivery: true,
  },
};

export function calcularFacturacionEsperada(
  ventasLocal: VentasLocalData,
  ventasApps: VentasAppsData,
  reglas?: ReglasFacturacion | null,
): number {
  const r = reglas || DEFAULT_REGLAS;

  // Canales internos: sumar solo los métodos habilitados
  let totalLocal = 0;
  const canalesLocales = [ventasLocal.salon, ventasLocal.takeaway, ventasLocal.delivery_manual];
  for (const canal of canalesLocales) {
    if (r.canales_internos.efectivo) totalLocal += canal.efectivo;
    if (r.canales_internos.debito) totalLocal += canal.debito;
    if (r.canales_internos.credito) totalLocal += canal.credito;
    if (r.canales_internos.qr) totalLocal += canal.qr;
    if (r.canales_internos.transferencia) totalLocal += canal.transferencia;
  }

  // Canales externos
  let totalExterno = 0;

  if (r.canales_externos.rappi) {
    totalExterno += ventasApps.rappi.vales;
  }

  if (r.canales_externos.pedidosya) {
    totalExterno += ventasApps.pedidosya.efectivo + ventasApps.pedidosya.vales;
  }

  const cobradoPosnet = ventasApps.mas_delivery.cobrado_posnet || 0;
  if (r.canales_externos.mas_delivery_efectivo) {
    totalExterno += ventasApps.mas_delivery.efectivo - cobradoPosnet;
  }
  if (r.canales_externos.mas_delivery_digital) {
    totalExterno += ventasApps.mas_delivery.mercadopago + cobradoPosnet;
  }

  if (r.canales_externos.mp_delivery) {
    totalExterno += ventasApps.mp_delivery?.vales || 0;
  }

  return totalLocal + totalExterno;
}

/** Calcula el total NO facturado según las reglas */
export function calcularNoFacturado(
  ventasLocal: VentasLocalData,
  ventasApps: VentasAppsData,
  reglas?: ReglasFacturacion | null,
): number {
  const totalesLocal = calcularTotalesVentasLocal(ventasLocal);
  const totalesApps = calcularTotalesVentasApps(ventasApps);
  const totalVendido = totalesLocal.total + totalesApps.total;
  const facturado = calcularFacturacionEsperada(ventasLocal, ventasApps, reglas);
  return totalVendido - facturado;
}

// ==========================================
// DEFAULT VALUES
// ==========================================

export function getDefaultHamburguesas(): HamburguesasData {
  return {
    clasicas: 0,
    originales: 0,
    mas_sabor: 0,
    veggies: { not_american: 0, not_claudio: 0 },
    ultrasmash: { ultra_cheese: 0, ultra_bacon: 0 },
    extras: { extra_carne: 0, extra_not_burger: 0, extra_not_chicken: 0 },
  };
}

export function getDefaultVentasLocal(): VentasLocalData {
  return {
    salon: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    takeaway: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    delivery_manual: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    comparacion_posnet: { total_posnet: 0 },
  };
}

export function getDefaultVentasApps(): VentasAppsData {
  return {
    mas_delivery: { efectivo: 0, mercadopago: 0, cobrado_posnet: 0, total_panel: 0 },
    rappi: { vales: 0, total_panel: 0 },
    pedidosya: { efectivo: 0, vales: 0, total_panel: 0 },
    mp_delivery: { vales: 0, total_panel: 0 },
  };
}

export function getDefaultArqueoCaja(): ArqueoCaja {
  return { diferencia_caja: 0 };
}

// Migration helper: convert old VentasAppsData to new format
export function migrateVentasApps(data: any): VentasAppsData {
  // Handle old format that had 'app' instead of 'vales' and no 'total_panel'
  return {
    mas_delivery: {
      efectivo: data?.mas_delivery?.efectivo || 0,
      mercadopago: data?.mas_delivery?.mercadopago || 0,
      cobrado_posnet: data?.mas_delivery?.cobrado_posnet || 0,
      total_panel: data?.mas_delivery?.total_panel || 0,
    },
    rappi: {
      vales: data?.rappi?.vales || data?.rappi?.app || 0,
      total_panel: data?.rappi?.total_panel || 0,
    },
    pedidosya: {
      efectivo: data?.pedidosya?.efectivo || 0,
      vales: data?.pedidosya?.vales || data?.pedidosya?.app || 0,
      total_panel: data?.pedidosya?.total_panel || 0,
    },
    mp_delivery: {
      vales: data?.mp_delivery?.vales || data?.mp_delivery?.app || 0,
      total_panel: data?.mp_delivery?.total_panel || 0,
    },
  };
}

// Migration helper: ensure VentasLocalData has comparacion_posnet
export function migrateVentasLocal(data: any): VentasLocalData {
  return {
    salon: data?.salon || { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    takeaway: data?.takeaway || { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    delivery_manual: data?.delivery_manual || {
      efectivo: 0,
      debito: 0,
      credito: 0,
      qr: 0,
      transferencia: 0,
    },
    comparacion_posnet: data?.comparacion_posnet || { total_posnet: 0 },
  };
}
