/**
 * Per-employee export — PDF and Excel with daily clock-in details and lateness
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EmployeeLaborSummary } from '@/hooks/useLaborHours';
import { formatHoursDecimal } from '@/hooks/useLaborHours';

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

interface DailyRow {
  date: string;
  label: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  type: string; // Regular, Feriado, Franco, Ausente
  tardanza: string;
}

function buildDailyRows(s: EmployeeLaborSummary): DailyRow[] {
  const latenessMap = new Map(s.dailyLateness.map((l) => [l.date, l]));

  const sorted = [...s.entries].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((e) => {
    let type = 'Regular';
    if (e.isHoliday) type = 'Feriado';
    else if (e.isDayOff) type = 'Franco';

    const lateness = latenessMap.get(e.date);
    return {
      date: e.date,
      label: dayLabel(e.date),
      checkIn: e.checkIn ? toArgentinaTime(e.checkIn) : '-',
      checkOut: e.checkOut ? toArgentinaTime(e.checkOut) : 'Sin salida',
      hours: e.hoursDecimal > 0 ? e.hoursDecimal.toFixed(2) : '-',
      type,
      tardanza: lateness ? `${lateness.minutes}m (prog: ${lateness.scheduledStart.slice(0, 5)})` : '-',
    };
  });
}

const DAILY_HEADERS = ['Día', 'Entrada', 'Salida', 'Horas', 'Tipo', 'Tardanza'];

export function exportEmployeePDF(s: EmployeeLaborSummary, monthLabel: string, filename?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const rows = buildDailyRows(s);

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Resumen Individual — ${monthLabel}`, 14, 15);

  doc.setFontSize(11);
  doc.text(s.userName, 14, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Puesto: ${s.localRole?.toUpperCase() || '-'}  |  CUIL: ${s.cuil || '-'}`, 14, 29);
  doc.setTextColor(0);

  // Summary box
  const summaryData = [
    ['Hs Trabajadas', formatHoursDecimal(s.hsTrabajadasMes)],
    ['Hs Regulares', formatHoursDecimal(s.hsRegulares)],
    ['Vacaciones', `${s.diasVacaciones} días`],
    ['Faltas Inj.', s.faltasInjustificadas.toString()],
    ['Falta Just.', `${s.hsLicencia}h`],
    ['Tardanza Total', `${s.tardanzaAcumuladaMin} min`],
    ['Hs Feriados', s.feriadosHs.toFixed(2)],
    ['Hs Franco', s.hsFrancoTrabajado.toFixed(2)],
    ['Extras Hábil', s.hsExtrasDiaHabil.toFixed(2)],
    ['Extras Inhábil', s.hsExtrasInhabil.toFixed(2)],
    ['Presentismo', s.presentismo ? 'SI' : 'NO'],
  ];

  autoTable(doc, {
    startY: 34,
    head: [['Concepto', 'Valor']],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 106], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { halign: 'right', cellWidth: 30 } },
    tableWidth: 70,
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === 10) {
        const val = data.cell.raw as string;
        if (data.column.index === 1) {
          data.cell.styles.textColor = val === 'SI' ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Daily detail table
  const detailY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle diario de fichajes', 14, detailY);

  autoTable(doc, {
    startY: detailY + 4,
    head: [DAILY_HEADERS],
    body: rows.map((r) => [r.label, r.checkIn, r.checkOut, r.hours, r.type, r.tardanza]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, lineWidth: 0.1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [41, 65, 106], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { cellWidth: 42 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell(data) {
      if (data.section === 'body') {
        // Highlight tardanza
        if (data.column.index === 5 && data.cell.raw !== '-') {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fontStyle = 'bold';
        }
        // Color type
        if (data.column.index === 4) {
          const val = data.cell.raw as string;
          if (val === 'Feriado') data.cell.styles.textColor = [37, 99, 235];
          if (val === 'Franco') data.cell.styles.textColor = [147, 51, 234];
        }
      }
    },
  });

  // Lateness summary if any
  if (s.dailyLateness.length > 0) {
    const lateY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.text(`Tardanzas: ${s.dailyLateness.length} día(s) — Total: ${s.tardanzaAcumuladaMin} minutos`, 14, lateY);
    doc.setTextColor(0);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}  —  Pág ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 7,
    );
  }

  doc.save(`${filename || `resumen-${s.userName.replace(/\s+/g, '_').toLowerCase()}`}.pdf`);
}

export function exportEmployeeExcel(s: EmployeeLaborSummary, monthLabel: string) {
  const wb = XLSX.utils.book_new();
  const rows = buildDailyRows(s);

  const data: (string | number)[][] = [];
  data.push([`Resumen Individual — ${monthLabel}`]);
  data.push([s.userName, s.localRole?.toUpperCase() || '-', `CUIL: ${s.cuil || '-'}`]);
  data.push([]);

  // Summary
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
  data.push([]);

  // Daily detail
  data.push(DAILY_HEADERS);
  for (const r of rows) {
    data.push([r.label, r.checkIn, r.checkOut, r.hours, r.type, r.tardanza]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 30 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Resumen');

  const safeName = s.userName.replace(/\s+/g, '_').toLowerCase();
  XLSX.writeFile(wb, `resumen-${safeName}-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}
