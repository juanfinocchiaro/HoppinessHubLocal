import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');
const dumpPath = process.argv[2] || 'c:\\Users\\Usuario\\Downloads\\hoppiness_backup.sql';

if (!fs.existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

const sqliteTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name)
);

console.log(`SQLite has ${sqliteTables.size} tables`);
console.log(`Reading PG dump from: ${dumpPath}`);

const content = fs.readFileSync(dumpPath, 'utf-8');
const lines = content.split('\n');

let currentTable: string | null = null;
let currentColumns: string[] = [];
let rowCount = 0;
let totalRows = 0;
let tablesImported = 0;
let tablesSkipped: string[] = [];
let insertStmt: Database.Statement | null = null;

function sanitizeValue(val: string): any {
  if (val === '\\N') return null;
  if (val === 't') return 1;
  if (val === 'f') return 0;
  return val
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function pgTableToSqlite(pgName: string): string | null {
  if (sqliteTables.has(pgName)) return pgName;

  const mappings: Record<string, string> = {
    'pedidos': 'orders',
    'pedido_pagos': 'order_payments',
    'items_carta': 'menu_items',
    'preparaciones': 'recipes',
    'insumos': 'supplies',
    'categorias_carta': 'menu_categories',
    'categorias_preparacion': 'recipe_categories',
    'categorias_insumo': 'supply_categories',
    'promociones': 'promotions',
    'codigos_descuento': 'discount_codes',
    'codigos_descuento_usos': 'discount_code_uses',
    'facturas_emitidas': 'issued_invoices',
    'facturas_proveedores': 'supplier_invoices',
    'pagos_proveedores': 'supplier_payments',
    'proveedores': 'suppliers',
    'condiciones_proveedor_sucursal': 'supplier_branch_terms',
    'cadetes': 'delivery_drivers',
    'zonas_delivery': 'delivery_zones',
    'reglamentos': 'regulations',
    'firmas_reglamento': 'regulation_signatures',
    'apercibimientos': 'warnings',
    'socios': 'partners',
    'movimientos_socio': 'partner_movements',
    'distribuciones_utilidades': 'profit_distributions',
    'periodos': 'periods',
    'inversiones': 'investments',
    'gastos': 'expenses',
    'ventas_mensuales_local': 'branch_monthly_sales',
    'canon_liquidaciones': 'canon_settlements',
    'pagos_canon': 'canon_payments',
    'turnos_caja': 'cash_register_shifts',
    'cajas': 'cash_registers',
    'movimientos_caja': 'cash_register_movements',
    'items_pedido': 'order_items',
    'modificadores_item_pedido': 'order_item_modifiers',
    'ediciones_pago_pedido': 'order_payment_edits',
    'mensajes_pedido': 'webapp_order_messages',
    'dias_especiales': 'special_days',
    'solicitudes_horario': 'schedule_requests',
    'adelantos_sueldo': 'salary_advances',
    'invitaciones_staff': 'staff_invitations',
    'puestos_trabajo': 'work_positions',
    'estaciones_trabajo': 'work_stations',
    'competencias_generales': 'general_competencies',
    'competencias_encargado': 'manager_competencies',
    'competencias_estacion': 'station_competencies',
    'llamadores': 'pagers',
    'plantillas_whatsapp': 'whatsapp_templates',
    'config_mercadopago': 'mercadopago_config',
    'config_pos': 'pos_config',
    'config_webapp': 'webapp_config',
    'config_impresion': 'print_config',
    'trabajos_impresion': 'print_jobs',
    'config_fiscal': 'tax_config',
    'conceptos_servicio': 'service_concepts',
    'categorias_rdo': 'rdo_categories',
    'movimientos_rdo': 'rdo_movements',
    'listas_precio': 'price_lists',
    'items_lista_precio': 'price_list_items',
    'canales_venta': 'sales_channels',
    'disponibilidad_item_sucursal': 'branch_item_availability',
    'extras_item_carta': 'menu_item_extras',
    'grupos_opcionales': 'menu_item_option_groups',
    'items_grupo_opcional': 'menu_item_option_group_items',
    'composiciones_item': 'menu_item_compositions',
    'historial_precios': 'menu_item_price_history',
    'asignaciones_extra': 'extra_assignments',
    'removibles': 'removable_items',
    'opciones_receta': 'recipe_options',
    'ingredientes_receta': 'recipe_ingredients',
    'historial_costo_insumo': 'supply_cost_history',
    'stock_actual': 'stock_actual',
    'conteos_stock': 'stock_conteos',
    'items_conteo': 'stock_conteo_items',
    'movimientos_stock': 'stock_movements',
    'cierre_mensual_stock': 'stock_cierre_mensual',
    'certificaciones_empleado': 'employee_certifications',
    'consumos_empleado': 'employee_consumptions',
    'consumos_manuales': 'manual_consumptions',
    'datos_empleado': 'employee_data',
    'horarios_empleado': 'employee_schedules',
    'estado_tiempo_empleado': 'employee_time_state',
    'cierres_z': 'fiscal_z_closings',
    'items_factura': 'invoice_items',
    'vinculos_pago_factura': 'invoice_payment_links',
    'items_inspeccion': 'inspection_items',
    'personal_inspeccion': 'inspection_staff_present',
    'plantillas_inspeccion': 'inspection_templates',
    'participantes_reunion': 'meeting_participants',
    'acuerdos_reunion': 'meeting_agreements',
    'asignados_acuerdo': 'meeting_agreement_assignees',
    'reuniones': 'meetings',
    'suscripciones_push': 'push_subscriptions',
    'mensajes_contacto': 'contact_messages',
    'direcciones_cliente': 'customer_addresses',
    'modificadores_item': 'item_modifiers',
    'estaciones_cocina': 'kitchen_stations',
    'config_laboral': 'labor_config',
    'sesiones_operador': 'operator_session_logs',
    'discrepancias_cajero': 'cashier_discrepancy_history',
    'barrios_ciudad': 'city_neighborhoods',
    'config_delivery_pricing': 'delivery_pricing_config',
    'log_override_radio': 'delivery_radius_overrides_log',
    'config_delivery_sucursal': 'branch_delivery_config',
    'barrios_delivery_sucursal': 'branch_delivery_neighborhoods',
    'config_cierre_sucursal': 'branch_closure_config',
    'config_cierre_marca': 'brand_closure_config',
    'orden_sidebar_marca': 'brand_sidebar_order',
    'turnos_sucursal': 'branch_shifts',
    'impresoras_sucursal': 'branch_printers',
    'inspecciones_sucursal': 'branch_inspections',
    'log_auditoria': 'audit_logs',
    'log_auditoria_financiera': 'financial_audit_log',
  };

  return mappings[pgName] || null;
}

function pgColumnToSqlite(pgCol: string, table: string): string {
  const mappings: Record<string, string> = {
    'item_carta_id': 'menu_item_id',
    'preparacion_id': 'recipe_id',
    'insumo_id': 'supply_id',
    'ingrediente_id': 'supply_id',
  };
  return mappings[pgCol] || pgCol;
}

function getTableColumns(tableName: string): Set<string> {
  try {
    const info = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    return new Set(info.map((col: any) => col.name));
  } catch {
    return new Set();
  }
}

function flushTable() {
  if (currentTable && rowCount > 0) {
    console.log(`  ✓ ${currentTable}: ${rowCount} rows`);
    totalRows += rowCount;
    tablesImported++;
  }
  currentTable = null;
  currentColumns = [];
  rowCount = 0;
  insertStmt = null;
}

db.exec('BEGIN TRANSACTION');

try {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('COPY "public".')) {
      flushTable();

      const match = line.match(/COPY "public"\."([^"]+)"\s*\(([^)]+)\)\s*FROM stdin;/);
      if (!match) continue;

      const pgTable = match[1];
      const pgColumns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));

      let sqliteTable = pgTable;
      if (!sqliteTables.has(pgTable)) {
        const mapped = pgTableToSqlite(pgTable);
        if (mapped && sqliteTables.has(mapped)) {
          sqliteTable = mapped;
        } else {
          if (!sqliteTables.has(pgTable)) {
            tablesSkipped.push(pgTable);
            currentTable = null;
            continue;
          }
        }
      }

      const existingCols = getTableColumns(sqliteTable);
      const validIndices: number[] = [];
      const validColumns: string[] = [];

      for (let j = 0; j < pgColumns.length; j++) {
        const mapped = pgColumnToSqlite(pgColumns[j], sqliteTable);
        if (existingCols.has(mapped)) {
          validIndices.push(j);
          validColumns.push(mapped);
        } else if (existingCols.has(pgColumns[j])) {
          validIndices.push(j);
          validColumns.push(pgColumns[j]);
        }
      }

      if (validColumns.length === 0) {
        tablesSkipped.push(`${pgTable} (no matching columns)`);
        continue;
      }

      currentTable = sqliteTable;
      currentColumns = validColumns;

      const placeholders = validColumns.map(() => '?').join(', ');
      const colNames = validColumns.map(c => `"${c}"`).join(', ');

      try {
        db.exec(`DELETE FROM "${sqliteTable}"`);
        insertStmt = db.prepare(
          `INSERT OR REPLACE INTO "${sqliteTable}" (${colNames}) VALUES (${placeholders})`
        );
      } catch (err: any) {
        console.error(`  ✗ ${sqliteTable}: ${err.message}`);
        currentTable = null;
        insertStmt = null;
      }

      continue;
    }

    if (line === '\\.' || line === '\\.') {
      flushTable();
      continue;
    }

    if (currentTable && insertStmt && line.length > 0 && !line.startsWith('--') && !line.startsWith('SET ') && !line.startsWith('SELECT ') && !line.startsWith('ALTER ') && !line.startsWith('CREATE ') && !line.startsWith('DROP ') && !line.startsWith('GRANT ') && !line.startsWith('REVOKE ')) {
      const rawValues = line.split('\t');
      
      const pgColumns_orig = lines.find(l => l.startsWith(`COPY "public"."${currentTable}"`) || l.includes(`"${currentTable}"`));
      
      const match = lines.slice(Math.max(0, i - 1000), i).reverse().find(l => l.startsWith('COPY "public".'));
      if (!match) continue;

      const colMatch = match.match(/COPY "public"\."[^"]+"\s*\(([^)]+)\)/);
      if (!colMatch) continue;
      const allPgCols = colMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));

      if (rawValues.length < allPgCols.length) continue;

      const existingCols = getTableColumns(currentTable);
      const values: any[] = [];
      let valid = true;

      for (const col of currentColumns) {
        const pgIdx = allPgCols.findIndex(c => {
          const mapped = pgColumnToSqlite(c, currentTable!);
          return mapped === col || c === col;
        });

        if (pgIdx >= 0 && pgIdx < rawValues.length) {
          values.push(sanitizeValue(rawValues[pgIdx]));
        } else {
          values.push(null);
        }
      }

      if (values.length === currentColumns.length) {
        try {
          insertStmt.run(...values);
          rowCount++;
        } catch (err: any) {
          if (rowCount === 0) {
            console.error(`  ✗ ${currentTable} row error: ${err.message}`);
          }
        }
      }
    }
  }

  flushTable();
  db.exec('COMMIT');

  console.log('\n========================================');
  console.log(`Import complete!`);
  console.log(`  Tables imported: ${tablesImported}`);
  console.log(`  Total rows: ${totalRows}`);
  if (tablesSkipped.length > 0) {
    console.log(`  Tables skipped (${tablesSkipped.length}): ${tablesSkipped.join(', ')}`);
  }
  console.log('========================================');

} catch (err) {
  db.exec('ROLLBACK');
  console.error('Import failed:', err);
  process.exit(1);
}

db.close();
