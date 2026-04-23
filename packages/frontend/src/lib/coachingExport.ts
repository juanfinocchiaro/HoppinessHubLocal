/**
 * CoachingExportUtils - Utilidades para exportar datos de coaching
 * Mejora #6: Exportación y Reportes
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CoachingData {
  id: string;
  coaching_date: string;
  coaching_month: number;
  coaching_year: number;
  overall_score: number | null;
  station_score: number | null;
  general_score: number | null;
  strengths: string | null;
  areas_to_improve: string | null;
  action_plan: string | null;
  acknowledged_at: string | null;
  employee?: { full_name: string } | null;
  evaluator?: { full_name: string } | null;
}

/**
 * Exporta coachings a CSV
 */
export function exportCoachingsToCSV(coachings: CoachingData[], filename?: string): void {
  const headers = [
    'Fecha',
    'Empleado',
    'Evaluador',
    'Score General',
    'Score Estaciones',
    'Score Competencias',
    'Fortalezas',
    'Áreas de Mejora',
    'Plan de Acción',
    'Confirmado',
  ];

  const rows = coachings.map((c) => [
    format(new Date(c.coaching_date), 'dd/MM/yyyy'),
    c.employee?.full_name || '-',
    c.evaluator?.full_name || '-',
    c.overall_score?.toFixed(2) || '-',
    c.station_score?.toFixed(2) || '-',
    c.general_score?.toFixed(2) || '-',
    `"${(c.strengths || '').replace(/"/g, '""')}"`,
    `"${(c.areas_to_improve || '').replace(/"/g, '""')}"`,
    `"${(c.action_plan || '').replace(/"/g, '""')}"`,
    c.acknowledged_at ? 'Sí' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `coachings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Genera reporte mensual en texto
 */
export function generateMonthlyReport(
  coachings: CoachingData[],
  branchName: string,
  month: number,
  year: number,
): string {
  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });

  const totalCoachings = coachings.length;
  const confirmedCount = coachings.filter((c) => c.acknowledged_at).length;

  const scores = coachings
    .filter((c) => c.overall_score !== null)
    .map((c) => c.overall_score as number);

  const avgScore =
    scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 'N/A';

  const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : 'N/A';
  const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : 'N/A';

  const report = `
═══════════════════════════════════════════════════
  REPORTE DE COACHING - ${monthName.toUpperCase()}
  ${branchName}
═══════════════════════════════════════════════════

📊 RESUMEN GENERAL
─────────────────────────────────────────────────
• Total de coachings realizados: ${totalCoachings}
• Coachings confirmados por empleados: ${confirmedCount}
• Tasa de confirmación: ${totalCoachings > 0 ? Math.round((confirmedCount / totalCoachings) * 100) : 0}%

📈 SCORES
─────────────────────────────────────────────────
• Promedio general: ${avgScore}/4
• Score más alto: ${maxScore}/4
• Score más bajo: ${minScore}/4

👥 DETALLE POR EMPLEADO
─────────────────────────────────────────────────
${coachings
  .map(
    (c) =>
      `• ${c.employee?.full_name || 'Sin nombre'}: ${c.overall_score?.toFixed(1) || '-'}/4 ${c.acknowledged_at ? '✓' : '⏳'}`,
  )
  .join('\n')}

═══════════════════════════════════════════════════
Generado el ${format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
`.trim();

  return report;
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    return false;
  }
}
