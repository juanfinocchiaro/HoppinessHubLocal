/**
 * Generates Drizzle ORM schema.ts from the PG dump's COPY statements.
 * Uses the EXACT PG column names.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dumpPath = process.argv[2] || 'c:\\Users\\Usuario\\Downloads\\hoppiness_backup.sql';
const outputPath = path.resolve(__dirname, 'schema.ts');

const content = fs.readFileSync(dumpPath, 'utf-8');
const lines = content.split('\n');

interface TableDef {
  name: string;
  columns: string[];
}

const tables: TableDef[] = [];

for (const line of lines) {
  const m = line.match(/^COPY "public"\."([^"]+)"\s*\(([^)]+)\)\s*FROM stdin;/);
  if (!m) continue;
  tables.push({
    name: m[1],
    columns: m[2].split(',').map(c => c.trim().replace(/"/g, '')),
  });
}

function isInteger(col: string): boolean {
  return col === 'sort_order' || col === 'display_order' || col === 'order_number' ||
    col === 'caller_number' || col === 'pager_number' || col === 'table_count' ||
    col === 'pager_total' || col === 'ticket_copies' || col === 'copies' ||
    col === 'paper_width' || col === 'port' || col === 'level' ||
    col === 'day_of_week' || col === 'shift_number' || col === 'schedule_month' ||
    col === 'schedule_year' || col === 'coaching_month' || col === 'coaching_year' ||
    col === 'max_uses' || col === 'current_uses' || col === 'orders_today' ||
    col === 'prep_time_minutes' || col === 'estimated_time_min' ||
    col === 'retries' || col === 'point_of_sale' || col === 'z_number' ||
    col === 'receipt_number' || col === 'invoice_number' ||
    col === 'max_selections' || col === 'max_selecciones' || col === 'min_selections' ||
    col === 'hierarchy_level' || col === 'round_to_minutes' ||
    col === 'break_deduct_minutes' || col === 'tolerance_minutes' ||
    col === 'monthly_hours_limit' || col === 'daily_hours_limit' ||
    col === 'vida_util_meses' || col === 'total_installments' || col === 'installments_paid' ||
    col === 'reminder_count' || col.startsWith('clock_window_');
}

function isBoolean(col: string): boolean {
  return col.startsWith('is_') || col.startsWith('has_') || col.startsWith('can_') ||
    col.startsWith('requires_') || col.startsWith('enforce_') ||
    col === 'enabled' || col === 'available' || col === 'out_of_stock' ||
    col === 'anulada' || col === 'procesado' ||
    col === 'affects_register' || col === 'affects_base_cost' ||
    col.startsWith('available_') || col.startsWith('auto_') ||
    col.startsWith('show_') || col.startsWith('allow_') ||
    col === 'tracks_stock' || col === 'kds_enabled' || col === 'single_use_per_user' ||
    col === 'onboarding_completed' || col === 'early_leave_authorized' ||
    col.startsWith('receipt_show_') || col === 'webapp_enabled' ||
    col === 'webapp_auto_accept' || col === 'delivery_enabled' ||
    col === 'takeaway_enabled' || col === 'salon_enabled' ||
    col === 'attended' || col === 'was_present' ||
    col === 'uniform_ok' || col === 'station_clean' || col === 'complies' ||
    col === 'deleted';
}

function isReal(col: string): boolean {
  return col === 'amount' || col === 'total' || col === 'subtotal' ||
    col === 'price' || col === 'cost' || col === 'discount' ||
    col === 'base_price' || col === 'unit_price' || col === 'delivery_cost' ||
    col === 'total_cost' || col === 'manual_cost' || col === 'calculated_cost' ||
    col === 'extra_price' || col === 'sale_price' || col === 'reference_price' ||
    col.endsWith('_price') || col.endsWith('_cost') || col.endsWith('_amount') ||
    col.endsWith('_rate') || col.endsWith('_km') || col.endsWith('_pct') ||
    col.endsWith('_percentage') ||
    col === 'latitude' || col === 'longitude' ||
    col.startsWith('centroid_') || col.startsWith('delivery_lat') ||
    col.startsWith('delivery_lng') || col === 'distance_km' ||
    col === 'quantity' || col === 'score' || col === 'score_total' ||
    col === 'general_score' || col === 'station_score' || col === 'overall_score' ||
    col === 'max_score' || col.startsWith('fc_') || col === 'propina' ||
    col === 'descuento' || col === 'opening_amount' || col === 'closing_amount' ||
    col === 'expected_amount' || col === 'difference' || col === 'discrepancy' ||
    col === 'actual_amount' || col === 'pending_balance' || col === 'cumulative_balance' ||
    col === 'hourly_rate' || col === 'monthly_hours_target' || col === 'registered_hours' ||
    col === 'ownership_percentage' || col === 'investment_amount' ||
    col === 'total_profit' || col === 'neto' || col === 'iva' ||
    col === 'exempt' || col === 'non_taxable' ||
    col.startsWith('taxable_') || col.startsWith('vat_') ||
    col.startsWith('imp_') || col.startsWith('perc_') ||
    col === 'subtotal_bruto' || col === 'total_descuentos' || col === 'subtotal_neto' ||
    col === 'invoice_total' || col === 'actual_cost' ||
    col === 'margen_bruto' || col === 'margen_porcentaje' ||
    col === 'weight' || col === 'average_cost';
}

function drizzleType(col: string, isPk: boolean): string {
  if (isPk) return "text('" + col + "').primaryKey()";
  if (isBoolean(col)) return "integer('" + col + "', { mode: 'boolean' })";
  if (isInteger(col)) return "integer('" + col + "')";
  if (isReal(col)) return "real('" + col + "')";
  return "text('" + col + "')";
}

let out = `import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';\n\n`;

out += `// ============================================================================\n`;
out += `// AUTH (local only)\n`;
out += `// ============================================================================\n\n`;
out += `export const users = sqliteTable('users', {\n`;
out += `  id: text('id').primaryKey(),\n`;
out += `  email: text('email').notNull(),\n`;
out += `  password_hash: text('password_hash'),\n`;
out += `  email_confirmed_at: text('email_confirmed_at'),\n`;
out += `  last_sign_in_at: text('last_sign_in_at'),\n`;
out += `  created_at: text('created_at'),\n`;
out += `  updated_at: text('updated_at'),\n`;
out += `}, (table) => [\n`;
out += `  uniqueIndex('users_email_idx').on(table.email),\n`;
out += `]);\n\n`;

out += `// ============================================================================\n`;
out += `// PG TABLES (exact column names from PostgreSQL dump)\n`;
out += `// ============================================================================\n\n`;

for (const table of tables) {
  const hasPk = table.columns[0] === 'id' || table.name === 'employee_time_state';
  const pkCol = table.name === 'employee_time_state' ? 'employee_id' : 'id';

  out += `export const ${table.name} = sqliteTable('${table.name}', {\n`;
  for (const col of table.columns) {
    const isPk = col === pkCol && hasPk;
    out += `  ${col}: ${drizzleType(col, isPk)},\n`;
  }
  out += `});\n\n`;
}

fs.writeFileSync(outputPath, out);
console.log(`Generated Drizzle schema: ${outputPath}`);
console.log(`Tables: ${tables.length + 1} (${tables.length} PG + users)`);
