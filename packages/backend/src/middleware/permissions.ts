import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { user_role_assignments, roles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

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
