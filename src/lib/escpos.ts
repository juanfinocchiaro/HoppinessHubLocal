/**
 * ESC/POS Command Generator for thermal printers
 * Hoppiness Club — Sistema de tickets térmicos v2
 *
 * Genera comandos raw para impresoras térmicas 80mm y 58mm.
 * Los bitmaps se envían como marcadores __BITMAP_B64:...:END__
 * que el Print Bridge (Node.js en localhost:3001) convierte a
 * raster ESC/POS (GS v 0).
 */

import QRCode from 'qrcode';

// ─── ESC/POS Commands ────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  DOUBLE_WIDTH: [GS, 0x21, 0x10],
  DOUBLE_SIZE: [GS, 0x21, 0x11],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  CUT_PAPER: [GS, 0x56, 0x41, 0x03],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  LINE_SPACING: (n: number) => [ESC, 0x33, n],
} as const;

// ─── Logo bitmap ─────────────────────────────────────────────
// Logo Hoppiness Club invertido para impresión térmica.
// Monocromático 200x200px. Trazos en negro, fondo transparente.
// El Print Bridge convierte este PNG base64 a raster ESC/POS.
const LOGO_THERMAL_B64 =
  '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';

// ─── Builder ─────────────────────────────────────────────────
class EscPosBuilder {
  private buffer: number[] = [];

