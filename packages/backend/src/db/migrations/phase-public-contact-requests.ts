/**
 * Migration: tabla contact_requests
 * Para el formulario de contacto del marketing site.
 * Sprint 3-4: POST /api/public/contact
 */
import { db } from '../connection.js';

export async function migrateContactRequests() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      nombre      TEXT    NOT NULL,
      email       TEXT    NOT NULL,
      empresa     TEXT,
      locales     TEXT,
      motivo      TEXT,
      mensaje     TEXT    NOT NULL,
      leido       INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_contact_requests_email
    ON contact_requests (email);
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
    ON contact_requests (created_at DESC);
  `);

  console.log('[migration] contact_requests table ready');
}
