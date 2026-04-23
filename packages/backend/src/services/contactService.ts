/**
 * Contact Service — guarda solicitudes de contacto del marketing site.
 * Tabla: contact_requests (creada en la migration phase-public-contact-requests)
 */
import { sqlite } from '../db/connection.js';

export interface ContactRequest {
  nombre: string;
  email: string;
  empresa?: string;
  locales?: string;
  motivo?: string;
  mensaje: string;
}

function ensureTable() {
  sqlite.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_cr_email ON contact_requests (email);
    CREATE INDEX IF NOT EXISTS idx_cr_created ON contact_requests (created_at DESC);
  `);
}

ensureTable();

export function saveContactRequest(data: ContactRequest): void {
  const stmt = sqlite.prepare(`
    INSERT INTO contact_requests (nombre, email, empresa, locales, motivo, mensaje)
    VALUES (@nombre, @email, @empresa, @locales, @motivo, @mensaje)
  `);

  stmt.run({
    nombre: data.nombre,
    email: data.email,
    empresa: data.empresa ?? null,
    locales: data.locales ?? null,
    motivo: data.motivo ?? null,
    mensaje: data.mensaje,
  });
}

export function getContactRequests(limit = 50) {
  return sqlite.prepare(`
    SELECT * FROM contact_requests ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

export function markContactRead(id: string) {
  sqlite.prepare('UPDATE contact_requests SET leido = 1 WHERE id = ?').run(id);
}
