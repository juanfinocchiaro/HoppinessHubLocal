/**
 * Fase 5: helpers para registrar eventos de cambio por canal.
 *
 * Cada vez que una ruta modifica algo que impacta un canal externo
 * (Rappi, PedidosYa, MP Delivery), llamamos a `logChannelChange()` para
 * acumular una fila en `channel_pending_changes`. El encargado de la app
 * descarga un PDF con todos los cambios pendientes y los carga manualmente.
 *
 * Canales internos (Mostrador, WebApp) NO generan logs porque los controlamos
 * directamente nosotros.
 */

import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

export const APP_CHANNEL_CODES = ['rappi', 'pedidos_ya', 'mp_delivery'] as const;
export type AppChannelCode = (typeof APP_CHANNEL_CODES)[number];

export type ChangeType =
  | 'new_article'
  | 'price_change'
  | 'deactivation'
  | 'activation'
  | 'new_promotion'
  | 'promotion_change'
  | 'promotion_end';

export type EntityType = 'menu_item' | 'promotion';

/**
 * Verifica si un código de canal es "app externa". Los canales internos
 * (mostrador, webapp) no generan cambios pendientes.
 */
export function isAppChannel(channelCode: string): channelCode is AppChannelCode {
  return (APP_CHANNEL_CODES as readonly string[]).includes(channelCode);
}

export interface LogChannelChangeInput {
  channelCode: string;
  changeType: ChangeType;
  entityType: EntityType;
  entityId: string;
  payload: Record<string, unknown>;
  createdBy?: string;
}

/**
 * Registra un cambio pendiente. Idempotente por (entity + change_type +
 * channel + payload-hash) recientes — si ya hay una fila pendiente del
 * mismo tipo, se actualiza el `payload` en vez de crear otra (evita ruido
 * por re-edits).
 */
export async function logChannelChange(input: LogChannelChangeInput): Promise<void> {
  if (!isAppChannel(input.channelCode)) return;

  const existing = await db.select().from(schema.channel_pending_changes)
    .where(and(
      eq(schema.channel_pending_changes.channel_code, input.channelCode),
      eq(schema.channel_pending_changes.change_type, input.changeType),
      eq(schema.channel_pending_changes.entity_type, input.entityType),
      eq(schema.channel_pending_changes.entity_id, input.entityId),
      isNull(schema.channel_pending_changes.included_in_pdf_id),
    ))
    .get();

  const now = new Date().toISOString();

  if (existing) {
    await db.update(schema.channel_pending_changes)
      .set({
        payload: JSON.stringify(input.payload),
        created_at: now,
        created_by: input.createdBy ?? existing.created_by ?? null,
      })
      .where(eq(schema.channel_pending_changes.id, existing.id));
    return;
  }

  await db.insert(schema.channel_pending_changes).values({
    id: crypto.randomUUID(),
    channel_code: input.channelCode,
    change_type: input.changeType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    payload: JSON.stringify(input.payload),
    created_at: now,
    created_by: input.createdBy ?? null,
  });
}

/**
 * Log de un mismo cambio a múltiples canales (útil cuando la misma promo
 * aplica a Rappi + PY + MPD al mismo tiempo).
 */
export async function logChannelChangeBulk(
  channels: string[],
  input: Omit<LogChannelChangeInput, 'channelCode'>,
): Promise<void> {
  for (const channelCode of channels) {
    await logChannelChange({ ...input, channelCode });
  }
}