  init() {
    this.buffer.push(...CMD.INIT);
    // Select WPC1252 code page for proper Spanish character rendering (ñ, á, é, etc.)
    this.buffer.push(ESC, 0x74, 0x10);
    return this;
  }

  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      this.buffer.push(code > 255 ? 0x3f : code);
    }
    return this;
  }

  line(str: string = '') {
    return this.text(str + '\n');
  }

  alignLeft() {
    this.buffer.push(...CMD.ALIGN_LEFT);
    return this;
  }
  alignCenter() {
    this.buffer.push(...CMD.ALIGN_CENTER);
    return this;
  }
  alignRight() {
    this.buffer.push(...CMD.ALIGN_RIGHT);
    return this;
  }
  boldOn() {
    this.buffer.push(...CMD.BOLD_ON);
    return this;
  }
  boldOff() {
    this.buffer.push(...CMD.BOLD_OFF);
    return this;
  }
  doubleSize() {
    this.buffer.push(...CMD.DOUBLE_SIZE);
    return this;
  }
  doubleHeight() {
    this.buffer.push(...CMD.DOUBLE_HEIGHT);
    return this;
  }
  doubleWidth() {
    this.buffer.push(...CMD.DOUBLE_WIDTH);
    return this;
  }
  normalSize() {
    this.buffer.push(...CMD.NORMAL_SIZE);
    return this;
  }
  underlineOn() {
    this.buffer.push(...CMD.UNDERLINE_ON);
    return this;
  }
  underlineOff() {
    this.buffer.push(...CMD.UNDERLINE_OFF);
    return this;
  }

  feed(lines: number = 1) {
    this.buffer.push(...CMD.FEED_LINES(lines));
    return this;
  }

  cut() {
    this.feed(3);
    this.buffer.push(...CMD.CUT_PAPER);
    return this;
  }

  separator(char = '-', width = 42) {
    return this.line(char.repeat(width));
  }

  columns(left: string, right: string, width = 42) {
    const maxLeft = width - right.length - 1;
    const truncLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
    const space = width - truncLeft.length - right.length;
    const padding = space > 0 ? ' '.repeat(space) : ' ';
    return this.line(truncLeft + padding + right);
  }

  /**
   * Inserta un marcador de bitmap que el Print Bridge reemplaza
   * por bytes ESC/POS raster (GS v 0).
   * Si el bridge no soporta bitmaps, se ignora el marcador.
   */
  printBitmap(base64Png: string): EscPosBuilder {
    const marker = `__BITMAP_B64:${base64Png}:END__`;
    for (let i = 0; i < marker.length; i++) {
      this.buffer.push(marker.charCodeAt(i));
    }
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toBase64(): string {
    const bytes = this.toBytes();
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function formatTime(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--/--/----';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year} ${formatTime(date)}`;
}

function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatMoney(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const hasDecimals = rounded % 1 !== 0;
  return rounded.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function serviceLabel(tipo: string | null): string {
  switch (tipo) {
    case 'comer_aca':
      return 'SALON';
    case 'delivery':
      return 'DELIVERY';
    default:
      return 'TAKEAWAY';
  }
}

function canalLabel(canal: string | null, tipo: string | null): string {
  switch (canal) {
    case 'rappi':
      return 'RAPPI';
    case 'pedidos_ya':
    case 'pedidosya':
      return 'PEDIDOSYA';
    case 'mp_delivery':
      return 'MP DELIVERY';
    case 'masdelivery':
      return 'MASDELIVERY';
    case 'webapp':
      return 'WEBAPP';
    default:
      return serviceLabel(tipo);
  }
}

function modPrefix(tipo: string): string {
  switch (tipo) {
    case 'sin':
      return 'SIN ';
    case 'extra':
      return '+ ';
    case 'cambio':
      return '> ';
    default:
      return '';
  }
}

/**
 * Imprime logo + nombre del local.
 *
 * IMPORTANTE: El logo YA contiene "HOPPINESS CLUB" en su diseño.
 * NO imprimir ese texto. Solo el nombre del local debajo.
 */
function printBrandHeader(b: EscPosBuilder, branchName: string): void {
  b.alignCenter();
  b.printBitmap(LOGO_THERMAL_B64);
  b.feed(1);
  // Solo el nombre del local — NO "HOPPINESS CLUB"
  b.boldOn().line(branchName.toUpperCase()).boldOff();
}

/**
 * Imprime modificadores de un item.
 * "SIN" siempre en BOLD + UPPERCASE (error costoso si se pierde).
 */
function printMods(b: EscPosBuilder, item: PrintableItem): void {
  if (item.modificadores?.length) {
    for (const mod of item.modificadores) {
      const prefix = modPrefix(mod.tipo);
      if (mod.tipo === 'sin') {
        b.boldOn().line(`   ${prefix}${mod.descripcion.toUpperCase()}`).boldOff();
      } else {
        b.line(`   ${prefix}${mod.descripcion}`);
      }
    }
  }
  if (item.notas) {
    b.line(`   * ${item.notas}`);
  }
}

/**
 * Footer de marketing — solo para documentos que toca el CLIENTE.
 */
function printMarketingFooter(b: EscPosBuilder): void {
  b.feed(1)
    .alignCenter()
    .line('Gracias por elegirnos!')
    .feed(1)
    .boldOn()
    .line('Pedi por hoppinessclub.com')
    .boldOff()
    .line('y accede a precios exclusivos')
    .feed(1)
    .line('Seguinos en @hoppinessclub');
}

// ─── Types ───────────────────────────────────────────────────

export interface PrintableItem {
  name?: string | null;
  nombre?: string | null;
  cantidad: number;
  notas: string | null;
  estacion: string | null;
  modificadores?: Array<{
    descripcion: string;
    tipo: string;
  }>;
}

export interface PrintableOrder {
  numero_pedido: number;
  tipo_servicio: string | null;
  numero_llamador: number | null;
  canal_venta: string | null;
  cliente_nombre: string | null;
  referencia_app: string | null;
  created_at: string;
  items: PrintableItem[];
}

export interface TicketClienteData {
  order: PrintableOrder & {
    items: (PrintableItem & { precio_unitario?: number; subtotal?: number })[];
    total?: number;
    descuento?: number;
    descuento_porcentaje?: number;
    voucher_codigo?: string;
    voucher_descuento?: number;
  };
  branchName: string;
  metodo_pago?: string;
  tarjeta_marca?: string;
  monto_recibido?: number;
  vuelto?: number;
  factura?: {
    tipo: 'A' | 'B' | 'C';
    codigo: string;
    numero: string;
    fecha: string;
    emisor: {
      razon_social: string;
      cuit: string;
      iibb: string;
      condicion_iva: string;
      domicilio: string;
      inicio_actividades: string;
    };
    receptor: {
      nombre?: string;
      documento_tipo?: string;
      documento_numero?: string;
      condicion_iva: string;
    };
    neto_gravado: number;
    iva: number;
    otros_tributos: number;
    iva_contenido: number;
    otros_imp_nacionales: number;
    cae: string;
    cae_vto: string;
    qr_bitmap_b64?: string;
  } | null;
}

// ═════════════════════════════════════════════════════════════
// GENERADORES
// ═════════════════════════════════════════════════════════════

// ─── 1. COMANDA COMPLETA (cocina) ────────────────────────────

export function generateComandaCompleta(
  order: PrintableOrder,
  branchName: string,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);
  b.alignCenter().boldOn().line('C O M A N D A').boldOff().feed(1);

  // Número de pedido — LO MÁS GRANDE
  b.doubleSize().boldOn().line(`# ${order.numero_pedido}`).normalSize().boldOff();

  b.separator('=', cols);

  // Canal — doble alto para visual rápido
  b.doubleHeight()
    .boldOn()
    .line(canalLabel(order.canal_venta, order.tipo_servicio))
    .normalSize()
    .boldOff();

  // Referencia de plataforma (Rappi #483920, etc.)
  if (order.referencia_app) {
    b.doubleHeight().boldOn().line(order.referencia_app).normalSize().boldOff();
  }

  // Llamador
  if (order.numero_llamador) {
    b.doubleHeight().boldOn().line(`LLAMADOR #${order.numero_llamador}`).normalSize().boldOff();
  }

  // Cliente
  if (order.cliente_nombre) {
    b.line(order.cliente_nombre);
  }

  // Hora
  b.line(formatTime(order.created_at));
  b.separator('=', cols);

  // Items — doble alto, sin precios
  b.alignLeft();
  for (const item of order.items) {
    b.boldOn()
      .doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize()
      .boldOff();

    printMods(b, item);
    b.separator('-', cols);
  }

  // Conteo
  b.alignCenter()
    .line(`Items: ${order.items.reduce((s, i) => s + i.cantidad, 0)}`)
    .feed(1)
    .cut();

  return b.toBase64();
}

// ─── 2. COMANDA POR ESTACIÓN ─────────────────────────────────

export function generateComandaEstacion(
  order: PrintableOrder,
  stationName: string,
  stationItems: PrintableItem[],
  branchName: string,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);
  b.alignCenter()
    .boldOn()
    .line('C O M A N D A')
    .boldOff()
    .boldOn()
    .line(`--- ${stationName.toUpperCase()} ---`)
    .boldOff()
    .feed(1);

  b.doubleSize().boldOn().line(`# ${order.numero_pedido}`).normalSize().boldOff();

  b.separator('=', cols);

  b.doubleHeight()
    .boldOn()
    .line(canalLabel(order.canal_venta, order.tipo_servicio))
    .normalSize()
    .boldOff();

  if (order.referencia_app) {
    b.doubleHeight().boldOn().line(order.referencia_app).normalSize().boldOff();
  }

  if (order.numero_llamador) {
    b.doubleHeight().boldOn().line(`LLAMADOR #${order.numero_llamador}`).normalSize().boldOff();
  }

  if (order.cliente_nombre) {
    b.line(order.cliente_nombre);
  }

  b.line(formatTime(order.created_at));
  b.separator('=', cols);

  b.alignLeft();
  for (const item of stationItems) {
    b.boldOn()
      .doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize()
      .boldOff();

    printMods(b, item);
    b.separator('-', cols);
  }

  b.alignCenter()
    .line(`Items estacion: ${stationItems.reduce((s, i) => s + i.cantidad, 0)}`)
    .feed(1)
    .cut();

  return b.toBase64();
}

// ─── 3. COMANDA DELIVERY ─────────────────────────────────────

export function generateComandaDelivery(
  order: PrintableOrder & {
    cliente_telefono?: string | null;
    cliente_direccion?: string | null;
    hora_entrega?: string | null;
  },
  branchName: string,
  paperWidth: number = 80,
  trackingQrBitmap?: string,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);
  b.alignCenter().boldOn().line('C O M A N D A').boldOff().feed(1);

  b.doubleSize().boldOn().line(`# ${order.numero_pedido}`).normalSize().boldOff();

  b.separator('=', cols);

  b.doubleHeight()
    .boldOn()
    .line(canalLabel(order.canal_venta, order.tipo_servicio))
    .normalSize()
    .boldOff();

  if (order.referencia_app) {
    b.doubleHeight().boldOn().line(order.referencia_app).normalSize().boldOff();
  }

  // Bloque datos entrega
  b.alignLeft().separator('=', cols);
  if (order.cliente_nombre) {
    b.boldOn().line(order.cliente_nombre).boldOff();
  }
  if (order.cliente_direccion) {
    b.line(order.cliente_direccion);
  }
  if (order.cliente_telefono) {
    b.line(`Tel: ${order.cliente_telefono}`);
  }
  if (order.hora_entrega) {
    b.boldOn().line(`Entrega: ${order.hora_entrega}`).boldOff();
  }
  b.separator('=', cols);

  b.alignCenter().line(`Hora: ${formatTime(order.created_at)}`);
  b.separator('=', cols);

  b.alignLeft();
  for (const item of order.items) {
    b.boldOn()
      .doubleHeight()
      .line(`${item.cantidad}x ${item.nombre || 'Producto'}`)
      .normalSize()
      .boldOff();

    printMods(b, item);
    b.separator('-', cols);
  }

  b.alignCenter().line(`Items: ${order.items.reduce((s, i) => s + i.cantidad, 0)}`);

  // QR de rastreo para cadete (solo canal propio)
  if (trackingQrBitmap) {
    b.feed(1).separator('-', cols);
    b.alignCenter().boldOn().line('ESCANEA PARA RASTREO').boldOff().feed(1);
    b.printBitmap(trackingQrBitmap);
    b.feed(1);
  }

  b.feed(1).cut();

  return b.toBase64();
}

