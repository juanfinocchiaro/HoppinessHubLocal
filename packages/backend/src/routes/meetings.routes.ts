import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, desc, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// HELPERS
// ============================================================================

async function enrichMeeting(meeting: typeof schema.meetings.$inferSelect) {
  const participants = await db.select().from(schema.meeting_participants)
    .where(eq(schema.meeting_participants.meeting_id, meeting.id));

  const agreements = await db.select().from(schema.meeting_agreements)
    .where(eq(schema.meeting_agreements.meeting_id, meeting.id))
    .orderBy(asc(schema.meeting_agreements.sort_order));

  const agreementIds = agreements.map(a => a.id);
  let assignees: typeof schema.meeting_agreement_assignees.$inferSelect[] = [];
  if (agreementIds.length > 0) {
    assignees = await db.select().from(schema.meeting_agreement_assignees)
      .where(inArray(schema.meeting_agreement_assignees.agreement_id, agreementIds));
  }

  const allUserIds = [
    ...participants.map(p => p.user_id),
    ...assignees.map(a => a.user_id),
    meeting.created_by,
  ].filter(Boolean) as string[];
  const uniqueIds = [...new Set(allUserIds)];

  let profileMap: Record<string, string> = {};
  if (uniqueIds.length > 0) {
    const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(inArray(schema.profiles.id, uniqueIds));
    profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '']));
  }

  const enrichedAgreements = agreements.map(a => ({
    ...a,
    assignees: assignees
      .filter(s => s.agreement_id === a.id)
      .map(s => ({ id: s.id, user_id: s.user_id, full_name: profileMap[s.user_id!] ?? null })),
  }));

  const enrichedParticipants = participants.map(p => ({
    ...p,
    full_name: profileMap[p.user_id!] ?? null,
  }));

  return {
    ...meeting,
    created_by_name: profileMap[meeting.created_by!] ?? null,
    participants: enrichedParticipants,
    agreements: enrichedAgreements,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

router.get('/brand/stats', requireAuth, async (_req, res, next) => {
  try {
    const allMeetings = await db.select().from(schema.meetings)
      .where(eq(schema.meetings.source, 'brand'));

    const total = allMeetings.length;
    const scheduled = allMeetings.filter(m => m.status === 'scheduled').length;
    const inProgress = allMeetings.filter(m => m.status === 'in_progress').length;
    const closed = allMeetings.filter(m => m.status === 'closed').length;

    res.json({ data: { total, scheduled, inProgress, closed } });
  } catch (err) { next(err); }
});

router.get('/brand', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.meetings)
      .where(eq(schema.meetings.source, 'brand'))
      .orderBy(desc(schema.meetings.created_at));

    const enriched = await Promise.all(rows.map(enrichMeeting));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/convene', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.get('/legacy', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.get('/network-members', requireAuth, async (_req, res, next) => {
  try {
    const managerRoles = await db.select({ id: schema.roles.id }).from(schema.roles)
      .where(inArray(schema.roles.key, ['encargado', 'administrador', 'franquiciado', 'superadmin']));
    const managerRoleIds = managerRoles.map(r => r.id);
    if (managerRoleIds.length === 0) return res.json({ data: [] });

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.is_active, true),
        inArray(schema.user_role_assignments.role_id, managerRoleIds),
      ));

    const userIds = [...new Set(assignments.map(a => a.user_id).filter(Boolean))] as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
      avatar_url: schema.profiles.avatar_url,
    }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const result = profiles.map(p => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
    }));
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/check-conflicts', requireAuth, async (req, res, next) => {
  try {
    const { date, time, participantIds } = req.body;
    if (!participantIds?.length) return res.json({ data: [] });

    const dateStr = new Date(date).toISOString().slice(0, 10);

    const allParticipants = await db.select().from(schema.meeting_participants)
      .where(inArray(schema.meeting_participants.user_id, participantIds));

    const meetingIds = [...new Set(allParticipants.map(p => p.meeting_id).filter(Boolean))] as string[];
    if (meetingIds.length === 0) return res.json({ data: [] });

    const meetings = await db.select().from(schema.meetings)
      .where(and(
        inArray(schema.meetings.id, meetingIds),
        inArray(schema.meetings.status, ['scheduled', 'in_progress']),
      ));

    const sameDayMeetings = meetings.filter(m => {
      const mDate = (m.scheduled_at ?? m.date ?? '').slice(0, 10);
      return mDate === dateStr;
    });

    if (sameDayMeetings.length === 0) return res.json({ data: [] });

    const conflicts: { userId: string; userName: string; meetingTitle: string; meetingTime: string }[] = [];
    const profileIds = [...new Set(participantIds)];
    const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(inArray(schema.profiles.id, profileIds));
    const nameMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '']));

    for (const m of sameDayMeetings) {
      const mParticipants = allParticipants.filter(p => p.meeting_id === m.id);
      for (const p of mParticipants) {
        if (participantIds.includes(p.user_id!)) {
          conflicts.push({
            userId: p.user_id!,
            userName: nameMap[p.user_id!] ?? '',
            meetingTitle: m.title ?? '',
            meetingTime: m.scheduled_at ?? m.date ?? '',
          });
        }
      }
    }

    res.json({ data: conflicts });
  } catch (err) { next(err); }
});

