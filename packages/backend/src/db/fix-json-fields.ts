import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/hoppiness.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Fixing JSON fields that contain non-JSON values...');

const jsonTextColumns = [
  { table: 'menu_items', col: 'tags', defaultVal: '[]' },
  { table: 'menu_items', col: 'allergens', defaultVal: '[]' },
  { table: 'menu_items', col: 'combo_items', defaultVal: null },
  { table: 'orders', col: 'extras', defaultVal: '[]' },
  { table: 'order_items', col: 'extras', defaultVal: '[]' },
  { table: 'order_items', col: 'removals', defaultVal: '[]' },
  { table: 'communications', col: 'target_branch_ids', defaultVal: '[]' },
  { table: 'communications', col: 'target_roles', defaultVal: '[]' },
  { table: 'promotions', col: 'branch_ids', defaultVal: '[]' },
  { table: 'promotions', col: 'target_item_ids', defaultVal: '[]' },
  { table: 'promotions', col: 'channels', defaultVal: '[]' },
  { table: 'discount_codes', col: 'branch_ids', defaultVal: '[]' },
  { table: 'regulations', col: 'target_branch_ids', defaultVal: '[]' },
  { table: 'special_days', col: 'applies_to_branches', defaultVal: '[]' },
  { table: 'delivery_zones', col: 'barrios', defaultVal: '[]' },
  { table: 'webapp_config', col: 'payment_methods', defaultVal: '[]' },
  { table: 'item_modifiers', col: 'options', defaultVal: '[]' },
  { table: 'order_item_modifiers', col: 'selected_options', defaultVal: '[]' },
  { table: 'branches', col: 'public_hours', defaultVal: null },
  { table: 'branches', col: 'admin_force_channels', defaultVal: null },
  { table: 'afip_config', col: 'invoicing_rules', defaultVal: '{}' },
];

let totalFixed = 0;

for (const { table, col, defaultVal } of jsonTextColumns) {
  try {
    const rows: any[] = db.prepare(
      `SELECT rowid, "${col}" FROM "${table}" WHERE "${col}" IS NOT NULL`
    ).all();

    let fixed = 0;
    const update = db.prepare(`UPDATE "${table}" SET "${col}" = ? WHERE rowid = ?`);

    for (const row of rows) {
      const val = row[col];
      if (typeof val !== 'string') continue;

      const trimmed = val.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed === 'null') continue;

      try {
        JSON.parse(trimmed);
        continue;
      } catch {
        if (trimmed === 't' || trimmed === 'f' || trimmed === '') {
          update.run(defaultVal, row.rowid);
        } else {
          update.run(JSON.stringify(trimmed), row.rowid);
        }
        fixed++;
      }
    }

    const nulls = db.prepare(
      `UPDATE "${table}" SET "${col}" = ? WHERE "${col}" IS NULL`
    ).run(defaultVal);

    if (fixed > 0) {
      console.log(`  ${table}.${col}: fixed ${fixed} non-JSON values`);
      totalFixed += fixed;
    }
  } catch (err: any) {
    // Table or column might not exist, skip
  }
}

db.prepare("UPDATE menu_items SET is_combo = 0 WHERE is_combo IS NULL").run();
db.prepare("UPDATE menu_items SET preparation_time_min = NULL").run();

console.log(`\nTotal fixed: ${totalFixed} values`);
console.log('Done!');
db.close();