// ─── 4. TICKET CLIENTE (con/sin factura) ─────────────────────

export function generateTicketCliente(data: TicketClienteData, paperWidth: number = 80): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const { order, branchName, metodo_pago, tarjeta_marca, monto_recibido, vuelto, factura } = data;
  const b = new EscPosBuilder();

  b.init();

  if (factura) {
    return generateTicketFiscal(b, data, cols);
  }

  // ── Ticket NO fiscal ──
  printBrandHeader(b, branchName);

  b.alignLeft().separator('-', cols);
  b.columns(`Pedido #${order.numero_pedido}`, formatDate(order.created_at), cols);

  const canal = canalLabel(order.canal_venta, order.tipo_servicio);
  if (order.numero_llamador) {
    b.columns(canal, `Llamador: #${order.numero_llamador}`, cols);
  } else {
    b.line(canal);
  }

  if (order.cliente_nombre) {
    b.line(`Cliente: ${order.cliente_nombre}`);
  }
  b.separator('-', cols);
  b.feed(1);

  // Items con precios
  for (const item of order.items) {
    const price = item.subtotal != null ? `$${formatMoney(item.subtotal)}` : '';
    b.columns(`${item.cantidad}x ${item.nombre || 'Producto'}`, price, cols);

    if (item.modificadores?.length) {
      for (const mod of item.modificadores) {
        const prefix = modPrefix(mod.tipo);
        if (mod.tipo === 'sin') {
          b.boldOn().line(`   ${prefix}${mod.descripcion.toUpperCase()}`).boldOff();
        } else {
          b.line(`   ${prefix}${mod.descripcion}`);
        }
      }
    }
  }

  b.separator('=', cols);

  if (order.descuento && order.descuento > 0) {
    const subtotal = (order.total || 0) + order.descuento + (order.voucher_descuento || 0);
    b.columns('Subtotal', `$${formatMoney(subtotal)}`, cols);
    const descLabel = order.descuento_porcentaje
      ? `Desc. ${order.descuento_porcentaje}%`
      : 'Descuento';
    b.columns(descLabel, `-$${formatMoney(order.descuento)}`, cols);
  }

  if (order.voucher_descuento && order.voucher_descuento > 0) {
    if (!order.descuento || order.descuento <= 0) {
      const subtotal = (order.total || 0) + order.voucher_descuento;
      b.columns('Subtotal', `$${formatMoney(subtotal)}`, cols);
    }
    const vLabel = order.voucher_codigo ? `Voucher ${order.voucher_codigo}` : 'Voucher';
    b.columns(vLabel, `-$${formatMoney(order.voucher_descuento)}`, cols);
  }

  if (order.total != null) {
    b.feed(1)
      .alignCenter()
      .boldOn()
      .line('T O T A L')
      .doubleSize()
      .line(`$ ${formatMoney(order.total)}`)
      .normalSize()
      .boldOff()
      .alignLeft();
  }

  b.feed(1);

  if (metodo_pago) {
    b.columns(`Pago: ${metodo_pago}`, tarjeta_marca || '', cols);
  }
  if (monto_recibido && vuelto !== undefined) {
    b.columns(`Recibido: $${formatMoney(monto_recibido)}`, `Vuelto: $${formatMoney(vuelto)}`, cols);
  }

  b.separator('-', cols);

  b.feed(1).alignCenter().boldOn().line('*** NO VALIDO COMO FACTURA ***').boldOff();

  printMarketingFooter(b);
  b.feed(2).cut();

  return b.toBase64();
}

/**
 * Genera un ticket fiscal unificado (factura integrada).
 * Layout ARCA: emisor → comprobante → receptor → items → totales → pago → QR.
 */
