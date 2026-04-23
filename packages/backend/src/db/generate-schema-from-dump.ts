/**
 * Parses the PostgreSQL dump and generates a SQLite-compatible setup script.
 * Uses the EXACT same table names and column names from PG.
 * Only converts types: uuid->TEXT, boolean->INTEGER, jsonb->TEXT, numeric->REAL, etc.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dumpPath = process.argv[2] || 'c:\\Users\\Usuario\\Downloads\\hoppiness_backup.sql';
const outputPath = path.resolve(__dirname, 'setup-from-pg.ts');

const content = fs.readFileSync(dumpPath, 'utf-8');
const lines = content.split('\n');

interface TableDef {
  name: string;
  columns: string[];
}

const tables: TableDef[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^COPY "public"\."([^"]+)"\s*\(([^)]+)\)\s*FROM stdin;/);
  if (!match) continue;

  const tableName = match[1];
  const columns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));

  tables.push({ name: tableName, columns });
}

console.log(`Found ${tables.length} tables in PG dump`);

function inferType(colName: string): string {
  if (colName === 'id') return 'TEXT PRIMARY KEY';
  if (colName.endsWith('_id') || colName === 'employee_id') return 'TEXT';

  if (colName === 'is_active' || colName === 'is_open' || colName === 'is_manual' ||
      colName === 'is_published' || colName === 'is_combo' || colName === 'is_removable' ||
      colName === 'is_default' || colName === 'is_required' || colName === 'is_recurring' ||
      colName === 'is_verified' || colName === 'is_locked' || colName === 'is_primary' ||
      colName === 'is_day_off' || colName === 'is_system' || colName === 'is_production' ||
      colName === 'is_interchangeable' || colName === 'is_webapp' || colName === 'is_gift' ||
      colName.startsWith('is_') || colName.startsWith('has_') || colName.startsWith('can_') ||
      colName.startsWith('requires_') || colName.startsWith('enforce_') ||
      colName === 'enabled' || colName === 'available' || colName === 'out_of_stock' ||
      colName === 'deleted' || colName === 'anulada' || colName === 'procesado' ||
      colName === 'affects_register' || colName === 'affects_base_cost' ||
      colName.startsWith('available_') || colName.startsWith('auto_') ||
      colName.startsWith('show_') || colName.startsWith('allow_') ||
      colName.startsWith('require_') || colName.startsWith('pager_enabled') ||
      colName.startsWith('table_mode_') || colName.startsWith('stock_') ||
      colName.startsWith('cash_register_') || colName === 'tracks_stock' ||
      colName === 'kds_enabled' || colName === 'single_use_per_user' ||
      colName === 'onboarding_completed' || colName === 'early_leave_authorized' ||
      colName.startsWith('receipt_show_') || colName === 'webapp_enabled' ||
      colName === 'webapp_auto_accept' || colName === 'shift_morning_enabled' ||
      colName === 'shift_overnight_enabled' || colName === 'delivery_enabled' ||
      colName === 'takeaway_enabled' || colName === 'salon_enabled' ||
      colName.startsWith('permits_') || colName === 'attended' || colName === 'was_present' ||
      colName === 'uniform_ok' || colName === 'station_clean' || colName === 'complies')
    return 'INTEGER';

  if (colName === 'amount' || colName === 'total' || colName === 'subtotal' ||
      colName === 'price' || colName === 'cost' || colName === 'discount' ||
      colName === 'base_price' || colName === 'unit_price' || colName === 'delivery_cost' ||
      colName === 'total_cost' || colName === 'manual_cost' || colName === 'calculated_cost' ||
      colName === 'extra_price' || colName === 'sale_price' || colName === 'reference_price' ||
      colName.endsWith('_price') || colName.endsWith('_cost') || colName.endsWith('_amount') ||
      colName.endsWith('_rate') || colName.endsWith('_km') || colName.endsWith('_pct') ||
      colName.endsWith('_percentage') || colName.endsWith('_surcharge_pct') ||
      colName === 'latitude' || colName === 'longitude' ||
      colName.startsWith('centroid_') || colName.startsWith('delivery_lat') ||
      colName.startsWith('delivery_lng') || colName === 'distance_km' ||
      colName === 'quantity' || colName === 'peso' || colName === 'weight' ||
      colName === 'score' || colName === 'score_total' || colName === 'general_score' ||
      colName === 'station_score' || colName === 'overall_score' || colName === 'max_score' ||
      colName.startsWith('fc_') || colName === 'propina' || colName === 'descuento' ||
      colName === 'opening_amount' || colName === 'closing_amount' || colName === 'expected_amount' ||
      colName === 'difference' || colName === 'discrepancy' || colName === 'actual_amount' ||
      colName === 'pending_balance' || colName === 'cumulative_balance' ||
      colName === 'hourly_rate' || colName === 'monthly_hours_target' || colName === 'registered_hours' ||
      colName === 'ownership_percentage' || colName === 'investment_amount' ||
      colName === 'total_profit' || colName === 'neto' || colName === 'iva' ||
      colName.startsWith('total_') && (colName.includes('amount') || colName.includes('sales') ||
      colName.includes('invoices') || colName.includes('tickets') || colName.includes('credit')) ||
      colName.startsWith('payment_') && colName !== 'payment_method' && colName !== 'payment_terms' &&
      colName !== 'payment_status' && colName !== 'payment_date' && colName !== 'payment_reference' &&
      colName !== 'payment_due_date' && colName !== 'payment_type' ||
      colName.startsWith('taxable_') || colName.startsWith('vat_') ||
      colName === 'exempt' || colName === 'other_taxes' || colName === 'net_total' ||
      colName.startsWith('imp_') || colName.startsWith('perc_') ||
      colName === 'subtotal_bruto' || colName === 'total_descuentos' || colName === 'subtotal_neto' ||
      colName === 'invoice_total' || colName === 'actual_cost' || colName === 'non_taxable' ||
      colName === 'other_taxes' || colName === 'subtotal_net' || colName === 'total_vat' ||
      colName === 'margen_bruto' || colName === 'margen_porcentaje')
    return 'REAL';

  if (colName === 'sort_order' || colName === 'display_order' || colName === 'order_number' ||
      colName === 'caller_number' || colName === 'pager_number' || colName === 'table_count' ||
      colName === 'pager_total' || colName === 'ticket_copies' || colName === 'copies' ||
      colName === 'paper_width' || colName === 'port' || colName === 'level' ||
      colName === 'day_of_week' || colName === 'shift_number' || colName === 'schedule_month' ||
      colName === 'schedule_year' || colName === 'coaching_month' || colName === 'coaching_year' ||
      colName === 'max_uses' || colName === 'current_uses' || colName === 'orders_today' ||
      colName === 'prep_time_minutes' || colName === 'estimated_time_min' ||
      colName === 'retries' || colName === 'point_of_sale' || colName === 'z_number' ||
      colName === 'receipt_number' || colName === 'invoice_number' ||
      colName === 'max_selections' || colName === 'max_selecciones' || colName === 'min_selections' ||
      colName === 'hierarchy_level' || colName === 'round_to_minutes' ||
      colName === 'break_deduct_minutes' || colName === 'tolerance_minutes' ||
      colName === 'monthly_hours_limit' || colName === 'daily_hours_limit' ||
      colName === 'vida_util_meses' || colName === 'total_installments' || colName === 'installments_paid' ||
      colName === 'reminder_count' || colName.startsWith('clock_window_'))
    return 'INTEGER';

  return 'TEXT';
}

let output = `import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

console.log('Creating database tables from PG schema...');

sqlite.exec(\`
-- Users table (local auth, not in PG dump)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT,
  email_confirmed_at TEXT,
  last_sign_in_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

`;

for (const table of tables) {
  const colDefs = table.columns.map(col => {
    const type = inferType(col);
    return `  ${col} ${type}`;
  }).join(',\n');

  output += `CREATE TABLE IF NOT EXISTS ${table.name} (\n${colDefs}\n);\n\n`;
}

output += `\`);

console.log('All ${tables.length} tables + users created successfully!');
sqlite.close();
`;

fs.writeFileSync(outputPath, output);
console.log(`Generated setup script: ${outputPath}`);
console.log(`Tables: ${tables.length} + users = ${tables.length + 1}`);
