import { differenceInMinutes } from 'date-fns';
import { supabase } from './supabaseClient';
import { getOperationalDateString } from '@/lib/operationalDate';

export async function fetchCurrentlyWorking(branchId: string) {
  // Primary: read from employee_time_state
  const { data: states, error: statesError } = await supabase
    .from('employee_time_state')
    .select('employee_id, last_updated')
    .eq('branch_id', branchId)
    .eq('current_state', 'working');

  if (statesError) throw statesError;

  if (states && states.length > 0) {
    const userIds = states.map((s) => s.employee_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return states.map((s) => ({
      id: s.employee_id,
      user_id: s.employee_id,
      check_in: s.last_updated,
      profile: profileMap.get(s.employee_id),
      minutesWorking: differenceInMinutes(new Date(), new Date(s.last_updated)),
    }));
  }

  // Legacy fallback: scan clock_entries
  const today = getOperationalDateString();
  const { data: entries, error } = await supabase
    .from('clock_entries')
    .select('user_id, entry_type, created_at')
    .eq('branch_id', branchId)
    .gte('created_at', today)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!entries?.length) return [];

  const userStatus = new Map<string, { type: string; time: string }>();
  entries.forEach((entry) => {
    userStatus.set(entry.user_id, {
      type: entry.entry_type,
      time: entry.created_at,
    });
  });

  const workingUserIds = [...userStatus.entries()]
    .filter(([_, value]) => value.type === 'clock_in')
    .map(([user_id, value]) => ({ user_id, clock_in: value.time }));

  if (!workingUserIds.length) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in(
      'id',
      workingUserIds.map((u) => u.user_id),
    );

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return workingUserIds.map((worker) => ({
    id: worker.user_id,
    user_id: worker.user_id,
    check_in: worker.clock_in,
    profile: profileMap.get(worker.user_id),
    minutesWorking: differenceInMinutes(new Date(), new Date(worker.clock_in)),
  }));
}

export async function fetchPendingItems(branchId: string) {
  const { count: pendingRequests } = await supabase
    .from('schedule_requests')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('status', 'pending');

  const { data: roles } = await supabase
    .from('user_roles_v2')
    .select('user_id, branch_ids')
    .not('local_role', 'is', null);

  const userIds = (roles || [])
    .filter((r) => Array.isArray(r.branch_ids) && r.branch_ids.includes(branchId))
    .map((r) => r.user_id);

  const { data: latestReg } = await supabase
    .from('regulations')
    .select('id, version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let pendingSignatures = 0;
  if (latestReg && userIds.length > 0) {
    const { data: signatures } = await supabase
      .from('regulation_signatures')
      .select('user_id')
      .eq('regulation_id', latestReg.id)
      .in('user_id', userIds);

    const signedUserIds = new Set(signatures?.map((s) => s.user_id) || []);
    pendingSignatures = userIds.filter((id) => !signedUserIds.has(id)).length;
  }

  let unreadComms = 0;
  if (userIds.length > 0) {
    const { data: comms } = await supabase
      .from('communications')
      .select('id, target_branch_ids')
      .eq('is_published', true);

    const branchComms = (comms || []).filter(
      (c) =>
        !c.target_branch_ids ||
        c.target_branch_ids.length === 0 ||
        c.target_branch_ids.includes(branchId),
    );

    if (branchComms.length > 0) {
      const commIds = branchComms.map((c) => c.id);
      const { data: reads } = await supabase
        .from('communication_reads')
        .select('communication_id, user_id')
        .in('communication_id', commIds)
        .in('user_id', userIds);

      const readSet = new Set((reads || []).map((r) => `${r.communication_id}_${r.user_id}`));

      for (const comm of branchComms) {
        for (const userId of userIds) {
          if (!readSet.has(`${comm.id}_${userId}`)) unreadComms++;
        }
      }
    }
  }

  return {
    pendingRequests: pendingRequests || 0,
    unreadComms,
    pendingSignatures,
    total: (pendingRequests || 0) + unreadComms + pendingSignatures,
  };
}

export async function fetchPosSalesToday(branchId: string) {
  const today = getOperationalDateString();
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, total, estado, created_at')
    .eq('branch_id', branchId)
    .gte('created_at', today)
    .not('estado', 'eq', 'cancelado');

  if (error) throw error;
  const pedidos = data || [];
  const totalVendido = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const cantidad = pedidos.length;
  const ticketPromedio = cantidad > 0 ? totalVendido / cantidad : 0;
  return { totalVendido, cantidad, ticketPromedio };
}
