/**
 * Labor export utilities — PDF and Excel for Liquidación
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { EmployeeLaborSummary, LaborStats } from '@/hooks/useLaborHours';
import { formatHoursDecimal } from '@/hooks/useLaborHours';

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
  'Present.',
];

function buildRows(summaries: EmployeeLaborSummary[]) {
  return summaries.map((s, i) => [
    (i + 1).toString(),
    s.userName,
    s.localRole?.toUpperCase() || '-',
    s.hsTrabajadasMes.toFixed(2),
    s.hsRegulares.toFixed(2),
    s.diasVacaciones.toString(),
    s.faltasInjustificadas.toString(),
    s.hsLicencia.toFixed(2),
    `${s.tardanzaAcumuladaMin} min`,
    s.feriadosHs.toFixed(2),
    s.hsFrancoTrabajado.toFixed(2),
    s.hsExtrasDiaHabil.toFixed(2),
    s.hsExtrasInhabil.toFixed(2),
    s.presentismo ? 'SI' : 'NO',
  ]);
}

export function exportLaborPDF(
  summaries: EmployeeLaborSummary[],
  stats: LaborStats,
  monthLabel: string,
  configInfo: { dailyLimit: number; lateTolerance: number },
  filename?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const rows = buildRows(summaries);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Liquidación — ${monthLabel}`, 14, 15);

  // Config info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(
    `Límite diario: ${configInfo.dailyLimit} hs  |  Tolerancia tardanza: ${configInfo.lateTolerance} min acum.  |  Extras = exceso sobre ${configInfo.dailyLimit}hs/día`,
    14,
    22,
  );
  doc.setTextColor(0);

  // Stats summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const statsY = 28;
  const statsText = [
    `Empleados: ${stats.totalEmpleados}`,
    `Total horas: ${formatHoursDecimal(stats.totalHsEquipo)}`,
    `Horas extras: ${stats.totalExtrasMes.toFixed(1)}h`,
    `Con presentismo: ${stats.empleadosConPresentismo}`,
    `Sin presentismo: ${stats.empleadosSinPresentismo}`,
  ];
  doc.text(statsText.join('   |   '), 14, statsY);
  doc.setFont('helvetica', 'normal');

  // Table
  autoTable(doc, {
    startY: 33,
    head: [HEADERS],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: [41, 65, 106],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22, halign: 'center' },
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
      13: { halign: 'center', cellWidth: 14 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell(data) {
      // Color presentismo
      if (data.section === 'body' && data.column.index === 13) {
        const val = data.cell.raw as string;
        if (val === 'SI') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Color faltas inj
      if (data.section === 'body' && data.column.index === 6) {
        const val = Number(data.cell.raw);
        if (val > 0) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}  —  Página ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 7,
    );
  }

  doc.save(`${filename || 'liquidacion'}.pdf`);
}

export function exportLaborExcel(
  summaries: EmployeeLaborSummary[],
  stats: LaborStats,
  monthLabel: string,
  configInfo: { dailyLimit: number; lateTolerance: number },
) {
  const wb = XLSX.utils.book_new();

  // Build data array
  const data: (string | number)[][] = [];

  // Title row
  data.push([`Liquidación — ${monthLabel}`]);
  data.push([
    `Límite diario: ${configInfo.dailyLimit} hs | Tolerancia tardanza: ${configInfo.lateTolerance} min | Extras = exceso sobre ${configInfo.dailyLimit}hs/día`,
  ]);
  data.push([]); // blank row

  // Stats row
  data.push([
    'Empleados',
    stats.totalEmpleados,
    '',
    'Total horas',
    Number(stats.totalHsEquipo.toFixed(2)),
    '',
    'Horas extras',
    Number(stats.totalExtrasMes.toFixed(1)),
    '',
    'Con presentismo',
    stats.empleadosConPresentismo,
    '',
    'Sin presentismo',
    stats.empleadosSinPresentismo,
  ]);
  data.push([]); // blank row

  // Headers
  data.push(HEADERS);

  // Data rows
  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    data.push([
      i + 1,
      s.userName,
      s.localRole?.toUpperCase() || '-',
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
      s.presentismo ? 'SI' : 'NO',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
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
    { wch: 10 }, // Presentismo
  ];

  // Merge title
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Liquidación');
  XLSX.writeFile(wb, `liquidacion-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}
