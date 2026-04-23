import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');
const dumpPath = process.argv[2] || 'c:\\Users\\Usuario\\Downloads\\hoppiness_backup.sql';

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

const content = fs.readFileSync(dumpPath, 'utf-8');
const lines = content.split('\n');

type ColMap = Record<string, string>;

interface TableMapping {
  pgTable: string;
  sqliteTable: string;
  columnMap: ColMap;
}

const TABLE_MAPPINGS: TableMapping[] = [
  {
    pgTable: 'menu_items',
    sqliteTable: 'menu_items',
    columnMap: {
      'id': 'id',
      'name': 'name',
      'short_name': 'sku',
      'description': 'description',
      'image_url': 'image_url',
      'categoria_carta_id': 'category_id',
      'base_price': 'base_price',
      'total_cost': 'cost',
      'fc_objetivo': 'margin_percentage',
      'is_active': 'is_active',
      'sort_order': 'sort_order',
      'kitchen_station_id': 'kitchen_station_id',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'type': 'tags',
      'available_webapp': 'is_combo',
      'promo_price': 'preparation_time_min',
    }
  },
  {
    pgTable: 'recipes',
    sqliteTable: 'recipes',
    columnMap: {
      'id': 'id',
      'name': 'name',
      'description': 'description',
      'calculated_cost': 'total_cost',
      'manual_cost': 'cost_per_unit',
      'is_active': 'is_active',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'categoria_preparacion_id': 'category_id',
      'extra_price': 'yield_quantity',
    }
  },
  {
    pgTable: 'supplies',
    sqliteTable: 'supplies',
    columnMap: {
      'id': 'id',
      'name': 'name',
      'categoria_id': 'category_id',
      'base_unit': 'unit',
      'base_unit_cost': 'cost_per_unit',
      'reference_price': 'min_stock',
      'is_active': 'is_active',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'item_type': 'sku',
    }
  },
  {
    pgTable: 'recipe_ingredients',
    sqliteTable: 'recipe_ingredients',
    columnMap: {
      'id': 'id',
      'preparacion_id': 'recipe_id',
      'insumo_id': 'supply_id',
      'quantity': 'quantity',
      'unit': 'unit',
      'sort_order': 'waste_percentage',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'menu_item_compositions',
    sqliteTable: 'menu_item_compositions',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'preparacion_id': 'recipe_id',
      'insumo_id': 'supply_id',
      'quantity': 'quantity',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'menu_item_extras',
    sqliteTable: 'menu_item_extras',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'preparacion_id': 'extra_name',
      'insumo_id': 'category',
      'sort_order': 'sort_order',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'menu_item_option_groups',
    sqliteTable: 'menu_item_option_groups',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'name': 'name',
      'sort_order': 'sort_order',
      'is_required': 'is_required',
      'max_selecciones': 'max_selections',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    }
  },
  {
    pgTable: 'menu_item_option_group_items',
    sqliteTable: 'menu_item_option_group_items',
    columnMap: {
      'id': 'id',
      'grupo_id': 'group_id',
      'unit_cost': 'price_adjustment',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'menu_item_price_history',
    sqliteTable: 'menu_item_price_history',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'previous_price': 'old_price',
      'new_price': 'new_price',
      'reason': 'change_reason',
      'user_id': 'changed_by',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'supply_cost_history',
    sqliteTable: 'supply_cost_history',
    columnMap: {
      'id': 'id',
      'insumo_id': 'supply_id',
      'previous_cost': 'old_cost',
      'new_cost': 'new_cost',
      'reason': 'change_reason',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'extra_assignments',
    sqliteTable: 'extra_assignments',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'extra_id': 'extra_item_id',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'removable_items',
    sqliteTable: 'removable_items',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'nombre': 'ingredient_name',
      'sort_order': 'sort_order',
      'is_active': 'is_active',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'item_modifiers',
    sqliteTable: 'item_modifiers',
    columnMap: {
      'id': 'id',
      'item_carta_id': 'menu_item_id',
      'type': 'type',
      'name': 'name',
      'is_active': 'is_active',
      'sort_order': 'sort_order',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    }
  },
  {
    pgTable: 'branch_item_availability',
    sqliteTable: 'branch_item_availability',
    columnMap: {
      'id': 'id',
      'branch_id': 'branch_id',
      'item_carta_id': 'item_carta_id',
      'available': 'available',
      'available_webapp': 'available_webapp',
      'available_salon': 'available_salon',
      'out_of_stock': 'out_of_stock',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    }
  },
  {
    pgTable: 'expenses',
    sqliteTable: 'expenses',
    columnMap: {
      'id': 'id',
      'branch_id': 'branch_id',
      'concept': 'concept',
      'amount': 'amount',
      'payment_method': 'payment_method',
      'main_category': 'expense_category',
      'affects_register': 'affects_register',
      'notes': 'notes',
      'attachments': 'attachments',
      'rdo_category_code': 'rdo_category_code',
      'date': 'expense_date',
      'created_by': 'created_by',
      'status': 'approval_status',
      'deleted_at': 'deleted_at',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'suppliers',
    sqliteTable: 'suppliers',
    columnMap: {
      'id': 'id',
      'business_name': 'name',
      'cuit': 'cuit',
      'phone': 'phone',
      'email': 'email',
      'address': 'address',
      'supplier_type': 'category',
      'notes': 'notes',
      'is_active': 'is_active',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    }
  },
  {
    pgTable: 'supplier_invoices',
    sqliteTable: 'supplier_invoices',
    columnMap: {
      'id': 'id',
      'proveedor_id': 'supplier_id',
      'branch_id': 'branch_id',
      'invoice_number': 'invoice_number',
      'invoice_date': 'invoice_date',
      'due_date': 'due_date',
      'subtotal': 'subtotal',
      'iva': 'tax_amount',
      'total': 'total_amount',
      'payment_status': 'status',
      'notes': 'notes',
      'period': 'period',
      'created_by': 'created_by',
      'deleted_at': 'deleted_at',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    }
  },
  {
    pgTable: 'supplier_payments',
    sqliteTable: 'supplier_payments',
    columnMap: {
      'id': 'id',
      'proveedor_id': 'supplier_id',
      'branch_id': 'branch_id',
      'amount': 'amount',
      'payment_date': 'payment_date',
      'payment_method': 'payment_method',
      'reference': 'reference',
      'notes': 'notes',
      'invoice_id': 'invoice_id',
      'created_by': 'created_by',
      'deleted_at': 'deleted_at',
      'created_at': 'created_at',
    }
  },
  {
    pgTable: 'supplier_branch_terms',
    sqliteTable: 'supplier_branch_terms',
    columnMap: {
      'id': 'id',
      'proveedor_id': 'supplier_id',
      'branch_id': 'branch_id',
      'notes': 'notes',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    }
  },
  {
    pgTable: 'stock_movements',
    sqliteTable: 'stock_movements',
    columnMap: {
      'id': 'id',
      'branch_id': 'branch_id',
      'insumo_id': 'supply_id',
      'type': 'movement_type',
      'quantity': 'quantity',
      'reason': 'notes',
      'created_by': 'created_by',
      'created_at': 'created_at',
    }
  },
];

function sanitizeValue(val: string): any {
  if (val === '\\N') return null;
  if (val === 't') return 1;
  if (val === 'f') return 0;
  return val.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
}

function getTableColumns(tableName: string): Set<string> {
  try {
    return new Set(db.prepare(`PRAGMA table_info("${tableName}")`).all().map((c: any) => c.name));
  } catch { return new Set(); }
}

console.log('Re-importing tables with correct column mappings...\n');

db.exec('BEGIN TRANSACTION');

let totalReimported = 0;

for (const mapping of TABLE_MAPPINGS) {
  const copyLine = lines.findIndex(l =>
    l.startsWith(`COPY "public"."${mapping.pgTable}"`)
  );

  if (copyLine === -1) {
    console.log(`  ✗ ${mapping.pgTable}: not found in dump`);
    continue;
  }

  const colMatch = lines[copyLine].match(/COPY "public"\."[^"]+"\s*\(([^)]+)\)/);
  if (!colMatch) continue;

  const pgColumns = colMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
  const sqliteCols = getTableColumns(mapping.sqliteTable);

  const validPgIndices: number[] = [];
  const targetCols: string[] = [];

  for (let j = 0; j < pgColumns.length; j++) {
    const pgCol = pgColumns[j];
    const mappedCol = mapping.columnMap[pgCol];
    if (mappedCol && sqliteCols.has(mappedCol)) {
      validPgIndices.push(j);
      targetCols.push(mappedCol);
    } else if (!mappedCol && sqliteCols.has(pgCol)) {
      validPgIndices.push(j);
      targetCols.push(pgCol);
    }
  }

  if (targetCols.length === 0) {
    console.log(`  ✗ ${mapping.pgTable} → ${mapping.sqliteTable}: no matching columns`);
    continue;
  }

  db.exec(`DELETE FROM "${mapping.sqliteTable}"`);

  const placeholders = targetCols.map(() => '?').join(', ');
  const colNames = targetCols.map(c => `"${c}"`).join(', ');
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO "${mapping.sqliteTable}" (${colNames}) VALUES (${placeholders})`
  );

  let rowCount = 0;
  for (let i = copyLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '\\.' || line === '\\.') break;
    if (line.length === 0 || line.startsWith('--')) continue;

    const rawValues = line.split('\t');
    const values = validPgIndices.map(idx =>
      idx < rawValues.length ? sanitizeValue(rawValues[idx]) : null
    );

    try {
      stmt.run(...values);
      rowCount++;
    } catch (err: any) {
      if (rowCount === 0) {
        console.log(`    Error: ${err.message}`);
        console.log(`    Cols: ${targetCols.join(', ')}`);
        console.log(`    Vals: ${values.slice(0, 5).join(', ')}...`);
      }
    }
  }

  if (rowCount > 0) {
    console.log(`  ✓ ${mapping.pgTable} → ${mapping.sqliteTable}: ${rowCount} rows (${targetCols.length} cols)`);
    totalReimported += rowCount;
  }
}

db.exec('COMMIT');

console.log(`\n========================================`);
console.log(`Re-import complete: ${totalReimported} rows updated`);
console.log(`========================================`);

const sampleItem = db.prepare("SELECT name, cost, base_price, category_id FROM menu_items WHERE cost IS NOT NULL LIMIT 3").all();
console.log('\nSample menu_items with cost:', JSON.stringify(sampleItem, null, 2));

const sampleRecipe = db.prepare("SELECT name, total_cost, cost_per_unit FROM recipes WHERE total_cost IS NOT NULL LIMIT 3").all();
console.log('Sample recipes with cost:', JSON.stringify(sampleRecipe, null, 2));

const sampleSupply = db.prepare("SELECT name, cost_per_unit, unit FROM supplies WHERE cost_per_unit IS NOT NULL LIMIT 3").all();
console.log('Sample supplies with cost:', JSON.stringify(sampleSupply, null, 2));

db.close();