function generateTicketFiscal(b: EscPosBuilder, data: TicketClienteData, cols: number): string {
  const { order, branchName, metodo_pago, tarjeta_marca, monto_recibido, vuelto, factura } = data;
  const f = factura!;
  const isNotaCredito = f.codigo === '03' || f.codigo === '08' || f.codigo === '13';
  const fiscalLabel = isNotaCredito ? 'NOTA DE CREDITO' : 'FACTURA';

  // 1. Encabezado
  printBrandHeader(b, branchName);
  b.alignCenter().boldOn().line('O R I G I N A L').boldOff().feed(1);

  // 2. Tipo de comprobante (grande)
  b.doubleSize().boldOn().line(f.tipo).normalSize().boldOff();
  b.boldOn().line(`${fiscalLabel} (Cod. ${f.codigo})`).boldOff();
  b.boldOn().line(`N\xB0 ${f.numero}`).boldOff();
  b.line(`Fecha: ${formatDateShort(f.fecha)}`);

  b.separator('=', cols);

  // 3. Datos del emisor
  b.alignCenter();
  b.boldOn().line(f.emisor.razon_social).boldOff();
  b.line(`CUIT: ${f.emisor.cuit}`);
  b.line(`IIBB: ${f.emisor.iibb}`);
  b.line(f.emisor.condicion_iva);
  b.line(f.emisor.domicilio);
  b.line(`Inicio Act.: ${formatDateShort(f.emisor.inicio_actividades)}`);

  b.separator('-', cols);

  // 4. Datos del receptor
  b.alignLeft();
  b.boldOn().line(`A ${f.receptor.condicion_iva.toUpperCase()}`).boldOff();
  if (f.receptor.nombre) {
    b.line(`Nombre: ${f.receptor.nombre}`);
  }
  if (f.receptor.documento_numero) {
    b.line(`${f.receptor.documento_tipo || 'DNI'}: ${f.receptor.documento_numero}`);
  }

  b.separator('-', cols);

  // 5. Referencia del pedido
  b.columns(`Pedido #${order.numero_pedido}`, formatDate(order.created_at), cols);
  const canal = canalLabel(order.canal_venta, order.tipo_servicio);
  if (order.numero_llamador) {
    b.columns(canal, `Llamador: #${order.numero_llamador}`, cols);
  } else {
    b.line(canal);
  }

  b.separator('-', cols);
  b.feed(1);

  // 6. Items con precios
  for (const item of order.items) {
    const price = item.subtotal != null ? `$${formatMoney(item.subtotal)}` : '';
    b.columns(`${item.cantidad}x ${item.nombre || 'Producto'}`, price, cols);

    if (item.modificadores?.length) {
      for (const mod of item.modificadores) {
        const prefix = modPrefix(mod.tipo);
        if (mod.tipo === 'sin') {
          b.boldOn().line(`   ${prefix}${mod.descripcion.toUpperCase()}`).boldOff();
        } else {
          b.line(`   ${prefix}${mod.descripcion}`);
        }
      }
    }
  }

  b.separator('=', cols);

  // 7. Descuento (si aplica)
  if (order.descuento && order.descuento > 0) {
    const subtotal = (order.total || 0) + order.descuento + (order.voucher_descuento || 0);
    b.columns('Subtotal', `$${formatMoney(subtotal)}`, cols);
    const descLabel = order.descuento_porcentaje
      ? `Desc. ${order.descuento_porcentaje}%`
      : 'Descuento';
    b.columns(descLabel, `-$${formatMoney(order.descuento)}`, cols);
  }
  if (order.voucher_descuento && order.voucher_descuento > 0) {
    if (!order.descuento || order.descuento <= 0) {
      const subtotal = (order.total || 0) + order.voucher_descuento;
      b.columns('Subtotal', `$${formatMoney(subtotal)}`, cols);
    }
    const vLabel = order.voucher_codigo ? `Voucher ${order.voucher_codigo}` : 'Voucher';
    b.columns(vLabel, `-$${formatMoney(order.voucher_descuento)}`, cols);
  }
  if (
    (order.descuento && order.descuento > 0) ||
    (order.voucher_descuento && order.voucher_descuento > 0)
  ) {
    b.separator('-', cols);
  }

  // 8. Desglose fiscal + TOTAL
  if (f.tipo === 'A') {
    b.columns('Neto Gravado:', `$${formatMoney(f.neto_gravado)}`, cols);
    b.columns('IVA 21%:', `$${formatMoney(f.iva)}`, cols);
    if (f.otros_tributos > 0) {
      b.columns('Otros tributos:', `$${formatMoney(f.otros_tributos)}`, cols);
    }
  }

  const total = f.neto_gravado + f.iva + f.otros_tributos;
  b.feed(1)
    .alignCenter()
    .boldOn()
    .line('T O T A L')
    .doubleSize()
    .line(`$ ${formatMoney(total)}`)
    .normalSize()
    .boldOff()
    .alignLeft();

  b.feed(1);

  // 9. Pago
  if (metodo_pago) {
    b.columns(`Pago: ${metodo_pago}`, tarjeta_marca || '', cols);
  }
  if (monto_recibido && vuelto !== undefined) {
    b.columns(`Recibido: $${formatMoney(monto_recibido)}`, `Vuelto: $${formatMoney(vuelto)}`, cols);
  }

  b.separator('-', cols);

  // 10. Transparencia Fiscal (Ley 27.743)
  b.alignCenter().line('Reg. Transparencia Fiscal').line('al Consumidor (Ley 27.743)').alignLeft();
  b.columns('IVA Contenido:', `$${formatMoney(f.iva_contenido)}`, cols);
  b.columns('Otros Imp. Nac.:', `$${formatMoney(f.otros_imp_nacionales)}`, cols);

  b.separator('=', cols);

  // 11. QR + CAE
  b.alignCenter();
  if (f.qr_bitmap_b64) {
    b.printBitmap(f.qr_bitmap_b64);
  }
  b.feed(1).boldOn().line('Comprobante Autorizado').boldOff();
  b.columns(`CAE: ${f.cae}`, `Vto: ${formatDateShort(f.cae_vto)}`, cols);

  // Marketing footer
  printMarketingFooter(b);
  b.feed(2).cut();

  return b.toBase64();
}

// ─── 5. TICKET DELIVERY (imprime al marcar "Listo") ─────────

export interface DeliveryTicketData {
  order: PrintableOrder & {
    items: (PrintableItem & { precio_unitario?: number; subtotal?: number })[];
    total?: number;
    cliente_telefono?: string | null;
    cliente_direccion?: string | null;
  };
  branchName: string;
}