router.delete('/agreements/:agreementId', requireAuth, async (req, res, next) => {
  try {
    const { agreementId } = req.params;
    await db.delete(schema.meeting_agreement_assignees)
      .where(eq(schema.meeting_agreement_assignees.agreement_id, agreementId));
    await db.delete(schema.meeting_agreements)
      .where(eq(schema.meeting_agreements.id, agreementId));
    res.json({ message: 'Agreement deleted' });
  } catch (err) { next(err); }
});

router.get('/branch/:branchId/team', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
      avatar_url: schema.profiles.avatar_url,
    }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));

    const result = assignments.map(a => {
      const profile = profiles.find(p => p.id === a.user_id);
      return {
        id: a.user_id,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        local_role: roleMap[a.role_id!] ?? 'empleado',
      };
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.meetings)
      .where(eq(schema.meetings.branch_id, req.params.branchId))
      .orderBy(desc(schema.meetings.created_at));

    const enriched = await Promise.all(rows.map(enrichMeeting));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/user/:userId/stats', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const participations = await db.select().from(schema.meeting_participants)
      .where(eq(schema.meeting_participants.user_id, userId));

    const unread = participations.filter(p => !p.read_at).length;
    const total = participations.length;

    res.json({ data: { unread, total } });
  } catch (err) { next(err); }
});

router.get('/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const participations = await db.select().from(schema.meeting_participants)
      .where(eq(schema.meeting_participants.user_id, userId));

    const meetingIds = participations.map(p => p.meeting_id).filter(Boolean) as string[];
    if (meetingIds.length === 0) return res.json({ data: [] });

    const meetings = await db.select().from(schema.meetings)
      .where(inArray(schema.meetings.id, meetingIds))
      .orderBy(desc(schema.meetings.created_at));

    const enriched = await Promise.all(meetings.map(enrichMeeting));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

// ============================================================================
// MUTATIONS: CONVENE / CREATE
// ============================================================================

router.post('/convene', requireAuth, async (req, res, next) => {
  try {
    const { userId, title, date, area, branchId, participantIds, scheduledAt, source } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.meetings).values({
      id,
      title: title ?? null,
      date: date ?? now.slice(0, 10),
      area: area ?? null,
      branch_id: branchId ?? null,
      created_by: userId ?? req.user!.userId,
      status: 'scheduled',
      scheduled_at: scheduledAt ?? null,
      source: source ?? 'local',
      created_at: now,
      updated_at: now,
    });

    if (Array.isArray(participantIds)) {
      for (const pId of participantIds) {
        await db.insert(schema.meeting_participants).values({
          id: crypto.randomUUID(),
          meeting_id: id,
          user_id: pId,
          created_at: now,
        });
      }
    }

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, id)).get();
    if (meeting) {
      const enriched = await enrichMeeting(meeting);
      return res.status(201).json({ data: enriched });
    }
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.post('/legacy', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId, title, date, area, participants, notes, agreements } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.meetings).values({
      id,
      title: title ?? null,
      date: date ?? now.slice(0, 10),
      area: area ?? null,
      branch_id: branchId ?? null,
      created_by: userId ?? req.user!.userId,
      status: 'closed',
      notes: notes ?? null,
      started_at: now,
      closed_at: now,
      source: 'local',
      created_at: now,
      updated_at: now,
    });

    if (Array.isArray(participants)) {
      for (const p of participants) {
        await db.insert(schema.meeting_participants).values({
          id: crypto.randomUUID(),
          meeting_id: id,
          user_id: p.user_id ?? p.id ?? p,
          attended: p.attended ?? true,
          was_present: p.was_present ?? true,
          created_at: now,
        });
      }
    }

    if (Array.isArray(agreements)) {
      for (let i = 0; i < agreements.length; i++) {
        const a = agreements[i];
        const agreementId = crypto.randomUUID();
        await db.insert(schema.meeting_agreements).values({
          id: agreementId,
          meeting_id: id,
          description: a.description,
          sort_order: a.sortOrder ?? i,
          created_at: now,
        });

        if (Array.isArray(a.assigneeIds)) {
          for (const assigneeId of a.assigneeIds) {
            await db.insert(schema.meeting_agreement_assignees).values({
              id: crypto.randomUUID(),
              agreement_id: agreementId,
              user_id: assigneeId,
            });
          }
        }
      }
    }

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, id)).get();
    if (meeting) {
      const enriched = await enrichMeeting(meeting);
      return res.status(201).json({ data: enriched });
    }
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

// ============================================================================
// MUTATIONS: LIFECYCLE
// ============================================================================

