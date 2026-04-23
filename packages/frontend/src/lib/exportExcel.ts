import * as XLSX from 'xlsx';

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

/**
 * Exports an array of objects as an Excel (.xlsx) file.
 * Columns are derived from the keys of the first item,
 * or you can provide explicit headers.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  headers: Record<keyof T, string>,
  options: ExportOptions,
) {
  if (data.length === 0) return;

  const keys = Object.keys(headers) as (keyof T)[];
  const headerRow = keys.map((k) => headers[k]);

  const rows = data.map((item) =>
    keys.map((k) => {
      const val = item[k];
      if (val instanceof Date) return val.toLocaleDateString('es-AR');
      return val ?? '';
    }),
  );

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);

  const colWidths = keys.map((_k, i) => {
    const maxContent = Math.max(
      String(headerRow[i]).length,
      ...rows.map((r) => String(r[i]).length),
    );
    return { wch: Math.min(Math.max(maxContent + 2, 10), 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Datos');
  XLSX.writeFile(wb, `${options.filename}.xlsx`);
}
