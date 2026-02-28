import { supabase } from './supabaseClient';
import type {
  Meeting,
  MeetingWithDetails,
  MeetingConveneData,
  MeetingWizardData,
  MeetingStats,
  MeetingStatus,
  TeamMember,
} from '@/types/meeting';

// ─── Queries ───

export async function fetchBranchMeetings(branchId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .select(
      `
      *,
      participants:meeting_participants(
        id,
        user_id,
        attended,
        was_present,
        read_at
      )
    `,
    )
    .eq('branch_id', branchId)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as (Meeting & { participants: any[] })[];
}

export async function fetchMyMeetings(userId: string) {
  const { data: participantRecords, error: pError } = await supabase
    .from('meeting_participants')
    .select('meeting_id, attended, was_present, read_at')
    .eq('user_id', userId);

  if (pError) throw pError;
  if (!participantRecords?.length) return [];

  const meetingIds = participantRecords.map((p) => p.meeting_id);
  const recentMeetingIds = meetingIds.slice(0, 50);

  const { data: meetings, error: mError } = await supabase
    .from('meetings')
    .select('*, branches(id, name)')
    .in('id', recentMeetingIds)
    .order('scheduled_at', { ascending: false, nullsFirst: false });

  if (mError) throw mError;

  return (
    meetings?.map((m) => ({
      ...m,
      myParticipation: participantRecords.find((p) => p.meeting_id === m.id),
    })) || []
  );
}

export async function fetchUnreadMeetingsCount(userId: string): Promise<MeetingStats> {
  const { data: participations, error } = await supabase
    .from('meeting_participants')
    .select('id, meeting_id, read_at')
    .eq('user_id', userId);

  if (error) throw error;

  const unreadCount = participations?.filter((p) => !p.read_at).length || 0;
  const totalMeetings = participations?.length || 0;

  return { totalMeetings, unreadCount };
}

export async function fetchBrandMeetings() {
  const { data, error } = await supabase
    .from('meetings')
    .select(
      `
      *,
      branches(id, name, slug),
      participants:meeting_participants(id, user_id, attended, was_present, read_at)
    `,
    )
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) throw error;
  return data || [];
}

export async function fetchBrandMeetingsStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(
      `
      id,
      status,
      branch_id,
      branches(id, name),
      participants:meeting_participants(id, read_at)
    `,
    )
    .gte('scheduled_at', startOfMonth.toISOString());

  if (error) throw error;

  const totalMeetings = meetings?.length || 0;
  const convocadas = meetings?.filter((m) => m.status === 'convocada').length || 0;
  const enCurso = meetings?.filter((m) => m.status === 'en_curso').length || 0;
  const cerradas = meetings?.filter((m) => m.status === 'cerrada').length || 0;

  const closedMeetings = meetings?.filter((m) => m.status === 'cerrada') || [];
  let totalParticipants = 0;
  let readParticipants = 0;

  const pendingByBranch: Record<string, { name: string; pending: number }> = {};

  closedMeetings.forEach((meeting) => {
    const participants = meeting.participants || [];
    totalParticipants += participants.length;

    const readCount = participants.filter((p: any) => p.read_at).length;
    readParticipants += readCount;

    const pendingCount = participants.length - readCount;
    if (pendingCount > 0 && meeting.branch_id && meeting.branches) {
      const branchName = (meeting.branches as any).name;
      if (!pendingByBranch[meeting.branch_id]) {
        pendingByBranch[meeting.branch_id] = { name: branchName, pending: 0 };
      }
      pendingByBranch[meeting.branch_id].pending += pendingCount;
    }
  });

  const readPercentage =
    totalParticipants > 0 ? Math.round((readParticipants / totalParticipants) * 100) : 100;

  const alertCount = Object.keys(pendingByBranch).length;

  return {
    totalMeetings,
    readPercentage,
    alertCount,
    pendingByBranch,
    convocadas,
    enCurso,
    cerradas,
  };
}

