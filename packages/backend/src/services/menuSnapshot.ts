/**
 * Fase 6 — Menu snapshot / Publish workflow.
 *
 * `publishMenu()` construye el SellableMenu y lo persiste como snapshot
 * "current" para la combinación `(scope, channel)`. El snapshot anterior
 * queda como histórico con `is_current=false`.
 *
 * `getCurrentSnapshot()` lee el último snapshot publicado. POS y WebApp
 * lo consumen vía el endpoint `/api/menu/sellable` cuando existe, o caen
 * al builder live si no.
 */

import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';
import { buildSellableMenu } from './sellableMenu.js';
import type { SellableMenuResponse } from '@hoppiness/shared';

export interface PublishMenuInput {
  scopeType: 'brand' | 'branch';
  scopeId: string;
  channelCode: string;
  publishedBy?: string | null;
}

export interface PublishMenuResult {
  snapshot_id: string;
  scope_type: string;
  scope_id: string;
  channel_code: string;
  item_count: number;
  published_at: string;
}

export async function publishMenu(input: PublishMenuInput): Promise<PublishMenuResult> {
  const now = new Date().toISOString();
  const response = await buildSellableMenu({
    channelCode: input.channelCode,
    branchId: input.scopeType === 'branch' ? input.scopeId : null,
    at: now,
  });

  // Bajar cualquier snapshot current existente
  await db.update(schema.menu_snapshot)
    .set({ is_current: false })
    .where(and(
      eq(schema.menu_snapshot.scope_type, input.scopeType),
      eq(schema.menu_snapshot.scope_id, input.scopeId),
      eq(schema.menu_snapshot.channel_code, input.channelCode),
      eq(schema.menu_snapshot.is_current, true),
    ));

  const id = crypto.randomUUID();
  await db.insert(schema.menu_snapshot).values({
    id,
    scope_type: input.scopeType,
    scope_id: input.scopeId,
    channel_code: input.channelCode,
    payload: JSON.stringify(response),
    item_count: response.items.length,
    published_at: now,
    published_by: input.publishedBy ?? null,
    is_current: true,
  });

  return {
    snapshot_id: id,
    scope_type: input.scopeType,
    scope_id: input.scopeId,
    channel_code: input.channelCode,
    item_count: response.items.length,
    published_at: now,
  };
}

export async function getCurrentSnapshot(
  scopeType: string,
  scopeId: string,
  channelCode: string,
): Promise<SellableMenuResponse | null> {
  const row = await db.select().from(schema.menu_snapshot).where(and(
    eq(schema.menu_snapshot.scope_type, scopeType),
    eq(schema.menu_snapshot.scope_id, scopeId),
    eq(schema.menu_snapshot.channel_code, channelCode),
    eq(schema.menu_snapshot.is_current, true),
  )).orderBy(desc(schema.menu_snapshot.published_at)).get();

  if (!row) return null;
  try {
    return JSON.parse(row.payload) as SellableMenuResponse;
  } catch {
    return null;
  }
}

export async function listRecentSnapshots(
  scopeType: string,
  scopeId: string,
  channelCode?: string,
  limit = 20,
) {
  const conditions = [
    eq(schema.menu_snapshot.scope_type, scopeType),
    eq(schema.menu_snapshot.scope_id, scopeId),
  ];
  if (channelCode) conditions.push(eq(schema.menu_snapshot.channel_code, channelCode));

  return db.select({
    id: schema.menu_snapshot.id,
    scope_type: schema.menu_snapshot.scope_type,
    scope_id: schema.menu_snapshot.scope_id,
    channel_code: schema.menu_snapshot.channel_code,
    item_count: schema.menu_snapshot.item_count,
    published_at: schema.menu_snapshot.published_at,
    published_by: schema.menu_snapshot.published_by,
    is_current: schema.menu_snapshot.is_current,
  })
    .from(schema.menu_snapshot)
    .where(and(...conditions))
    .orderBy(desc(schema.menu_snapshot.published_at))
    .limit(limit);
}
