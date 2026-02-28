import { supabase } from './supabaseClient';
import type {
  Communication,
  CommunicationReader,
  CommunicationWithSource,
} from '@/types/communications';

export async function fetchCommunicationReaders(communicationId: string) {
  const { data: reads, error } = await supabase
    .from('communication_reads')
    .select('user_id, read_at, confirmed_at')
    .eq('communication_id', communicationId);

  if (error) throw error;
  if (!reads?.length) return { readers: [] as CommunicationReader[], totalTargeted: 0 };

  const userIds = reads.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const readers = reads.map((reader) => ({
    ...reader,
    profile: profileMap.get(reader.user_id) || null,
  })) as CommunicationReader[];

  return {
    readers: readers.sort(
      (a, b) => new Date(b.read_at || 0).getTime() - new Date(a.read_at || 0).getTime(),
    ),
    totalTargeted: readers.length,
  };
}

export async function listCommunications(limit = 100): Promise<Communication[]> {
  const { data, error } = await supabase
    .from('communications')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Communication[];
}

export async function listUserCommunications(userId: string): Promise<{
  brand: CommunicationWithSource[];
  local: CommunicationWithSource[];
}> {
  const { data: userBranches, error: branchError } = await supabase
    .from('user_branch_roles')
    .select('branch_id, local_role')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (branchError) throw branchError;

  const userBranchIds = new Set(userBranches?.map((b) => b.branch_id) || []);
  const userLocalRoles = new Set<string>(userBranches?.map((b) => b.local_role).filter(Boolean) || []);

  const { data: comms, error: commsError } = await supabase
    .from('communications')
    .select('*, branches:source_branch_id(name)')
    .eq('is_published', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('published_at', { ascending: false })
    .limit(100);
  if (commsError) throw commsError;

  const { data: reads, error: readsError } = await supabase
    .from('communication_reads')
    .select('communication_id, confirmed_at')
    .eq('user_id', userId);
  if (readsError) throw readsError;

  const readMap = new Map(reads?.map((r) => [r.communication_id, r]) || []);

  const allComms = (comms || []).map((c) => {
    const readRecord = readMap.get(c.id);
    const branches = c.branches as { name?: string } | null;
    return {
      ...c,
      is_read: !!readRecord,
      is_confirmed: !!readRecord?.confirmed_at,
      branch_name: branches?.name || null,
    };
  }) as CommunicationWithSource[];

  const brand = allComms.filter((c) => {
    if (c.source_type !== 'brand') return false;
    if (!c.target_roles || c.target_roles.length === 0) return true;
    return c.target_roles.some((role) => userLocalRoles.has(role));
  });

  const local = allComms.filter(
    (c) => c.source_type === 'local' && c.source_branch_id && userBranchIds.has(c.source_branch_id),
  );

  return { brand, local };
}

export async function markCommunicationAsRead(userId: string, communicationId: string) {
  const { error } = await supabase.from('communication_reads').insert({
    communication_id: communicationId,
    user_id: userId,
  });

  if (error && !error.message.includes('duplicate')) throw error;
}

export async function confirmCommunication(userId: string, communicationId: string) {
  const { error } = await supabase
    .from('communication_reads')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('communication_id', communicationId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function createCommunication(
  userId: string,
  data: {
    title: string;
    body: string;
    type: Communication['type'];
    target_branch_ids?: string[];
    target_roles?: string[];
    expires_at?: string;
  },
) {
  const { error } = await supabase.from('communications').insert({
    ...data,
    created_by: userId,
  });
  if (error) throw error;
}

export async function deleteCommunication(id: string) {
  const { error } = await supabase.from('communications').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchBranchForComms(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', branchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchBranchTeamForComms(branchId: string) {
  const { data, error } = await supabase
    .from('user_branch_roles')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('is_active', true);

  if (error) throw error;

  const userIds = data?.map((r) => r.user_id) || [];
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name');

  return (profiles || []).map((p) => ({ user_id: p.id, full_name: p.full_name }));
}

export async function fetchLocalCommunications(branchId: string) {
  const { data, error } = await supabase
    .from('communications')
    .select('*, communication_reads(user_id)')
    .eq('source_type', 'local')
    .eq('source_branch_id', branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createLocalCommunication(data: {
  title: string;
  body: string;
  type: string;
  branchId: string;
  createdBy: string;
  targetRoles?: string[];
}) {
  const insertData: Record<string, unknown> = {
    title: data.title,
    body: data.body,
    type: data.type,
    tag: 'operativo',
    source_type: 'local',
    source_branch_id: data.branchId,
    created_by: data.createdBy,
    is_published: true,
    published_at: new Date().toISOString(),
  };

  if (data.targetRoles && data.targetRoles.length > 0) {
    insertData.target_roles = data.targetRoles;
  }

  const { error } = await supabase.from('communications').insert(insertData);
  if (error) throw error;
}

export async function deleteLocalCommunication(id: string) {
  const { error } = await supabase.from('communications').delete().eq('id', id);
  if (error) throw error;
}

/** Fetch urgent unread communications for a user (by role) */
export async function fetchUrgentUnreadCommunications(
  userId: string,
  userLocalRoles: Set<string>,
): Promise<Array<{ id: string; title: string }>> {
  const { data: urgentComms, error: commsError } = await supabase
    .from('communications')
    .select('id, title, target_roles')
    .eq('type', 'urgent')
    .eq('is_published', true);

  if (commsError) throw commsError;
  if (!urgentComms?.length) return [];

  const filteredComms = urgentComms.filter((c) => {
    if (!c.target_roles || c.target_roles.length === 0) return true;
    return c.target_roles.some((role: string) => userLocalRoles.has(role));
  });

  const { data: reads } = await supabase
    .from('communication_reads')
    .select('communication_id')
    .eq('user_id', userId);

  const readIds = new Set(reads?.map((r) => r.communication_id) || []);

  return filteredComms.filter((c) => !readIds.has(c.id));
}
