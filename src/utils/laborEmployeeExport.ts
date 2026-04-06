/**
 * Per-employee export — PDF and Excel with full month view,
 * scheduled hours, clock entries, absences and lateness.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EmployeeLaborSummary } from '@/hooks/useLaborHours';
import { formatHoursDecimal } from '@/hooks/useLaborHours';

// ── Brand colors ──
const BRAND_BLUE: [number, number, number] = [0, 19, 155];
const BRAND_ORANGE: [number, number, number] = [255, 82, 29];

function toArgentinaTime(isoStr: string): string {
  const d = new Date(isoStr);
  const offsetMs = -3 * 60 * 60 * 1000;
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + offsetMs);
  return format(local, 'HH:mm');
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = format(d, 'EEE', { locale: es });
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${format(d, 'dd/MM')}`;
}

function formatSchedule(startTime: string | null, endTime: string | null, startTime2: string | null, endTime2: string | null): string {
  if (!startTime || !endTime) return '-';
  const t1 = `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
  if (startTime2 && endTime2) {
    return `${t1} / ${startTime2.slice(0, 5)}-${endTime2.slice(0, 5)}`;
  }
  return t1;
}

interface DailyRow {
  date: string;
  label: string;
  schedule: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  type: string;
  tardanza: string;
  isAbsent: boolean;
}

function buildDailyRows(s: EmployeeLaborSummary, year: number, month: number): DailyRow[] {
  const latenessMap = new Map(s.dailyLateness.map((l) => [l.date, l]));
  const schedMap = new Map(s.scheduledDays.map((sd) => [sd.date, sd]));
  const entriesByDate = new Map<string, typeof s.entries>();
  for (const e of s.entries) {
    const list = entriesByDate.get(e.date) ?? [];
    list.push(e);
    entriesByDate.set(e.date, list);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const rows: DailyRow[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = format(new Date(year, month, d), 'yyyy-MM-dd');
    const sched = schedMap.get(dateStr);
    const dayEntries = entriesByDate.get(dateStr) ?? [];
    const hasEntries = dayEntries.length > 0;
    const hasSched = !!sched;

    if (!hasSched && !hasEntries) continue;

    let type = 'Regular';
    const isHoliday = dayEntries.some((e) => e.isHoliday) || false;
    const isDayOff = sched?.isDayOff || dayEntries.some((e) => e.isDayOff);
    const position = sched?.position;

    if (isHoliday) type = 'Feriado';
    else if (position === 'vacaciones') type = 'Vacaciones';
    else if (position === 'cumple') type = 'Cumpleaños';
    else if (isDayOff) type = 'Franco';

    const scheduleStr = (type === 'Franco' || type === 'Vacaciones' || type === 'Cumpleaños')
      ? (type === 'Franco' ? 'Franco' : type)
      : (hasSched ? formatSchedule(sched!.startTime, sched!.endTime, sched!.startTime2, sched!.endTime2) : '-');

    const hadWorkSchedule = hasSched && !sched!.isDayOff && sched!.startTime && position !== 'vacaciones' && position !== 'cumple';
    const isAbsent = !!(hadWorkSchedule && !hasEntries && dateStr <= today && !isHoliday);

    if (isAbsent) {
      rows.push({ date: dateStr, label: dayLabel(dateStr), schedule: scheduleStr, checkIn: '-', checkOut: '-', hours: '-', type: 'AUSENTE', tardanza: '-', isAbsent: true });
      continue;
    }

    if ((type === 'Franco' || type === 'Vacaciones' || type === 'Cumpleaños') && !hasEntries) {
      rows.push({ date: dateStr, label: dayLabel(dateStr), schedule: scheduleStr, checkIn: '-', checkOut: '-', hours: '-', type, tardanza: '-', isAbsent: false });
      continue;
    }

    if (hasEntries) {
      const sorted = [...dayEntries].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      sorted.forEach((e, idx) => {
        const lateness = idx === 0 ? latenessMap.get(e.date) : undefined;
        rows.push({
          date: dateStr,
          label: idx === 0 ? dayLabel(dateStr) : '',
          schedule: idx === 0 ? scheduleStr : '',
          checkIn: e.checkIn ? toArgentinaTime(e.checkIn) : '-',
          checkOut: e.checkOut ? toArgentinaTime(e.checkOut) : 'Sin salida',
          hours: e.hoursDecimal > 0 ? e.hoursDecimal.toFixed(2) : '-',
          type: idx === 0 ? type : '',
          tardanza: lateness ? `${lateness.minutes}m (prog: ${lateness.scheduledStart.slice(0, 5)})` : '-',
          isAbsent: false,
        });
      });
    }
  }

  return rows;
}

// ── Drawing helpers ──

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: [number, number, number]) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function drawStatCard(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  value: string, label: string,
  bg: [number, number, number], textColor: [number, number, number] = [30, 30, 30],
) {
  drawRoundedRect(doc, x, y, w, h, 2, bg);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(value, x + w / 2, y + h / 2 - 1, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(label, x + w / 2, y + h / 2 + 4, { align: 'center' });
}

// ── Branded footer ──

function drawBrandFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Separator line
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);

    // Brand name left
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_BLUE);
    doc.text('HOPPINESS CLUB', 14, pageH - 7);

    // Date + page right
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}  —  Pág ${i}/${pageCount}`,
      pageW - 14,
      pageH - 7,
      { align: 'right' },
    );
  }
}

const DAILY_HEADERS = ['Día', 'Horario', 'Entrada', 'Salida', 'Horas', 'Tipo', 'Tardanza'];

interface FinancialItem {
  date: string;
  description: string;
  amount: number;
}

interface AdvanceItem {
  date: string;
  reason: string;
  amount: number;
  status: string;
}

export interface EmployeeFinancialData {
  consumos: number;
  adelantos: number;
  consumoItems?: FinancialItem[];
  adelantoItems?: AdvanceItem[];
}

export function exportEmployeePDF(
  s: EmployeeLaborSummary,
  monthLabel: string,
  filename?: string,
  financialData?: EmployeeFinancialData,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  const refDate = s.scheduledDays[0]?.date || s.entries[0]?.date || format(new Date(), 'yyyy-MM-dd');
  const [yearStr, monthStr] = refDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const rows = buildDailyRows(s, year, month);

  // ── 1. Brand header band ──
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageW, 26, 'F');

  // Orange accent line
  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(0, 26, pageW, 1.2, 'F');

  // Title on blue band
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`RESUMEN INDIVIDUAL — ${monthLabel}`, 14, 11);

  // Employee info on blue band
  doc.setFontSize(10);
  doc.text(s.userName, 14, 18);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 255);
  doc.text(`Puesto: ${s.localRole?.toUpperCase() || '-'}  |  CUIL: ${s.cuil || '-'}`, 14, 23);

  // ── 2. Stat cards ──
  const cardsStartY = 31;
  const cardH = 13;
  const gap = 2.5;
  const cols = 4;
  const cardW = (pageW - 28 - (cols - 1) * gap) / cols;
  const fin = financialData || { consumos: 0, adelantos: 0 };

  const cards: { value: string; label: string; bg: [number, number, number]; text?: [number, number, number] }[] = [
    { value: formatHoursDecimal(s.hsTrabajadasMes), label: 'Hs Trabajadas', bg: [224, 231, 255] },
    { value: formatHoursDecimal(s.hsRegulares), label: 'Hs Regulares', bg: [224, 231, 255] },
    { value: `${s.diasVacaciones} días`, label: 'Vacaciones', bg: [220, 252, 231] },
    { value: s.faltasInjustificadas.toString(), label: 'Faltas Inj.', bg: s.faltasInjustificadas > 0 ? [254, 226, 226] : [245, 245, 245], text: s.faltasInjustificadas > 0 ? [220, 38, 38] : [30, 30, 30] },
    { value: `${s.tardanzaAcumuladaMin} min`, label: 'Tardanza Total', bg: [255, 243, 205], text: s.tardanzaAcumuladaMin > 0 ? [180, 80, 0] : [30, 30, 30] },
    { value: `${s.hsLicencia}h`, label: 'Falta Just.', bg: [245, 245, 245] },
    { value: s.feriadosHs.toFixed(2), label: 'Hs Feriados', bg: [237, 233, 254] },
    { value: s.hsFrancoTrabajado.toFixed(2), label: 'Hs Franco', bg: [237, 233, 254], text: s.hsFrancoTrabajado > 0 ? [109, 40, 217] : [30, 30, 30] },
    { value: s.hsExtrasDiaHabil.toFixed(2), label: 'Extras Hábil', bg: [220, 252, 231], text: [22, 128, 60] },
    { value: s.hsExtrasInhabil.toFixed(2), label: 'Extras Inhábil', bg: [220, 252, 231], text: [22, 128, 60] },
    { value: s.presentismo ? 'SI' : 'NO', label: 'Presentismo', bg: s.presentismo ? [220, 252, 231] : [254, 226, 226], text: s.presentismo ? [22, 128, 60] : [220, 38, 38] },
    { value: `$${fin.consumos.toLocaleString('es-AR')}`, label: 'Consumos', bg: [237, 233, 254], text: [109, 40, 217] },
  ];

  // If we have financial data, add adelantos too (replace last card)
  cards.push({ value: `$${fin.adelantos.toLocaleString('es-AR')}`, label: 'Adelantos', bg: [224, 231, 255], text: [37, 99, 235] });

  // Render cards in rows of 4
  for (let i = 0; i < cards.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 14 + col * (cardW + gap);
    const y = cardsStartY + row * (cardH + gap);
    drawStatCard(doc, x, y, cardW, cardH, cards[i].value, cards[i].label, cards[i].bg, cards[i].text);
  }

  const cardRows = Math.ceil(cards.length / cols);
  let currentY = cardsStartY + cardRows * (cardH + gap) + 2;

  // ── 2b. Position breakdown (if multi-position) ──
  if (s.positionBreakdown.length > 1) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_BLUE);
    doc.text('DESGLOSE POR PUESTO', 14, currentY);
    currentY += 2;

    const pbData = s.positionBreakdown.map((pb) => {
      const posLabel = pb.position.charAt(0).toUpperCase() + pb.position.slice(1);
      return [posLabel, `${pb.hsTrabajadas.toFixed(2)} hs`, `${pb.hsRegulares.toFixed(2)} reg`, `${pb.feriadosHs.toFixed(2)} fer`, `${pb.hsExtrasDiaHabil.toFixed(2)} ext`];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Puesto', 'Hs Trab.', 'Hs Reg.', 'Hs Fer.', 'Extras']],
      body: pbData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      tableWidth: 120,
      alternateRowStyles: { fillColor: [240, 244, 255] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // ── 3. Daily detail table ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_BLUE);
  doc.text('Detalle diario de fichajes', 14, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [DAILY_HEADERS],
    body: rows.map((r) => [r.label, r.schedule, r.checkIn, r.checkOut, r.hours, r.type, r.tardanza]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, lineWidth: 0.1, lineColor: [210, 215, 225] },
    headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 32, fontSize: 6.5 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 22 },
      6: { cellWidth: 38 },
    },
    alternateRowStyles: { fillColor: [240, 244, 255] },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const rowIdx = data.row.index;
      const row = rows[rowIdx];
      if (!row) return;

      if (row.isAbsent) {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.fontStyle = 'bold';
        return;
      }

      if (data.column.index === 6 && data.cell.raw !== '-') {
        data.cell.styles.textColor = [234, 88, 12];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val === 'Feriado') data.cell.styles.textColor = [37, 99, 235];
        if (val === 'Franco') data.cell.styles.textColor = [147, 51, 234];
        if (val === 'Vacaciones') data.cell.styles.textColor = [22, 163, 74];
        if (val === 'Cumpleaños') data.cell.styles.textColor = [234, 88, 12];
      }
    },
  });

  // ── 4. Lateness summary ──
  if (s.dailyLateness.length > 0) {
    const lateY = (doc as any).lastAutoTable.finalY + 4;
    // Decorative blue line
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.5);
    doc.line(14, lateY, 18, lateY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_ORANGE);
    doc.text(`Tardanzas: ${s.dailyLateness.length} día(s) — Total: ${s.tardanzaAcumuladaMin} minutos`, 20, lateY + 0.5);
    doc.setTextColor(0);
  }

  // ── 5. Brand footer ──
  drawBrandFooter(doc);

  doc.save(`${filename || `resumen-${s.userName.replace(/\s+/g, '_').toLowerCase()}`}.pdf`);
}

export function exportEmployeeExcel(s: EmployeeLaborSummary, monthLabel: string, filename?: string) {
  const wb = XLSX.utils.book_new();

  const refDate = s.scheduledDays[0]?.date || s.entries[0]?.date || format(new Date(), 'yyyy-MM-dd');
  const [yearStr, monthStr] = refDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const rows = buildDailyRows(s, year, month);

  const data: (string | number)[][] = [];
  data.push([`Resumen Individual — ${monthLabel}`]);
  data.push([s.userName, s.localRole?.toUpperCase() || '-', `CUIL: ${s.cuil || '-'}`]);
  data.push([]);

  data.push(['Concepto', 'Valor']);
  data.push(['Hs Trabajadas', s.hsTrabajadasMes]);
  data.push(['Hs Regulares', s.hsRegulares]);
  data.push(['Vacaciones (días)', s.diasVacaciones]);
  data.push(['Faltas Inj.', s.faltasInjustificadas]);
  data.push(['Falta Just. (hs)', s.hsLicencia]);
  data.push(['Tardanza (min)', s.tardanzaAcumuladaMin]);
  data.push(['Hs Feriados', s.feriadosHs]);
  data.push(['Hs Franco', s.hsFrancoTrabajado]);
  data.push(['Extras Hábil', s.hsExtrasDiaHabil]);
  data.push(['Extras Inhábil', s.hsExtrasInhabil]);
  data.push(['Presentismo', s.presentismo ? 'SI' : 'NO']);

  if (s.positionBreakdown.length > 0) {
    data.push([]);
    data.push(['DESGLOSE POR PUESTO', '']);
    for (const pb of s.positionBreakdown) {
      const posLabel = pb.position.charAt(0).toUpperCase() + pb.position.slice(1);
      data.push([`  ${posLabel}`, pb.hsTrabajadas]);
    }
  }

  data.push([]);
  data.push(DAILY_HEADERS);
  for (const r of rows) {
    data.push([r.label, r.schedule, r.checkIn, r.checkOut, r.hours, r.type, r.tardanza]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 30 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  XLSX.writeFile(wb, `${filename || `resumen-${s.userName.replace(/\s+/g, '_').toLowerCase()}`}.xlsx`);
}