export async function fetchMeetingDetail(meetingId: string): Promise<MeetingWithDetails> {
  const { data: meeting, error: mError } = await supabase
    .from('meetings')
    .select('*, branches(id, name, slug)')
    .eq('id', meetingId)
    .single();

  if (mError) throw mError;

  const { data: participants } = await supabase
    .from('meeting_participants')
    .select('*')
    .eq('meeting_id', meetingId);

  const participantIds = participants?.map((p) => p.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', [...participantIds, meeting.created_by]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const shouldFetchAgreements = meeting.status !== 'convocada';
  let agreements: any[] = [];
  let assignees: any[] = [];

  if (shouldFetchAgreements) {
    const { data: agreementData } = await supabase
      .from('meeting_agreements')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('sort_order');

    agreements = agreementData || [];

    const agreementIds = agreements.map((a) => a.id);
    if (agreementIds.length > 0) {
      const { data: assigneeData } = await supabase
        .from('meeting_agreement_assignees')
        .select('*')
        .in('agreement_id', agreementIds);
      assignees = assigneeData || [];
    }
  }

  return {
    ...meeting,
    area: meeting.area as MeetingWithDetails['area'],
    status: (meeting.status || 'cerrada') as MeetingStatus,
    source: (meeting.source || 'mi_local') as MeetingWithDetails['source'],
    branches: meeting.branches,
    creator: profileMap.get(meeting.created_by),
    participants: (participants || []).map((p) => ({
      ...p,
      profile: profileMap.get(p.user_id),
    })),
    agreements: agreements.map((a) => ({
      ...a,
      assignees: assignees
        .filter((as_) => as_.agreement_id === a.id)
        .map((as_) => ({
          ...as_,
          profile: profileMap.get(as_.user_id),
        })),
    })),
  };
}

// ─── Mutations: Fase 1 - Convocatoria ───

export async function conveneMeeting(userId: string, data: MeetingConveneData) {
  const [hours, minutes] = data.time.split(':').map(Number);
  const meetingDate = new Date(data.date);
  meetingDate.setHours(hours, minutes, 0, 0);

  const { data: meeting, error: mError } = await supabase
    .from('meetings')
    .insert({
      title: data.title,
      date: meetingDate.toISOString(),
      scheduled_at: meetingDate.toISOString(),
      area: data.area,
      branch_id: data.branchId || null,
      created_by: userId,
      notes: null,
      status: 'convocada',
      source: data.branchId ? 'mi_local' : 'mi_marca',
    })
    .select()
    .single();

  if (mError) throw mError;

  const participantInserts = data.participantIds.map((pUserId) => ({
    meeting_id: meeting.id,
    user_id: pUserId,
    attended: false,
    was_present: null,
    notified_at: new Date().toISOString(),
  }));

  if (participantInserts.length > 0) {
    const { error: pError } = await supabase
      .from('meeting_participants')
      .insert(participantInserts);

    if (pError) throw pError;
  }

  supabase.functions
    .invoke('send-meeting-notification', {
      body: { meeting_id: meeting.id },
    })
    .catch((err) => {
      if (import.meta.env.DEV) console.error('Failed to send meeting notification:', err);
    });

  return meeting;
}

export async function updateConvokedMeeting(
  meetingId: string,
  data: Partial<MeetingConveneData>,
) {
  const updates: any = {};

  if (data.title) updates.title = data.title;
  if (data.area) updates.area = data.area;

  if (data.date && data.time) {
    const [hours, minutes] = data.time.split(':').map(Number);
    const meetingDate = new Date(data.date);
    meetingDate.setHours(hours, minutes, 0, 0);
    updates.date = meetingDate.toISOString();
    updates.scheduled_at = meetingDate.toISOString();
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', meetingId)
    .eq('status', 'convocada')
    .select()
    .single();

  if (error) throw error;

  if (data.participantIds) {
    const { error: delError } = await supabase
      .from('meeting_participants')
      .delete()
      .eq('meeting_id', meetingId);
    if (delError) throw delError;

    const participantInserts = data.participantIds.map((pUserId) => ({
      meeting_id: meetingId,
      user_id: pUserId,
      attended: false,
      was_present: null,
    }));

    if (participantInserts.length > 0) {
      const { error: insError } = await supabase
        .from('meeting_participants')
        .insert(participantInserts);
      if (insError) throw insError;
    }
  }

  return meeting;
}

export async function cancelMeeting(meetingId: string) {
  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'cancelada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .eq('status', 'convocada');

  if (error) throw error;
}

// ─── Mutations: Fase 2 - Ejecución ───

export async function startMeeting(meetingId: string, userId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .update({
      status: 'en_curso',
      started_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .eq('status', 'convocada')
    .eq('created_by', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendance(
  meetingId: string,
  attendance: Record<string, boolean>,
) {
  const results = await Promise.all(
    Object.entries(attendance).map(([userId, wasPresent]) =>
      supabase
        .from('meeting_participants')
        .update({
          was_present: wasPresent,
          attended: wasPresent,
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', userId),
    ),
  );
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) throw new Error(`Error actualizando ${failed.length} asistencia(s)`);
}

export async function saveMeetingNotes(meetingId: string, notes: string) {
  const { error } = await supabase.from('meetings').update({ notes }).eq('id', meetingId);
  if (error) throw error;
}

export async function addAgreement(params: {
  meetingId: string;
  description: string;
  assigneeIds: string[];
  sortOrder?: number;
}) {
  const { data: agreement, error: aError } = await supabase
    .from('meeting_agreements')
    .insert({
      meeting_id: params.meetingId,
      description: params.description,
      sort_order: params.sortOrder ?? 0,
    })
    .select()
    .single();

  if (aError) throw aError;

  if (params.assigneeIds.length > 0) {
    const assigneeInserts = params.assigneeIds.map((userId) => ({
      agreement_id: agreement.id,
      user_id: userId,
    }));

    const { error: asError } = await supabase
      .from('meeting_agreement_assignees')
      .insert(assigneeInserts);

    if (asError) throw asError;
  }

  return agreement;
}

export async function deleteAgreement(agreementId: string) {
  const { error: assErr } = await supabase
    .from('meeting_agreement_assignees')
    .delete()
    .eq('agreement_id', agreementId);
  if (assErr) throw assErr;

  const { error } = await supabase.from('meeting_agreements').delete().eq('id', agreementId);
  if (error) throw error;
}

export async function closeMeeting(params: {
  meetingId: string;
  notes: string;
  attendance: Record<string, boolean>;
  agreements?: { description: string; assigneeIds: string[] }[];
}) {
  const { meetingId, notes, attendance, agreements } = params;

  const { error: mError } = await supabase
    .from('meetings')
    .update({
      status: 'cerrada',
      closed_at: new Date().toISOString(),
      notes,
    })
    .eq('id', meetingId);

  if (mError) throw mError;

  const attendanceResults = await Promise.all(
    Object.entries(attendance).map(([userId, wasPresent]) =>
      supabase
        .from('meeting_participants')
        .update({
          was_present: wasPresent,
          attended: wasPresent,
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', userId),
    ),
  );
  const attFailed = attendanceResults.filter((r) => r.error);
  if (attFailed.length > 0)
    throw new Error(`Error actualizando ${attFailed.length} asistencia(s)`);

  if (agreements && agreements.length > 0) {
    for (let i = 0; i < agreements.length; i++) {
      const agreement = agreements[i];

      const { data: createdAgreement, error: aError } = await supabase
        .from('meeting_agreements')
        .insert({
          meeting_id: meetingId,
          description: agreement.description,
          sort_order: i,
        })
        .select()
        .single();

      if (aError) throw aError;

      if (agreement.assigneeIds.length > 0) {
        const assigneeInserts = agreement.assigneeIds.map((userId) => ({
          agreement_id: createdAgreement.id,
          user_id: userId,
        }));

        const { error: asError } = await supabase
          .from('meeting_agreement_assignees')
          .insert(assigneeInserts);
        if (asError) throw asError;
      }
    }
  }

  supabase.functions
    .invoke('send-meeting-minutes-notification', {
      body: { meeting_id: meetingId },
    })
    .catch((err) => {
      if (import.meta.env.DEV)
        console.error('Failed to send meeting minutes notification:', err);
    });
}

// ─── Mutations: General ───

export async function markMeetingAsRead(meetingId: string, userId: string) {
  const { error } = await supabase
    .from('meeting_participants')
    .update({ read_at: new Date().toISOString() })
    .eq('meeting_id', meetingId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function createMeetingLegacy(
  userId: string,
  branchId: string,
  data: MeetingWizardData,
) {
  const [hours, minutes] = data.time.split(':').map(Number);
  const meetingDate = new Date(data.date);
  meetingDate.setHours(hours, minutes, 0, 0);

  const { data: meeting, error: mError } = await supabase
    .from('meetings')
    .insert({
      title: data.title,
      date: meetingDate.toISOString(),
      scheduled_at: meetingDate.toISOString(),
      area: data.area,
      branch_id: branchId,
      created_by: userId,
      notes: data.notes,
      status: 'cerrada',
      closed_at: new Date().toISOString(),
      source: 'mi_local',
    })
    .select()
    .single();

  if (mError) throw mError;

  const participantInserts = data.participantIds.map((pUserId) => ({
    meeting_id: meeting.id,
    user_id: pUserId,
    attended: data.attendance[pUserId] ?? false,
    was_present: data.attendance[pUserId] ?? false,
  }));

  if (participantInserts.length > 0) {
    const { error: pError } = await supabase
      .from('meeting_participants')
      .insert(participantInserts);

    if (pError) throw pError;
  }

  for (let i = 0; i < data.agreements.length; i++) {
    const agreement = data.agreements[i];

    const { data: createdAgreement, error: aError } = await supabase
      .from('meeting_agreements')
      .insert({
        meeting_id: meeting.id,
        description: agreement.description,
        sort_order: i,
      })
      .select()
      .single();

    if (aError) throw aError;

    if (agreement.assigneeIds.length > 0) {
      const assigneeInserts = agreement.assigneeIds.map((aUserId) => ({
        agreement_id: createdAgreement.id,
        user_id: aUserId,
      }));

      const { error: asError } = await supabase
        .from('meeting_agreement_assignees')
        .insert(assigneeInserts);

      if (asError) throw asError;
    }
  }

  return meeting;
}

// ─── Queries: Team Members ───

export async function fetchBranchTeamMembers(branchId: string): Promise<TeamMember[]> {
  const { data: branchRoles, error: rError } = await supabase
    .from('user_branch_roles')
    .select('user_id, local_role')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (rError) throw rError;
  if (!branchRoles?.length) return [];

  const userIds = branchRoles.map((r) => r.user_id);

  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (pError) throw pError;

  const roleMap = new Map(branchRoles.map((r) => [r.user_id, r.local_role]));

  return (profiles || []).map((p) => ({
    ...p,
    local_role: roleMap.get(p.id),
  })) as TeamMember[];
}

export async function fetchNetworkMembers(): Promise<TeamMember[]> {
  const { data: branchRoles, error: rError } = await supabase
    .from('user_branch_roles')
    .select('user_id, branch_id, local_role')
    .eq('is_active', true);

  if (rError) throw rError;
  if (!branchRoles?.length) return [];

  const userIds = [...new Set(branchRoles.map((r) => r.user_id))];

  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (pError) throw pError;

  const { data: branches } = await supabase.from('branches').select('id, name');

  const branchMap = new Map(branches?.map((b) => [b.id, b.name]) || []);

  const members: TeamMember[] = [];
  branchRoles.forEach((role) => {
    const profile = profiles?.find((p) => p.id === role.user_id);
    if (!profile) return;

    members.push({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url || undefined,
      local_role: role.local_role || undefined,
      branch_id: role.branch_id,
      branch_name: branchMap.get(role.branch_id),
    });
  });

  return members;
}

// ─── Queries: Conflict Detection ───

export interface MeetingConflict {
  userId: string;
  userName: string;
  meetingTitle: string;
  meetingTime: string;
}

export async function checkMeetingConflicts(params: {
  date: Date;
  time: string;
  participantIds: string[];
}): Promise<MeetingConflict[]> {
  const { date, time, participantIds } = params;
  if (participantIds.length === 0) return [];

  const [hours, minutes] = time.split(':').map(Number);
  const meetingDate = new Date(date);
  meetingDate.setHours(hours, minutes, 0, 0);

  const startWindow = new Date(meetingDate);
  startWindow.setHours(startWindow.getHours() - 2);

  const endWindow = new Date(meetingDate);
  endWindow.setHours(endWindow.getHours() + 2);

  const { data: existingMeetings, error: mError } = await supabase
    .from('meetings')
    .select(
      `
      id,
      title,
      scheduled_at,
      participants:meeting_participants(user_id)
    `,
    )
    .in('status', ['convocada', 'en_curso'])
    .gte('scheduled_at', startWindow.toISOString())
    .lte('scheduled_at', endWindow.toISOString());

  if (mError) throw mError;
  if (!existingMeetings?.length) return [];

  const conflictingUserIds = new Set<string>();
  const conflictMap = new Map<string, { meetingTitle: string; meetingTime: string }>();

  existingMeetings.forEach((meeting) => {
    const meetingParticipantIds = (meeting.participants || []).map((p: any) => p.user_id);

    participantIds.forEach((participantId) => {
      if (meetingParticipantIds.includes(participantId)) {
        conflictingUserIds.add(participantId);
        conflictMap.set(participantId, {
          meetingTitle: meeting.title,
          meetingTime: meeting.scheduled_at,
        });
      }
    });
  });

  if (conflictingUserIds.size === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(conflictingUserIds));

  const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const conflicts: MeetingConflict[] = [];
  conflictingUserIds.forEach((userId) => {
    const conflict = conflictMap.get(userId);
    if (conflict) {
      conflicts.push({
        userId,
        userName: profileMap.get(userId) || 'Usuario desconocido',
        meetingTitle: conflict.meetingTitle,
        meetingTime: conflict.meetingTime,
      });
    }
  });

  return conflicts;
}
