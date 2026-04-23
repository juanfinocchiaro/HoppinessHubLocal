/**
 * Scoping helper — post-tenancy-S1 version.
 *
 * Resources in the new model are scoped by:
 *  - `account_id` (tenant root, always required)
 *  - `location_id` / `branch_id` (optional — NULL = account-level resource)
 *
 * `ScopeContext`:
 *  - `{ type: 'location', id }` → single location (also includes account-level resources)
 *  - `{ type: 'account', id }` → account-level resources only (aggregate view)
 *  - `{ type: 'any' }` → no scope filter (admin use)
 *
 * The legacy `ambito` column and `__marca_only__` string have been removed.
 * If any call site still passes `branch_id=__marca_only__` it is silently
 * treated as `scope=account` for backward compat during the transition window.
 */

import { SQL, sql } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';

export type ScopeContext =
  | { type: 'location'; id: string }
  | { type: 'account'; id?: string }
  | { type: 'any' }
  // Legacy alias — keep until all call sites are updated
  | { type: 'branch'; id: string }
  | { type: 'brand'; id?: string };

export interface WhereScopeOptions {
  /** Column holding the location / branch reference. NULL = account-level. */
  branchIdColumn?: AnyColumn;
  /** Column holding the account reference (tenant root). */
  accountIdColumn?: AnyColumn;
  /**
   * If true, when filtering by location also include rows where the
   * branch_id/location_id is NULL (= account-level, shared downward).
   * Default: true when branchIdColumn is provided.
   */
  includeAccountLevel?: boolean;
}

/**
 * Returns an SQL fragment expressing "rows visible to this scope".
 * Use inside `and(...)` in the where clause.
 *
 * @example
 *   const rows = await db.select().from(schema.suppliers).where(and(
 *     isNull(schema.suppliers.deleted_at),
 *     whereScope(scope, {
 *       branchIdColumn: schema.suppliers.branch_id,
 *       accountIdColumn: schema.suppliers.account_id,
 *     }),
 *   ));
 */
export function whereScope(ctx: ScopeContext, opts: WhereScopeOptions): SQL {
  if (ctx.type === 'any') return sql`1 = 1`;

  // Normalize legacy aliases
  const normalized =
    ctx.type === 'branch'
      ? ({ type: 'location', id: ctx.id } as const)
      : ctx.type === 'brand'
        ? ({ type: 'account', id: ctx.id } as const)
        : ctx;

  const includeAccountLevel = opts.includeAccountLevel ?? !!opts.branchIdColumn;

  if (normalized.type === 'location') {
    const clauses: SQL[] = [];
    if (opts.branchIdColumn) clauses.push(sql`${opts.branchIdColumn} = ${normalized.id}`);
    // Account-level rows (NULL branch) are visible from any location of the account
    if (includeAccountLevel && opts.branchIdColumn) {
      clauses.push(sql`${opts.branchIdColumn} IS NULL`);
    }
    if (clauses.length === 0) return sql`1 = 1`;
    if (clauses.length === 1) return clauses[0];
    return sql`(${clauses[0]} OR ${clauses[1]})`;
  }

  // scope = 'account' — account-level rows only (NULL branch)
  if (opts.branchIdColumn) {
    return sql`${opts.branchIdColumn} IS NULL`;
  }
  if (opts.accountIdColumn && normalized.id) {
    return sql`${opts.accountIdColumn} = ${normalized.id}`;
  }
  return sql`1 = 1`;
}

/**
 * Parses `req.query.scope` + `req.query.branch_id` / `req.query.brand_id`
 * into a `ScopeContext`.
 *
 * Supported:
 *  - `scope=account`          → `{ type: 'account' }`
 *  - `scope=location&branch_id=<uuid>` → `{ type: 'location', id }`
 *  - `branch_id=<uuid>`       → `{ type: 'location', id }` (legacy shorthand)
 *  - `scope=brand`            → `{ type: 'account' }` (legacy alias)
 *  - `branch_id=__marca_only__` → `{ type: 'account' }` (legacy, deprecated)
 *  - nothing                  → `{ type: 'any' }`
 */
export function parseScopeFromQuery(query: Record<string, unknown>): ScopeContext {
  const rawScope = typeof query.scope === 'string' ? query.scope : undefined;
  const branchId = typeof query.branch_id === 'string' ? query.branch_id : undefined;
  const brandId = typeof query.brand_id === 'string' ? query.brand_id : undefined;

  // New canonical API
  if (rawScope === 'account') return { type: 'account', id: brandId };
  if (rawScope === 'location' && branchId) return { type: 'location', id: branchId };

  // Legacy compat
  if (rawScope === 'brand') return { type: 'account', id: brandId };
  if (rawScope === 'branch' && branchId) return { type: 'location', id: branchId };
  if (branchId === '__marca_only__') return { type: 'account' };
  if (branchId) return { type: 'location', id: branchId };

  return { type: 'any' };
}