router.put('/:meetingId/convene', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const existing = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).get();
    if (!existing) throw new AppError(404, 'Meeting not found');

    const { participantIds, ...updates } = req.body;
    await db.update(schema.meetings)
      .set({ ...updates, updated_at: new Date().toISOString() })
      .where(eq(schema.meetings.id, meetingId));

    if (Array.isArray(participantIds)) {
      await db.delete(schema.meeting_participants).where(eq(schema.meeting_participants.meeting_id, meetingId));
      const now = new Date().toISOString();
      for (const pId of participantIds) {
        await db.insert(schema.meeting_participants).values({
          id: crypto.randomUUID(),
          meeting_id: meetingId,
          user_id: pId,
          created_at: now,
        });
      }
    }

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).get();
    if (meeting) {
      const enriched = await enrichMeeting(meeting);
      return res.json({ data: enriched });
    }
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/:meetingId/cancel', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    await db.update(schema.meetings).set({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).where(eq(schema.meetings.id, meetingId));

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).get();
    res.json({ data: meeting });
  } catch (err) { next(err); }
});

router.post('/:meetingId/start', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const now = new Date().toISOString();
    await db.update(schema.meetings).set({
      status: 'in_progress',
      started_at: now,
      updated_at: now,
    }).where(eq(schema.meetings.id, meetingId));

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).get();
    res.json({ data: meeting });
  } catch (err) { next(err); }
});

router.put('/:meetingId/attendance', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { attendance } = req.body;
    if (!attendance || typeof attendance !== 'object') throw new AppError(400, 'attendance is required');

    for (const [userId, attended] of Object.entries(attendance)) {
      await db.update(schema.meeting_participants).set({
        attended: attended as boolean,
        was_present: attended as boolean,
      }).where(and(
        eq(schema.meeting_participants.meeting_id, meetingId),
        eq(schema.meeting_participants.user_id, userId),
      ));
    }

    const participants = await db.select().from(schema.meeting_participants)
      .where(eq(schema.meeting_participants.meeting_id, meetingId));
    res.json({ data: participants });
  } catch (err) { next(err); }
});

router.put('/:meetingId/notes', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { notes } = req.body;

    await db.update(schema.meetings).set({
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    }).where(eq(schema.meetings.id, meetingId));

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).get();
    res.json({ data: meeting });
  } catch (err) { next(err); }
});

router.post('/:meetingId/agreements', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { description, assigneeIds, sortOrder } = req.body;

    const agreementId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.meeting_agreements).values({
      id: agreementId,
      meeting_id: meetingId,
      description,
      sort_order: sortOrder ?? 0,
      created_at: now,
    });

    if (Array.isArray(assigneeIds)) {
      for (const userId of assigneeIds) {
        await db.insert(schema.meeting_agreement_assignees).values({
          id: crypto.randomUUID(),
          agreement_id: agreementId,
          user_id: userId,
        });
      }
    }

    const agreement = await db.select().from(schema.meeting_agreements)
      .where(eq(schema.meeting_agreements.id, agreementId)).get();

    const assigneesDb = await db.select().from(schema.meeting_agreement_assignees)
      .where(eq(schema.meeting_agreement_assignees.agreement_id, agreementId));

    res.status(201).json({ data: { ...agreement, assignees: assigneesDb } });
  } catch (err) { next(err); }
});

router.post('/:meetingId/close', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { notes, attendance, agreements } = req.body;
    const now = new Date().toISOString();

    await db.update(schema.meetings).set({
      status: 'closed',
      notes: notes ?? null,
      closed_at: now,
      updated_at: now,
    }).where(eq(schema.meetings.id, meetingId));

    if (attendance && typeof attendance === 'object') {
      for (const [userId, attended] of Object.entries(attendance)) {
        await db.update(schema.meeting_participants).set({
          attended: attended as boolean,
          was_present: attended as boolean,
        }).where(and(
          eq(schema.meeting_participants.meeting_id, meetingId),
          eq(schema.meeting_participants.user_id, userId),
        ));
      }
    }

    if (Array.isArray(agreements)) {
      for (let i = 0; i < agreements.length; i++) {
        const a = agreements[i];
        const agreementId = crypto.randomUUID();
        await db.insert(schema.meeting_agreements).values({
          id: agreementId,
          meeting_id: meetingId,
          description: a.description,
          sort_order: i,
          created_at: now,
        });

        if (Array.isArray(a.assigneeIds)) {
          for (const userId of a.assigneeIds) {
            await db.insert(schema.meeting_agreement_assignees).values({
              id: crypto.randomUUID(),
              agreement_id: agreementId,
              user_id: userId,
            });
          }
        }
      }
    }

    const meeting = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).get();
    if (meeting) {
      const enriched = await enrichMeeting(meeting);
      return res.json({ data: enriched });
    }
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/:meetingId/read', requireAuth, async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = userId ?? req.user!.userId;
    const now = new Date().toISOString();

    await db.update(schema.meeting_participants).set({ read_at: now })
      .where(and(
        eq(schema.meeting_participants.meeting_id, meetingId),
        eq(schema.meeting_participants.user_id, effectiveUserId),
      ));

    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// ============================================================================
// MEETING DETAIL (must come after all specific /:meetingId/* routes)
// ============================================================================

router.get('/:meetingId', requireAuth, async (req, res, next) => {
  try {
    const meeting = await db.select().from(schema.meetings)
      .where(eq(schema.meetings.id, req.params.meetingId)).get();
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const enriched = await enrichMeeting(meeting);
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

export { router as meetingRoutes };