export function generateTicketDelivery(data: DeliveryTicketData, paperWidth: number = 80): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const { order, branchName } = data;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.alignCenter().feed(1);

  b.doubleSize().boldOn().line(`# ${order.numero_pedido}`).normalSize().boldOff();

  b.separator('=', cols);

  const canal = canalLabel(order.canal_venta, order.tipo_servicio);
  b.doubleHeight().boldOn().line(canal).normalSize().boldOff();

  if (order.referencia_app) {
    b.doubleHeight().boldOn().line(order.referencia_app).normalSize().boldOff();
  }

  b.line(formatDate(order.created_at));

  b.separator('=', cols);

  // Datos de entrega enmarcados
  b.alignLeft();
  if (order.cliente_nombre) {
    b.boldOn().line(order.cliente_nombre).boldOff();
  }
  if (order.cliente_direccion) {
    b.line(order.cliente_direccion);
  }
  if (order.cliente_telefono) {
    b.line(`Tel: ${order.cliente_telefono}`);
  }

  b.separator('=', cols);

  // Items con precios
  for (const item of order.items) {
    const price = item.subtotal != null ? `$${formatMoney(item.subtotal)}` : '';
    b.columns(`${item.cantidad}x ${item.nombre || 'Producto'}`, price, cols);
    printMods(b, item);
  }

  b.separator('=', cols);

  if (order.total != null) {
    b.alignCenter()
      .boldOn()
      .doubleSize()
      .line(`$ ${formatMoney(order.total)}`)
      .normalSize()
      .boldOff();
  }

  b.feed(2).cut();

  return b.toBase64();
}

// ─── 6. TICKET ANULACION ─────────────────────────────────────

export interface AnulacionTicketData {
  order: PrintableOrder & {
    items: (PrintableItem & { precio_unitario?: number; subtotal?: number })[];
    total?: number;
  };
  branchName: string;
  metodo_pago?: string;
}

export function generateTicketAnulacion(
  data: AnulacionTicketData,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const { order, branchName, metodo_pago } = data;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.alignCenter()
    .feed(1)
    .boldOn()
    .doubleSize()
    .line('A N U L A D O')
    .normalSize()
    .boldOff()
    .feed(1);

  b.doubleSize().boldOn().line(`# ${order.numero_pedido}`).normalSize().boldOff();

  b.separator('=', cols);

  b.alignLeft();
  b.columns(`Pedido #${order.numero_pedido}`, formatDate(order.created_at), cols);

  const canal = canalLabel(order.canal_venta, order.tipo_servicio);
  if (order.numero_llamador) {
    b.columns(canal, `Llamador: #${order.numero_llamador}`, cols);
  } else {
    b.line(canal);
  }

  if (order.cliente_nombre) {
    b.line(`Cliente: ${order.cliente_nombre}`);
  }

  b.line(`Anulado: ${formatDate(new Date().toISOString())}`);

  b.separator('-', cols);
  b.feed(1);

  for (const item of order.items) {
    const price = item.subtotal != null ? `$${formatMoney(item.subtotal)}` : '';
    b.columns(`${item.cantidad}x ${item.nombre || 'Producto'}`, price, cols);
  }

  b.separator('=', cols);

  if (order.total != null) {
    b.feed(1)
      .alignCenter()
      .boldOn()
      .line('TOTAL ANULADO')
      .doubleSize()
      .line(`$ ${formatMoney(order.total)}`)
      .normalSize()
      .boldOff()
      .alignLeft();
  }

  b.feed(1);

  if (metodo_pago) {
    b.line(`Pago original: ${metodo_pago}`);
  }

  b.separator('=', cols);

  b.feed(1)
    .alignCenter()
    .boldOn()
    .doubleHeight()
    .line('*** PEDIDO ANULADO ***')
    .normalSize()
    .boldOff();

  b.feed(2).cut();

  return b.toBase64();
}

// ─── 7. VALE DE CANJE ───────────────────────────────────────

export function generateVale(
  productName: string,
  orderNumber: number,
  orderTime: string,
  canal?: string,
  llamador?: number | null,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  // Sin logo — el vale es cortito y se diferencia del ticket
  b.init()
    .separator('=', cols)
    .alignCenter()
    .feed(1)
    .doubleSize()
    .boldOn()
    .line('V A L E')
    .normalSize()
    .boldOff()
    .feed(1)
    .doubleSize()
    .boldOn()
    .line(productName)
    .normalSize()
    .boldOff()
    .feed(1)
    .separator('=', cols)
    .line(`Pedido #${orderNumber} - ${formatTime(orderTime)}`);

  if (canal || llamador) {
    const parts: string[] = [];
    if (canal) parts.push(canal);
    if (llamador) parts.push(`Llamador #${llamador}`);
    b.line(parts.join(' - '));
  }

  b.feed(1).line('@hoppinessclub').feed(1).cut();

  return b.toBase64();
}

// ─── 6. TEST PAGE ────────────────────────────────────────────

export function generateTestPage(
  printerName: string,
  branchName: string,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.separator('=', cols)
    .alignCenter()
    .boldOn()
    .line('TEST DE IMPRESORA')
    .boldOff()
    .separator('-', cols)
    .line(`Impresora: ${printerName}`)
    .line(`Ancho: ${paperWidth}mm`)
    .line(`Fecha: ${new Date().toLocaleString('es-AR')}`)
    .separator('-', cols)
    .alignLeft()
    .boldOn()
    .line('Texto en negrita')
    .boldOff()
    .doubleHeight()
    .line('Texto doble alto')
    .normalSize()
    .doubleSize()
    .line('Texto grande')
    .normalSize()
    .separator('=', cols)
    .alignCenter()
    .line('Logo + texto = impresora lista')
    .feed(2)
    .cut();

  return b.toBase64();
}

// printSeccionFiscal fue reemplazada por generateTicketFiscal (layout unificado)

// ─── QR ARCA ────────────────────────────────────────────────
/**
 * Genera un PNG base64 con el QR oficial de ARCA para una factura electrónica.
 * El QR codifica la URL https://www.afip.gob.ar/fe/qr/?p=BASE64_JSON
 * según la especificación de ARCA (ex-AFIP).
 */
