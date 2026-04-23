import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { user_role_assignments, roles, user_location_access, user_account_access } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

// ──────────────────────────────────────────────────────────────────────────────
// Legacy role model (kept for backward compat during Sprint 1-2 transition)
// ──────────────────────────────────────────────────────────────────────────────

export interface UserRoleInfo {
  brandRole: string | null;
  branchRoles: Array<{ branch_id: string; local_role: string }>;
}

export async function getUserRoles(userId: string): Promise<UserRoleInfo> {
  const assignments = await db
    .select({
      branch_id: user_role_assignments.branch_id,
      role_key: roles.key,
      role_scope: roles.scope,
      is_active: user_role_assignments.is_active,
    })
    .from(user_role_assignments)
    .innerJoin(roles, eq(user_role_assignments.role_id, roles.id))
    .where(
      and(
        eq(user_role_assignments.user_id, userId),
        eq(user_role_assignments.is_active, true)
      )
    );

  let brandRole: string | null = null;
  const branchRoles: Array<{ branch_id: string; local_role: string }> = [];

  for (const a of assignments) {
    if (a.role_scope === 'brand' && !a.branch_id) {
      brandRole = a.role_key;
    } else if (a.role_scope === 'branch' && a.branch_id) {
      branchRoles.push({ branch_id: a.branch_id, local_role: a.role_key! });
    }
  }

  return { brandRole, branchRoles };
}

// ──────────────────────────────────────────────────────────────────────────────
// New capability model (Sprint 3+)
// ──────────────────────────────────────────────────────────────────────────────

export type LocationCapability =
  | 'operate_pos'
  | 'manage_staff'
  | 'manage_inventory'
  | 'manage_catalog_local'
  | 'view_finance'
  | 'manage_finance'
  | 'manage_promotions';

export type AccountCapability =
  | 'view_aggregate_sales'
  | 'view_aggregate_finance'
  | 'manage_account_catalog'
  | 'manage_account_users'
  | 'manage_account_settings';

export interface UserAccessInfo {
  locations: Array<{ location_id: string; capabilities: LocationCapability[] }>;
  account: { account_id: string; capabilities: AccountCapability[] } | null;
}

export async function getUserAccess(userId: string): Promise<UserAccessInfo> {
  const [locationRows, accountRows] = await Promise.all([
    db
      .select({
        location_id: user_location_access.location_id,
        capabilities: user_location_access.capabilities,
      })
      .from(user_location_access)
      .where(eq(user_location_access.user_id, userId)),
    db
      .select({
        account_id: user_account_access.account_id,
        capabilities: user_account_access.capabilities,
      })
      .from(user_account_access)
      .where(eq(user_account_access.user_id, userId)),
  ]);

  const locations = locationRows.map((r) => ({
    location_id: r.location_id,
    capabilities: parseCapabilities<LocationCapability>(r.capabilities),
  }));

  const accountRow = accountRows[0] ?? null;
  const account = accountRow
    ? {
        account_id: accountRow.account_id,
        capabilities: parseCapabilities<AccountCapability>(accountRow.capabilities),
      }
    : null;

  return { locations, account };
}

function parseCapabilities<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function hasLocationCapability(
  access: UserAccessInfo,
  locationId: string,
  capability: LocationCapability
): boolean {
  const entry = access.locations.find((l) => l.location_id === locationId);
  return !!entry && entry.capabilities.includes(capability);
}

export function hasAccountCapability(
  access: UserAccessInfo,
  capability: AccountCapability
): boolean {
  return !!access.account && access.account.capabilities.includes(capability);
}

// ──────────────────────────────────────────────────────────────────────────────
// Express middleware
// ──────────────────────────────────────────────────────────────────────────────

export function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  getUserRoles(req.user.userId).then(({ brandRole }) => {
    if (brandRole !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
  }).catch(next);
}

export function requireBranchAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const branchId = req.params.branchId || req.body?.branch_id || req.query?.branch_id;
  if (!branchId) return res.status(400).json({ error: 'Branch ID required' });

  getUserRoles(req.user.userId).then(({ brandRole, branchRoles }) => {
    if (brandRole === 'superadmin' || brandRole === 'admin') {
      return next();
    }
    const hasBranchRole = branchRoles.some(r => r.branch_id === branchId);
    if (!hasBranchRole) {
      return res.status(403).json({ error: 'No access to this branch' });
    }
    next();
  }).catch(next);
}

export function requireBranchRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const branchId = req.params.branchId || req.body?.branch_id || req.query?.branch_id;
    if (!branchId) return res.status(400).json({ error: 'Branch ID required' });

    getUserRoles(req.user.userId).then(({ brandRole, branchRoles }) => {
      if (brandRole === 'superadmin') return next();

      const branchRole = branchRoles.find(r => r.branch_id === branchId);
      if (!branchRole || !allowedRoles.includes(branchRole.local_role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    }).catch(next);
  };
}

export function requireRestostackAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  getUserRoles(req.user.userId).then(({ brandRole }) => {
    if (brandRole !== 'restostack_admin') {
      return res.status(403).json({ error: 'RestoStack admin access required' });
    }
    next();
  }).catch(next);
}

/** New capability guard — checks `user_location_access` table. */
export function requireLocationCapability(capability: LocationCapability) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const locationId =
      req.params.locationId ||
      req.params.branchId ||
      (req.body?.location_id as string | undefined) ||
      (req.query?.location_id as string | undefined) ||
      (req.query?.branch_id as string | undefined);

    if (!locationId) return res.status(400).json({ error: 'Location ID required' });

    getUserAccess(req.user.userId)
      .then((access) => {
        // Superadmin legacy bypass
        const { brandRole } = { brandRole: null as string | null };
        void brandRole;

        if (!hasLocationCapability(access, locationId, capability)) {
          return res.status(403).json({
            error: `Capability '${capability}' required for this location`,
          });
        }
        next();
      })
      .catch(next);
  };
}

/** New capability guard — checks `user_account_access` table. */
export function requireAccountCapability(capability: AccountCapability) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    getUserAccess(req.user.userId)
      .then((access) => {
        if (!hasAccountCapability(access, capability)) {
          return res.status(403).json({
            error: `Capability '${capability}' required`,
          });
        }
        next();
      })
      .catch(next);
  };
}
