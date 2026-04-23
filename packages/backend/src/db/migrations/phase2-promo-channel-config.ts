/**
 * Fase 2 — Productos/Canales/Promos
 *
 * - Extiende `promotions` con columnas `funded_by`, `display_format`,
 *   `show_in_webapp_section`.
 * - Crea tabla `promotion_channel_config` (1 fila por promo × canal).
 * - Backfill: por cada fila de `promotions` con `canales` no vacío, inserta
 *   una fila por canal en `promotion_channel_config` si no existe ya.
 *
 * Idempotente: se puede correr múltiples veces sin efectos secundarios.
 * Mantiene `promotions.canales` como shadow para rollback rápido.
 *
 * Ejecutar con: `npm run db:migrate:phase2 -w @hoppiness/backend`
 */

import { sqlite } from '../connection.js';

function columnExists(table: string, column: string): boolean {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  if (columnExists(table, column)) {
    console.log(`  [skip] ${table}.${column} already exists`);
    return;
  }
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  [ok]   added ${table}.${column}`);
}

function parseCanales(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  // Soporta JSON array y CSV
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch {
      /* falls through to CSV */
    }
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  console.log('Phase 2 migration: promotion_channel_config');

  console.log('[1/3] Extending promotions table...');
  addColumnIfMissing('promotions', 'funded_by', 'TEXT');
  addColumnIfMissing('promotions', 'display_format', 'TEXT');
  addColumnIfMissing('promotions', 'show_in_webapp_section', 'INTEGER');

  console.log('[2/3] Creating promotion_channel_config table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS promotion_channel_config (
      id TEXT PRIMARY KEY,
      promotion_id TEXT NOT NULL,
      channel_code TEXT NOT NULL,
      is_active_in_channel INTEGER NOT NULL DEFAULT 1,
      custom_discount_value REAL,
      custom_final_price REAL,
      funded_by TEXT,
      display_format TEXT,
      banner_image_url TEXT,
      promo_text TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);
  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_channel_config_unique
      ON promotion_channel_config (promotion_id, channel_code)
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_promotion_channel_config_channel
      ON promotion_channel_config (channel_code)
  `);
  console.log('  [ok]   table + indexes ready');

  console.log('[3/3] Backfilling from promotions.canales...');
  const promos = sqlite
    .prepare(`SELECT id, canales FROM promotions WHERE deleted_at IS NULL`)
    .all() as Array<{ id: string; canales: string | null }>;

  const now = new Date().toISOString();
  let inserted = 0;
  let skippedExisting = 0;
  let promosWithoutChannels = 0;

  const insertStmt = sqlite.prepare(`
    INSERT INTO promotion_channel_config
      (id, promotion_id, channel_code, is_active_in_channel, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `);
  const existsStmt = sqlite.prepare(`
    SELECT 1 FROM promotion_channel_config
    WHERE promotion_id = ? AND channel_code = ?
    LIMIT 1
  `);

  for (const promo of promos) {
    const channels = parseCanales(promo.canales);
    if (channels.length === 0) {
      promosWithoutChannels += 1;
      continue;
    }
    for (const channelCode of channels) {
      const existing = existsStmt.get(promo.id, channelCode);
      if (existing) {
        skippedExisting += 1;
        continue;
      }
      insertStmt.run(crypto.randomUUID(), promo.id, channelCode, now, now);
      inserted += 1;
    }
  }

  console.log(`  [ok]   inserted ${inserted} rows`);
  console.log(`  [info] ${skippedExisting} already existed, ${promosWithoutChannels} promos had no channels`);
  console.log('Done.');
}

main();
