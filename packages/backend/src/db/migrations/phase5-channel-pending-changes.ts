/**
 * Fase 5 — Log de cambios pendientes por canal + registro de exports PDF
 *
 * Crea dos tablas nuevas:
 *  - `channel_pending_changes`: acumula eventos de cambio (precio, alta,
 *    baja, promos) por canal (Rappi / PedidosYa / MP Delivery) para que el
 *    encargado tenga una lista clara de qué cargar manualmente.
 *  - `channel_pdf_exports`: registra cada PDF generado (cuándo, quién lo
 *    generó, confirmación de que el encargado lo cargó).
 *
 * Idempotente.
 *
 * Ejecutar con: `npm run db:migrate:phase5 -w @hoppiness/backend`
 */

import { sqlite } from '../connection.js';

function main() {
  console.log('Phase 5 migration: channel_pending_changes + channel_pdf_exports');

  console.log('[1/2] Creating channel_pending_changes...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS channel_pending_changes (
      id TEXT PRIMARY KEY,
      channel_code TEXT NOT NULL,
      change_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT,
      created_by TEXT,
      included_in_pdf_id TEXT
    )
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_channel_pending_changes_channel_pending
      ON channel_pending_changes (channel_code, included_in_pdf_id)
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_channel_pending_changes_entity
      ON channel_pending_changes (entity_type, entity_id)
  `);
  console.log('  [ok]   channel_pending_changes + indexes ready');

  console.log('[2/2] Creating channel_pdf_exports...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS channel_pdf_exports (
      id TEXT PRIMARY KEY,
      channel_code TEXT NOT NULL,
      generated_at TEXT,
      generated_by TEXT,
      delivered_to TEXT,
      confirmed_loaded_at TEXT,
      change_count INTEGER
    )
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_channel_pdf_exports_channel
      ON channel_pdf_exports (channel_code, generated_at DESC)
  `);
  console.log('  [ok]   channel_pdf_exports + index ready');
  console.log('Done.');
}

main();