export async function generateArcaQrBitmap(
  factura: NonNullable<TicketClienteData['factura']>,
): Promise<string> {
  const numeroParts = factura.numero.split('-');
  const ptoVta = parseInt(numeroParts[0] || '0', 10);
  const nroCmp = parseInt(numeroParts[1] || '0', 10);
  const cuitClean = parseInt(factura.emisor.cuit.replace(/-/g, ''), 10);
  const tipoCmp = parseInt(factura.codigo, 10);

  const tipoDocRec = factura.receptor.documento_tipo === 'CUIT' ? 80 : 99;
  const nroDocRec = factura.receptor.documento_numero
    ? parseInt(factura.receptor.documento_numero.replace(/-/g, ''), 10)
    : 0;

  const importe =
    Math.round((factura.neto_gravado + factura.iva + factura.otros_tributos) * 100) / 100;

  const fechaForQr = (() => {
    const d = new Date(factura.fecha);
    if (isNaN(d.getTime())) return factura.fecha;
    return d.toISOString().slice(0, 10);
  })();

  const qrData = {
    ver: 1,
    fecha: fechaForQr,
    cuit: cuitClean,
    ptoVta,
    tipoCmp,
    nroCmp,
    importe,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec,
    nroDocRec,
    tipoCodAut: 'E',
    codAut: parseInt(factura.cae, 10),
  };

  const jsonB64 = btoa(JSON.stringify(qrData));
  const url = `https://www.afip.gob.ar/fe/qr/?p=${jsonB64}`;

  const dataUrl = await QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

// ─── QR DELIVERY TRACKING ────────────────────────────────────
/**
 * Genera un PNG base64 con el QR para rastreo de delivery.
 * El QR codifica la URL pública de rastreo del cadete.
 */
export async function generateTrackingQrBitmap(trackingToken: string): Promise<string> {
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://hoppinessclub.com';
  const url = `${baseUrl}/rastreo/${trackingToken}`;

  const dataUrl = await QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

// ─── LEGACY: generateValeBebida ──────────────────────────────
/** @deprecated Use generateVale instead */
export function generateValeBebida(
  order: { numero_pedido: number; created_at: string },
  itemNombre: string,
  paperWidth: number = 80,
): string {
  return generateVale(
    itemNombre,
    order.numero_pedido,
    order.created_at,
    undefined,
    undefined,
    paperWidth,
  );
}

// ═════════════════════════════════════════════════════════════
// REPORTES FISCALES (ARCA)
// ═════════════════════════════════════════════════════════════

export interface FiscalReportBranchData {
  name: string;
  cuit: string;
  address: string;
  punto_venta: number;
}

export interface FiscalXData {
  punto_venta: number;
  fecha: string;
  hora: string;
  total_comprobantes: number;
  facturas_b: number;
  facturas_c: number;
  tickets: number;
  notas_credito_b: number;
  notas_credito_c: number;
  gravado_21: number;
  iva_21: number;
  gravado_105: number;
  iva_105: number;
  exento: number;
  no_gravado: number;
  subtotal_neto: number;
  total_iva: number;
  total_ventas: number;
  total_nc: number;
  neto_ventas_nc: number;
  ultimo_comprobante: string | null;
  pago_efectivo: number;
  pago_debito: number;
  pago_credito: number;
  pago_qr: number;
  pago_transferencia: number;
}

export interface FiscalZData {
  z_number: number;
  date: string;
  pos_point_of_sale: number;
  period_from: string;
  period_to: string;
  total_invoices: number;
  total_invoices_b: number;
  total_invoices_c: number;
  total_tickets: number;
  total_credit_notes_b: number;
  total_credit_notes_c: number;
  first_voucher_type: string | null;
  first_voucher_number: string | null;
  last_voucher_type: string | null;
  last_voucher_number: string | null;
  taxable_21: number;
  vat_21: number;
  taxable_105: number;
  vat_105: number;
  exempt: number;
  non_taxable: number;
  other_taxes: number;
  subtotal_net: number;
  total_vat: number;
  total_sales: number;
  total_credit_notes_amount: number;
  net_total: number;
  payment_cash: number;
  payment_debit: number;
  payment_credit: number;
  payment_qr: number;
  payment_transfer: number;
}

function fmtFiscalMoney(n: number): string {
  return `$ ${formatMoney(n)}`;
}

function fmtComprobante(tipo: string | null, pv: number, num: string | null): string {
  if (!tipo || !num) return '-';
  return `${tipo}-${String(pv).padStart(5, '0')}-${num.padStart(8, '0')}`;
}

// ─── INFORME X ────────────────────────────────────────────────

export function generateInformeX(
  data: FiscalXData,
  branch: FiscalReportBranchData,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init().alignCenter();
  b.separator('=', cols);
  b.boldOn().line('HOPPINESS CLUB').boldOff();
  b.line(branch.name);
  b.line(`CUIT: ${branch.cuit}`);
  b.line(branch.address);
  b.separator('=', cols);

  b.boldOn().doubleHeight().line('INFORME X').normalSize().boldOff();
  b.line(`Fecha: ${data.fecha}`);
  b.line(`Hora: ${data.hora}`);
  b.line(`Punto de venta: ${String(data.punto_venta).padStart(4, '0')}`);

  b.separator('-', cols);
  b.boldOn().line('RESUMEN DE VENTAS DEL DIA (parcial)').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Cantidad de comprobantes:', String(data.total_comprobantes), cols);
  b.columns('  Facturas B:', String(data.facturas_b), cols);
  b.columns('  Facturas C:', String(data.facturas_c), cols);
  if (data.tickets > 0) b.columns('  Tickets:', String(data.tickets), cols);
  b.columns('  Notas de credito B:', String(data.notas_credito_b), cols);
  b.columns('  Notas de credito C:', String(data.notas_credito_c), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('VENTAS POR ALICUOTA DE IVA').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Gravado 21%:', fmtFiscalMoney(data.gravado_21), cols);
  b.columns('IVA 21%:', fmtFiscalMoney(data.iva_21), cols);
  b.columns('Gravado 10.5%:', fmtFiscalMoney(data.gravado_105), cols);
  b.columns('IVA 10.5%:', fmtFiscalMoney(data.iva_105), cols);
  b.columns('Exento:', fmtFiscalMoney(data.exento), cols);
  if (data.no_gravado > 0) b.columns('No gravado:', fmtFiscalMoney(data.no_gravado), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('TOTALES').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Subtotal neto:', fmtFiscalMoney(data.subtotal_neto), cols);
  b.columns('Total IVA:', fmtFiscalMoney(data.total_iva), cols);
  b.boldOn();
  b.columns('TOTAL VENTAS:', fmtFiscalMoney(data.total_ventas), cols);
  b.boldOff();

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('MEDIOS DE PAGO').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Efectivo:', fmtFiscalMoney(data.pago_efectivo), cols);
  b.columns('Tarjeta debito:', fmtFiscalMoney(data.pago_debito), cols);
  b.columns('Tarjeta credito:', fmtFiscalMoney(data.pago_credito), cols);
  b.columns('Mercado Pago / QR:', fmtFiscalMoney(data.pago_qr), cols);
  b.columns('Transferencia:', fmtFiscalMoney(data.pago_transferencia), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  if (data.ultimo_comprobante) {
    b.line(`Ultimo comprobante: ${data.ultimo_comprobante}`);
  }
  b.boldOn().line('Informe X - No cierra jornada fiscal').boldOff();
  b.separator('=', cols);
  b.feed(2).cut();

  return b.toBase64();
}

// ─── CIERRE Z ─────────────────────────────────────────────────

export function generateCierreZ(
  data: FiscalZData,
  branch: FiscalReportBranchData,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init().alignCenter();
  b.separator('=', cols);
  b.boldOn().line('HOPPINESS CLUB').boldOff();
  b.line(branch.name);
  b.line(`CUIT: ${branch.cuit}`);
  b.line(branch.address);
  b.separator('=', cols);

  b.boldOn()
    .doubleHeight()
    .line(`CIERRE Z  N° ${String(data.z_number).padStart(4, '0')}`)
    .normalSize()
    .boldOff();
  b.line(`Fecha: ${formatDateShort(data.date)}`);
  b.line(`Hora de cierre: ${formatTime(data.period_to)}`);
  b.line(`Punto de venta: ${String(data.pos_point_of_sale).padStart(4, '0')}`);

  b.separator('-', cols);
  b.boldOn().line('PERIODO').boldOff();
  b.separator('-', cols);
  b.alignLeft();
  b.columns('Desde:', formatDate(data.period_from), cols);
  b.columns('Hasta:', formatDate(data.period_to), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('RESUMEN DE VENTAS DEL DIA').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Cantidad de comprobantes:', String(data.total_invoices), cols);
  b.columns('  Facturas B:', String(data.total_invoices_b), cols);
  b.columns('  Facturas C:', String(data.total_invoices_c), cols);
  if (data.total_tickets > 0) b.columns('  Tickets:', String(data.total_tickets), cols);
  b.columns('  Notas de credito B:', String(data.total_credit_notes_b), cols);
  b.columns('  Notas de credito C:', String(data.total_credit_notes_c), cols);
  b.feed(1);
  b.line(
    `Primer comprobante: ${fmtComprobante(data.first_voucher_type, data.pos_point_of_sale, data.first_voucher_number)}`,
  );
  b.line(
    `Ultimo comprobante: ${fmtComprobante(data.last_voucher_type, data.pos_point_of_sale, data.last_voucher_number)}`,
  );

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('VENTAS POR ALICUOTA DE IVA').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Gravado 21%:', fmtFiscalMoney(data.taxable_21), cols);
  b.columns('IVA 21%:', fmtFiscalMoney(data.vat_21), cols);
  b.columns('Gravado 10.5%:', fmtFiscalMoney(data.taxable_105), cols);
  b.columns('IVA 10.5%:', fmtFiscalMoney(data.vat_105), cols);
  b.columns('Exento:', fmtFiscalMoney(data.exempt), cols);
  if (data.non_taxable > 0) b.columns('No gravado:', fmtFiscalMoney(data.non_taxable), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('TOTALES').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Subtotal neto:', fmtFiscalMoney(data.subtotal_net), cols);
  b.columns('Total IVA:', fmtFiscalMoney(data.total_vat), cols);
  if (data.other_taxes > 0) b.columns('Otros tributos:', fmtFiscalMoney(data.other_taxes), cols);
  b.boldOn();
  b.columns('TOTAL VENTAS:', fmtFiscalMoney(data.total_sales), cols);
  b.boldOff();

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('NOTAS DE CREDITO').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Cantidad:', String(data.total_credit_notes_b + data.total_credit_notes_c), cols);
  b.columns('Total NC:', fmtFiscalMoney(data.total_credit_notes_amount), cols);
  b.boldOn();
  b.columns('NETO (Ventas - NC):', fmtFiscalMoney(data.net_total), cols);
  b.boldOff();

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('MEDIOS DE PAGO').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Efectivo:', fmtFiscalMoney(data.payment_cash), cols);
  b.columns('Tarjeta debito:', fmtFiscalMoney(data.payment_debit), cols);
  b.columns('Tarjeta credito:', fmtFiscalMoney(data.payment_credit), cols);
  b.columns('Mercado Pago / QR:', fmtFiscalMoney(data.payment_qr), cols);
  b.columns('Transferencia:', fmtFiscalMoney(data.payment_transfer), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn()
    .line(`CIERRE Z N° ${String(data.z_number).padStart(4, '0')} - DOCUMENTO FISCAL`)
    .boldOff();
  b.line('No valido como factura');
  b.separator('=', cols);
  b.feed(2).cut();

  return b.toBase64();
}

// ─── INFORME DE AUDITORÍA ─────────────────────────────────────

export interface FiscalAuditData {
  punto_venta: number;
  desde_fecha: string;
  hasta_fecha: string;
  desde_z: number;
  hasta_z: number;
  cantidad_jornadas: number;
  jornadas: Array<{
    fecha: string;
    z_number: number;
    total_sales: number;
    net_total: number;
    total_credit_notes_amount: number;
  }>;
  total_comprobantes: number;
  total_ventas_brutas: number;
  total_nc: number;
  total_neto: number;
  total_iva_21: number;
  total_iva_105: number;
}

export function generateInformeAuditoria(
  data: FiscalAuditData,
  branch: FiscalReportBranchData,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init().alignCenter();
  b.separator('=', cols);
  b.boldOn().line('HOPPINESS CLUB').boldOff();
  b.line(branch.name);
  b.line(`CUIT: ${branch.cuit}`);
  b.line(branch.address);
  b.separator('=', cols);

  b.boldOn().doubleHeight().line('INFORME DE AUDITORIA').normalSize().boldOff();
  b.line(`Punto de venta: ${String(data.punto_venta).padStart(4, '0')}`);

  b.separator('-', cols);
  b.boldOn().line('PERIODO CONSULTADO').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.line(
    `Desde: ${formatDateShort(data.desde_fecha)} (Z N° ${String(data.desde_z).padStart(4, '0')})`,
  );
  b.line(
    `Hasta: ${formatDateShort(data.hasta_fecha)} (Z N° ${String(data.hasta_z).padStart(4, '0')})`,
  );
  b.columns('Cantidad de jornadas:', String(data.cantidad_jornadas), cols);

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('RESUMEN POR JORNADA').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  for (const j of data.jornadas) {
    b.columns(
      `${formatDateShort(j.fecha)} | Z ${String(j.z_number).padStart(4, '0')}`,
      fmtFiscalMoney(j.total_sales),
      cols,
    );
  }

  b.feed(1).alignCenter();
  b.separator('-', cols);
  b.boldOn().line('TOTALES DEL PERIODO').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Total comprobantes:', String(data.total_comprobantes), cols);
  b.columns('Total ventas brutas:', fmtFiscalMoney(data.total_ventas_brutas), cols);
  b.columns('Total notas de credito:', fmtFiscalMoney(data.total_nc), cols);
  b.boldOn();
  b.columns('Total neto:', fmtFiscalMoney(data.total_neto), cols);
  b.boldOff();
  b.columns('Total IVA 21%:', fmtFiscalMoney(data.total_iva_21), cols);
  b.columns('Total IVA 10.5%:', fmtFiscalMoney(data.total_iva_105), cols);

  b.alignCenter();
  b.separator('=', cols);
  b.feed(2).cut();

  return b.toBase64();
}

// ─── RESUMEN DE VENTAS FACTURADAS (para inspección ARCA) ──────

export interface InvoicedSalesSummaryData {
  fecha_desde: string;
  fecha_hasta: string;
  ventas: Array<{
    fecha: string;
    tipo: string;
    numero: string;
    total: number;
    cae: string;
  }>;
  total: number;
}

export function generateInvoicedSalesSummary(
  data: InvoicedSalesSummaryData,
  branch: FiscalReportBranchData,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init().alignCenter();
  b.separator('=', cols);
  b.boldOn().line('HOPPINESS CLUB').boldOff();
  b.line(branch.name);
  b.line(`CUIT: ${branch.cuit}`);
  b.separator('=', cols);

  b.boldOn().line('RESUMEN VENTAS FACTURADAS').boldOff();
  b.line(`${formatDateShort(data.fecha_desde)} a ${formatDateShort(data.fecha_hasta)}`);
  b.separator('-', cols);

  b.alignLeft();
  for (const v of data.ventas) {
    b.columns(`${v.tipo} ${v.numero}`, fmtFiscalMoney(v.total), cols);
  }

  b.separator('=', cols);
  b.boldOn();
  b.columns('TOTAL:', fmtFiscalMoney(data.total), cols);
  b.boldOff();
  b.separator('=', cols);
  b.feed(2).cut();

  return b.toBase64();
}

// ─── CASH REGISTER CLOSING REPORT ─────────────────────────────

export interface CashClosingReportData {
  register_name: string;
  opened_at: string;
  closed_at: string;
  opened_by: string;
  closed_by: string;
  opening_amount: number;
  total_income: number;
  total_expenses: number;
  expected_amount: number;
  closing_amount: number;
  difference: number;
  movements: Array<{
    time: string;
    concept: string;
    type: 'income' | 'expense';
    amount: number;
  }>;
}

export function generateCashClosingReport(
  data: CashClosingReportData,
  branchName: string,
  paperWidth: number = 80,
): string {
  const cols = paperWidth === 80 ? 42 : 32;
  const b = new EscPosBuilder();

  b.init();
  printBrandHeader(b, branchName);

  b.alignCenter();
  b.boldOn().doubleHeight().line('CIERRE DE CAJA').normalSize().boldOff();
  b.line(data.register_name.toUpperCase());
  b.separator('=', cols);

  b.alignLeft();
  b.columns('Apertura:', formatDate(data.opened_at), cols);
  b.columns('Cierre:', formatDate(data.closed_at), cols);
  b.columns('Abrio:', data.opened_by, cols);
  b.columns('Cerro:', data.closed_by, cols);

  b.separator('-', cols);
  b.alignCenter().boldOn().line('RESUMEN').boldOff();
  b.separator('-', cols);

  b.alignLeft();
  b.columns('Fondo apertura:', fmtFiscalMoney(data.opening_amount), cols);
  b.columns('Total ingresos:', fmtFiscalMoney(data.total_income), cols);
  b.columns('Total egresos:', fmtFiscalMoney(data.total_expenses), cols);
  b.separator('-', cols);
  b.columns('Esperado en caja:', fmtFiscalMoney(data.expected_amount), cols);
  b.boldOn();
  b.columns('Contado en caja:', fmtFiscalMoney(data.closing_amount), cols);
  b.boldOff();

  const diffSign = data.difference >= 0 ? '+' : '';
  b.columns('Diferencia:', `${diffSign}${fmtFiscalMoney(data.difference)}`, cols);

  if (data.movements.length > 0) {
    b.feed(1).alignCenter();
    b.separator('-', cols);
    b.boldOn().line('MOVIMIENTOS').boldOff();
    b.separator('-', cols);

    b.alignLeft();
    for (const m of data.movements) {
      const sign = m.type === 'expense' ? '-' : '+';
      b.columns(
        `${formatTime(m.time)} ${m.concept}`.substring(0, cols - 14),
        `${sign}${fmtFiscalMoney(m.amount)}`,
        cols,
      );
    }
  }

  b.separator('=', cols);
  b.feed(2).cut();

  return b.toBase64();
}
