/**
 * Public routes — sin autenticación.
 * Consumidos por el marketing site (restostack.com):
 *   GET  /api/public/plans       → tiers de pricing
 *   POST /api/public/contact     → formulario de contacto
 */
import { Router, type Request, type Response } from 'express';
import { PRICING_TIERS } from '../services/pricingService.js';
import { saveContactRequest } from '../services/contactService.js';

export const publicRoutes = Router();

/* ── Rate limiting simple en memoria ── */
const contactRequests = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora

function rateLimit(req: Request, res: Response, next: () => void) {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const record = contactRequests.get(ip);

  if (record && record.resetAt > now) {
    if (record.count >= RATE_LIMIT) {
      res.status(429).json({ error: 'Demasiadas solicitudes. Intentá en una hora.' });
      return;
    }
    record.count++;
  } else {
    contactRequests.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  }

  next();
}

/* ── GET /api/public/plans ── */
publicRoutes.get('/plans', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.json({ plans: PRICING_TIERS });
});

/* ── POST /api/public/contact ── */
publicRoutes.post('/contact', rateLimit, async (req: Request, res: Response) => {
  const { nombre, email, empresa, locales, motivo, mensaje } = req.body as {
    nombre?: string;
    email?: string;
    empresa?: string;
    locales?: string;
    motivo?: string;
    mensaje?: string;
  };

  if (!nombre || !email || !mensaje) {
    res.status(400).json({ error: 'Nombre, email y mensaje son requeridos.' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Email inválido.' });
    return;
  }

  try {
    saveContactRequest({ nombre, email, empresa, locales, motivo, mensaje });
    res.status(201).json({ ok: true, message: 'Mensaje recibido. Te escribimos pronto.' });
  } catch (err) {
    console.error('[contact] Error guardando solicitud:', err);
    res.status(500).json({ error: 'Error interno. Intentá de nuevo.' });
  }
});
