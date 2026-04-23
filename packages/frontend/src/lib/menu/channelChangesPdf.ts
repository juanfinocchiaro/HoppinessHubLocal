/**
 * Generador de PDF de cambios pendientes por canal (Fase 5).
 *
 * El PDF es un checklist para que el encargado de Rappi / PedidosYa / MP
 * Delivery lo siga manualmente en el portal de la app. Incluye:
 *  - Precios a modificar
 *  - Artículos nuevos a crear
 *  - Artículos a desactivar
 *  - Promociones a cargar
 *  - Promociones a cambiar
 *  - Promociones a dar de baja
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChannelPendingChange } from '@/services/channelChangesService';

const CHANNEL_LABELS: Record<string, string> = {
  rappi: 'Rappi',
  pedidos_ya: 'PedidosYa',
  mp_delivery: 'MercadoPago Delivery',
};

const SECTION_TITLES: Record<string, string> = {
  price_change: 'PRECIOS A MODIFICAR',
  new_article: 'ARTÍCULOS NUEVOS A CREAR',
  deactivation: 'ARTÍCULOS A DESACTIVAR',
  activation: 'ARTÍCULOS A REACTIVAR',
  new_promotion: 'PROMOCIONES A CARGAR',
  promotion_change: 'PROMOCIONES A ACTUALIZAR',
  promotion_end: 'PROMOCIONES A DAR DE BAJA',
};

const SECTION_ORDER: Array<keyof typeof SECTION_TITLES> = [
  'price_change',
  'new_article',
  'deactivation',
  'activation',
  'new_promotion',
  'promotion_change',
  'promotion_end',
];

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—';
  return `$${Number(value).toLocaleString('es-AR')}`;
}

function describePriceChange(change: ChannelPendingChange): string {
  const p = change.payload as Record<string, unknown> | null;
  const name = (p?.item_name as string | null) ?? change.entity_id;
  const prev = p?.previous_price as number | null | undefined;
  const next = p?.new_price as number | null | undefined;
  if (prev != null && next != null) {
    return `${name}: ${formatCurrency(prev)} → ${formatCurrency(next)}`;
  }
  return `${name}: ${formatCurrency(next)}`;
}

function describeNewArticle(change: ChannelPendingChange): string {
  const p = change.payload as Record<string, unknown> | null;
  const name = (p?.item_name as string | null) ?? change.entity_id;
  const price = p?.new_price as number | null | undefined;
  return `${name} — ${formatCurrency(price)}`;
}

function describeDeactivation(change: ChannelPendingChange): string {
  const p = change.payload as Record<string, unknown> | null;
  const name = (p?.item_name as string | null) ?? change.entity_id;
  return name;
}

function describePromotion(change: ChannelPendingChange): string[] {
  const p = change.payload as Record<string, unknown> | null;
  const lines: string[] = [];
  const name = (p?.promotion_name as string | null) ?? change.entity_id;
  const type = p?.promotion_type as string | undefined;
  const value = p?.promotion_value as string | number | undefined;
  lines.push(name);
  if (type) lines.push(`   Tipo: ${type}${value ? ` · Valor: ${value}` : ''}`);
  const days = p?.dias_semana as unknown;
  if (Array.isArray(days) && days.length > 0) {
    lines.push(`   Días: ${days.join(', ')}`);
  }
  const hi = p?.hora_inicio as string | undefined;
  const hf = p?.hora_fin as string | undefined;
  if (hi || hf) lines.push(`   Horario: ${hi ?? '00:00'} - ${hf ?? '23:59'}`);
  const promoText = p?.promo_text as string | undefined;
  if (promoText) lines.push(`   Texto: "${promoText}"`);
  const customFinal = p?.custom_final_price as number | null | undefined;
  if (customFinal != null) lines.push(`   Precio final: ${formatCurrency(customFinal)}`);
  return lines;
}

export function generateChannelChangesPdf(input: {
  channelCode: string;
  generatedAt: string;
  deliveredTo?: string | null;
  changes: ChannelPendingChange[];
}): void {
  const { channelCode, generatedAt, deliveredTo, changes } = input;
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = new Date(generatedAt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const channelLabel = CHANNEL_LABELS[channelCode] ?? channelCode;

  doc.setFontSize(18);
  doc.text(`Cambios para ${channelLabel.toUpperCase()}`, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${dateStr}${deliveredTo ? ` · Para: ${deliveredTo}` : ''}`, 14, 27);
  doc.setTextColor(0);

  let cursorY = 33;

  const grouped = new Map<string, ChannelPendingChange[]>();
  for (const change of changes) {
    const list = grouped.get(change.change_type) ?? [];
    list.push(change);
    grouped.set(change.change_type, list);
  }

  for (const sectionKey of SECTION_ORDER) {
    const list = grouped.get(sectionKey);
    if (!list || list.length === 0) continue;

    const title = `${SECTION_TITLES[sectionKey]} (${list.length}):`;
    const bodyRows: string[][] = [];
    for (const change of list) {
      switch (change.change_type) {
        case 'price_change':
          bodyRows.push([`• ${describePriceChange(change)}`]);
          break;
        case 'new_article':
          bodyRows.push([`• ${describeNewArticle(change)}`]);
          break;
        case 'deactivation':
        case 'activation':
          bodyRows.push([`• ${describeDeactivation(change)}`]);
          break;
        case 'new_promotion':
        case 'promotion_change':
        case 'promotion_end':
          for (const line of describePromotion(change)) {
            bodyRows.push([line.startsWith('   ') ? line : `• ${line}`]);
          }
          break;
      }
    }

    autoTable(doc, {
      startY: cursorY,
      head: [[title]],
      body: bodyRows,
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        fillColor: [59, 59, 59],
        textColor: 255,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      },
      styles: { fontSize: 9, cellPadding: 1.5 },
    });
    cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
    cursorY += 6;
  }

  if (cursorY === 33) {
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text('No hay cambios pendientes.', 14, cursorY + 4);
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Generado por Hoppiness Hub · ${dateStr}`,
    14,
    doc.internal.pageSize.height - 10,
  );

  const filename = `cambios-${channelCode}-${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
