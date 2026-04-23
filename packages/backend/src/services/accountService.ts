import { db } from '../db/connection.js';
import { accounts, branches, user_role_assignments } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Resolves the account_id for a given user.
 * Looks up the first active branch the user has access to,
 * then returns that branch's account_id.
 */
export async function getAccountIdForUser(userId: string): Promise<string | null> {
  const assignments = await db
    .select({ branch_id: user_role_assignments.branch_id })
    .from(user_role_assignments)
    .where(
      and(
        eq(user_role_assignments.user_id, userId),
        eq(user_role_assignments.is_active, true),
      )
    )
    .limit(1);

  if (assignments.length === 0 || !assignments[0].branch_id) return null;

  const branch = await db
    .select({ account_id: branches.account_id })
    .from(branches)
    .where(eq(branches.id, assignments[0].branch_id))
    .limit(1);

  return branch[0]?.account_id ?? null;
}

export async function getAccountById(accountId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  return rows[0] ?? null;
}
