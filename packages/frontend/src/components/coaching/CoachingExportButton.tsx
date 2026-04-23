/**
 * CoachingExportButton - Botón para exportar datos de coaching
 * Mejora #6: Exportación y Reportes
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Copy, Loader2 } from 'lucide-react';
import { useCoachings } from '@/hooks/useCoachings';
import { exportCoachingsToCSV, generateMonthlyReport, copyToClipboard } from '@/lib/coachingExport';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

interface CoachingExportButtonProps {
  branchId: string;
  branchName: string;
}

export function CoachingExportButton({ branchId, branchName }: CoachingExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: coachings, isLoading } = useCoachings({ branchId });

  const handleExportCSV = async () => {
    if (!coachings?.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    setExporting(true);
    try {
      exportCoachingsToCSV(
        coachings.map((c) => ({
          ...c,
          employee: c.employee ? { full_name: c.employee.full_name || '' } : null,
          evaluator: c.evaluator ? { full_name: c.evaluator.full_name || '' } : null,
        })),
        `coaching_${branchName.replace(/\s+/g, '_')}_${currentYear}.csv`,
      );
      toast.success('Archivo CSV descargado');
    } catch (error) {
      handleError(error, { userMessage: 'Error al exportar', context: 'CoachingExportButton' });
    } finally {
      setExporting(false);
    }
  };

  const handleCopyReport = async () => {
    if (!coachings?.length) {
      toast.error('No hay datos para generar reporte');
      return;
    }

    const monthlyCoachings = coachings.filter(
      (c) => c.coaching_month === currentMonth && c.coaching_year === currentYear,
    );

    const report = generateMonthlyReport(
      monthlyCoachings.map((c) => ({
        ...c,
        employee: c.employee ? { full_name: c.employee.full_name || '' } : null,
        evaluator: c.evaluator ? { full_name: c.evaluator.full_name || '' } : null,
      })),
      branchName,
      currentMonth,
      currentYear,
    );

    const success = await copyToClipboard(report);
    if (success) {
      toast.success('Reporte copiado al portapapeles');
    } else {
      toast.error('Error al copiar');
    }
  };

  if (isLoading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          Descargar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyReport}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar reporte mensual
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
