/**
 * Labor export utilities — PDF and Excel for Liquidación
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { EmployeeLaborSummary, LaborStats } from '@/hooks/useLaborHours';

export type FinancialDataMap = Map<string, { consumos: number; adelantos: number }>;
import { formatHoursDecimal } from '@/hooks/useLaborHours';

function formatPosition(pos: string | null | undefined): string {
  if (!pos) return '-';
  return pos
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const HEADERS = [
  '#',
  'Empleado',
  'Puesto',
  'Hs Trab.',
  'Hs Reg.',
  'Vacac.',
  'Faltas Inj.',
  'Falta Just.',
  'Tardanza',
  'Hs Fer.',
  'Hs Franco',
  'Ext. Háb.',
  'Ext. Inh.',
  'Consumos',
  'Adelantos',
  'Present.',
];

function buildRows(summaries: EmployeeLaborSummary[], financialData?: FinancialDataMap) {
  const rows: string[][] = [];
  let counter = 0;

  for (const s of summaries) {
    counter++;
    const multiPosition = s.positionBreakdown.length > 1;
    const fin = financialData?.get(s.userId) || { consumos: 0, adelantos: 0 };
    const consumosStr = fin.consumos > 0 ? `$${fin.consumos.toLocaleString('es-AR')}` : '-';
    const adelantosStr = fin.adelantos > 0 ? `$${fin.adelantos.toLocaleString('es-AR')}` : '-';

    if (multiPosition) {
      rows.push([
        counter.toString(), s.userName, 'MULTI',
        s.hsTrabajadasMes.toFixed(2), s.hsRegulares.toFixed(2),
        s.diasVacaciones.toString(), s.faltasInjustificadas.toString(),
        s.hsLicencia.toFixed(2), `${s.tardanzaAcumuladaMin} min`,
        s.feriadosHs.toFixed(2), s.hsFrancoTrabajado.toFixed(2),
        s.hsExtrasDiaHabil.toFixed(2), s.hsExtrasInhabil.toFixed(2),
        consumosStr, adelantosStr,
        s.presentismo ? 'SI' : 'NO',
      ]);

      for (const pb of s.positionBreakdown) {
        rows.push([
          '', `  > ${formatPosition(pb.position)}`, '',
          pb.hsTrabajadas.toFixed(2), pb.hsRegulares.toFixed(2),
          '-', '-', '-', '-',
          pb.feriadosHs.toFixed(2), pb.hsFrancoTrabajado.toFixed(2),
          pb.hsExtrasDiaHabil.toFixed(2), pb.hsExtrasInhabil.toFixed(2),
          '', '', '',
        ]);
      }
    } else {
      const posLabel = s.positionBreakdown.length === 1
        ? formatPosition(s.positionBreakdown[0].position)
        : formatPosition(s.localRole);
      rows.push([
        counter.toString(), s.userName, posLabel,
        s.hsTrabajadasMes.toFixed(2), s.hsRegulares.toFixed(2),
        s.diasVacaciones.toString(), s.faltasInjustificadas.toString(),
        s.hsLicencia.toFixed(2), `${s.tardanzaAcumuladaMin} min`,
        s.feriadosHs.toFixed(2), s.hsFrancoTrabajado.toFixed(2),
        s.hsExtrasDiaHabil.toFixed(2), s.hsExtrasInhabil.toFixed(2),
        consumosStr, adelantosStr,
        s.presentismo ? 'SI' : 'NO',
      ]);
    }
  }

  return rows;
}

// Brand colors
const BRAND_BLUE: [number, number, number] = [0, 19, 155];
const BRAND_ORANGE: [number, number, number] = [255, 82, 29];
const _BRAND_YELLOW: [number, number, number] = [255, 212, 31];

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: [number, number, number]) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function drawStatCard(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, bg: [number, number, number], textColor: [number, number, number] = [30, 30, 30]) {
  drawRoundedRect(doc, x, y, w, h, 2, bg);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(value, x + w / 2, y + h / 2 - 1, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(label, x + w / 2, y + h / 2 + 5, { align: 'center' });
}

export function exportLaborPDF(
  summaries: EmployeeLaborSummary[],
  stats: LaborStats,
  monthLabel: string,
  configInfo: { dailyLimit: number; lateTolerance: number },
  filename?: string,
  financialData?: FinancialDataMap,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const rows = buildRows(summaries, financialData);

  // ── 1. Brand header band ──
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageW, 20, 'F');

  // Accent line (orange)
  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(0, 20, pageW, 1.2, 'F');

  // Title on blue band
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`LIQUIDACIÓN — ${monthLabel}`, 14, 13);

  // Subtitle on blue band (right side)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 255);
  doc.text(
    `Límite diario: ${configInfo.dailyLimit}hs  |  Tolerancia tardanza: ${configInfo.lateTolerance} min  |  Extras = exceso sobre ${configInfo.dailyLimit}hs/día`,
    pageW - 14,
    13,
    { align: 'right' },
  );

  // ── 2. Stats summary cards ──
  const cardsY = 25;
  const cardH = 14;
  const gap = 3;
  const totalGaps = 5 * gap;
  const availW = pageW - 28;
  const cardW = (availW - totalGaps) / 6;
  let cx = 14;

  const statCards: { value: string; label: string; bg: [number, number, number]; text?: [number, number, number] }[] = [
    { value: stats.totalEmpleados.toString(), label: 'Empleados', bg: [224, 231, 255] },
    { value: formatHoursDecimal(stats.totalHsEquipo), label: 'Total Horas', bg: [224, 231, 255] },
    { value: `${stats.totalExtrasMes.toFixed(1)}h`, label: 'Horas Extras', bg: [220, 252, 231] },
    { value: stats.empleadosConPresentismo.toString(), label: 'Con Presentismo', bg: [220, 252, 231], text: [22, 128, 60] },
    { value: stats.empleadosSinPresentismo.toString(), label: 'Sin Presentismo', bg: [254, 226, 226], text: [180, 30, 30] },
    { value: summaries.length.toString(), label: 'En reporte', bg: [255, 243, 205] },
  ];

  for (const card of statCards) {
    drawStatCard(doc, cx, cardsY, cardW, cardH, card.value, card.label, card.bg, card.text);
    cx += cardW + gap;
  }

  // ── 3. Main table ──
  autoTable(doc, {
    startY: cardsY + cardH + 5,
    head: [HEADERS],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: 0.15,
      lineColor: [210, 215, 225],
    },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 36 },
      2: { cellWidth: 26, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'right' },
      12: { halign: 'right' },
      13: { halign: 'right' },
      14: { halign: 'right' },
      15: { halign: 'center', cellWidth: 14 },
    },
    alternateRowStyles: { fillColor: [240, 244, 255] },
    didParseCell(data) {
      // Presentismo SI/NO (col 15)
      if (data.section === 'body' && data.column.index === 15) {
        const val = data.cell.raw as string;
        if (val === 'SI') {
          data.cell.styles.textColor = [22, 128, 60];
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'NO') {
          data.cell.styles.textColor = [180, 30, 30];
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Faltas injustificadas > 0 (col 6)
      if (data.section === 'body' && data.column.index === 6) {
        const val = Number(data.cell.raw);
        if (val > 0) {
          data.cell.styles.textColor = [180, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Extras hábil > 0 (col 11)
      if (data.section === 'body' && data.column.index === 11) {
        const val = parseFloat(data.cell.raw as string);
        if (val > 0) {
          data.cell.styles.textColor = BRAND_ORANGE;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Extras inhábil > 0 (col 12)
      if (data.section === 'body' && data.column.index === 12) {
        const val = parseFloat(data.cell.raw as string);
        if (val > 0) {
          data.cell.styles.textColor = BRAND_ORANGE;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Tardanza > 0 (col 8)
      if (data.section === 'body' && data.column.index === 8) {
        const raw = data.cell.raw as string;
        const mins = parseInt(raw);
        if (mins > 0) {
          data.cell.styles.textColor = [230, 120, 0];
        }
      }
      // Hs Franco > 0 (col 10)
      if (data.section === 'body' && data.column.index === 10) {
        const val = parseFloat(data.cell.raw as string);
        if (val > 0) {
          data.cell.styles.textColor = BRAND_BLUE;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Hs Feriados > 0 (col 9)
      if (data.section === 'body' && data.column.index === 9) {
        const val = parseFloat(data.cell.raw as string);
        if (val > 0) {
          data.cell.styles.textColor = [120, 50, 180];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── 4. Glossary ──
  const GLOSSARY: string[][] = [
    ['Hs Trab.', 'Total de horas trabajadas en el mes (incluye feriados, francos, todo lo trabajado en el local)'],
    ['Hs Reg.', 'Horas regulares de trabajo en el local'],
    ['Vacac.', 'Dias de vacaciones tomados'],
    ['Faltas Inj.', 'Faltas injustificadas. No afecta liquidacion pero el empleado pierde el presentismo'],
    ['Falta Just.', 'Falta justificada: se computan las horas del horario programado ese dia'],
    ['Tardanza', 'Minutos de tardanza acumulados en el mes. 15 min acumulados = pierde presentismo'],
    ['Hs Fer.', 'Horas trabajadas en dias feriado'],
    ['Hs Franco', 'Horas trabajadas en dia franco'],
    ['Ext. Hab.', 'Horas extras de lunes a viernes'],
    ['Ext. Inh.', 'Horas extras de sabado y domingo'],
    ['Consumos', 'Monto total consumido por el empleado en el local durante el mes (ej. comidas)'],
    ['Adelantos', 'Adelantos de sueldo otorgados durante el mes'],
    ['Present.', 'Presentismo: SI si no tiene faltas injustificadas ni tardanza mayor a 15 min acumulados'],
  ];

  const lastTableY = (doc as any).lastAutoTable?.finalY || 45;
  const pageH = doc.internal.pageSize.getHeight();
  const glossaryHeight = GLOSSARY.length * 5 + 20;

  if (lastTableY + glossaryHeight > pageH - 15) {
    doc.addPage();
  }
  const glossStartY = lastTableY + glossaryHeight > pageH - 15 ? 15 : lastTableY + 10;

  // Glossary decorative header
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(14, glossStartY - 4, 3, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_BLUE);
  doc.text('Referencias', 20, glossStartY + 1);

  autoTable(doc, {
    startY: glossStartY + 5,
    head: [['Columna', 'Descripción']],
    body: GLOSSARY,
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [60, 60, 60],
    },
    headStyles: {
      fillColor: [224, 231, 255],
      textColor: BRAND_BLUE,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', textColor: BRAND_BLUE },
      1: { cellWidth: 120 },
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    tableWidth: 142,
  });

  // ── 5. Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 8;

    // Separator line
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 2, pageW - 14, footerY - 2);

    // Brand name left
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_BLUE);
    doc.text('HOPPINESS CLUB', 14, footerY + 1);

    // Date + page right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}  —  Página ${i}/${pageCount}`,
      pageW - 14,
      footerY + 1,
      { align: 'right' },
    );
  }

  doc.save(`${filename || 'liquidacion'}.pdf`);
}

export function exportLaborExcel(
  summaries: EmployeeLaborSummary[],
  stats: LaborStats,
  monthLabel: string,
  configInfo: { dailyLimit: number; lateTolerance: number },
  filename?: string,
  financialData?: FinancialDataMap,
) {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [];

  data.push([`Liquidación — ${monthLabel}`]);
  data.push([
    `Límite diario: ${configInfo.dailyLimit} hs | Tolerancia tardanza: ${configInfo.lateTolerance} min | Extras = exceso sobre ${configInfo.dailyLimit}hs/día`,
  ]);
  data.push([]);

  data.push([
    'Empleados', stats.totalEmpleados, '',
    'Total horas', Number(stats.totalHsEquipo.toFixed(2)), '',
    'Horas extras', Number(stats.totalExtrasMes.toFixed(1)), '',
    'Con presentismo', stats.empleadosConPresentismo, '',
    'Sin presentismo', stats.empleadosSinPresentismo,
  ]);
  data.push([]);

  data.push(HEADERS);

  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    const fin = financialData?.get(s.userId) || { consumos: 0, adelantos: 0 };
    data.push([
      i + 1,
      s.userName,
      formatPosition(s.localRole),
      s.hsTrabajadasMes,
      s.hsRegulares,
      s.diasVacaciones,
      s.faltasInjustificadas,
      s.hsLicencia,
      s.tardanzaAcumuladaMin,
      s.feriadosHs,
      s.hsFrancoTrabajado,
      s.hsExtrasDiaHabil,
      s.hsExtrasInhabil,
      fin.consumos,
      fin.adelantos,
      s.presentismo ? 'SI' : 'NO',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 4 },  // #
    { wch: 25 }, // Empleado
    { wch: 14 }, // Puesto
    { wch: 10 }, // Hs Trab
    { wch: 10 }, // Hs Reg
    { wch: 8 },  // Vacac
    { wch: 10 }, // Faltas Inj
    { wch: 10 }, // Falta Just
    { wch: 10 }, // Tardanza
    { wch: 10 }, // Hs Fer
    { wch: 10 }, // Hs Franco
    { wch: 10 }, // Ext Háb
    { wch: 10 }, // Ext Inh
    { wch: 12 }, // Consumos
    { wch: 12 }, // Adelantos
    { wch: 10 }, // Presentismo
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Liquidación');
  XLSX.writeFile(wb, `${filename || 'liquidacion'}.xlsx`);
}
