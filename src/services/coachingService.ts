import { supabase } from './supabaseClient';
import type {
  CoachingWithDetails,
  CoachingFormData,
  CoachingStationScore,
  CoachingCompetencyScore,
  CertificationLevel,
  EmployeeCertificationWithStation,
} from '@/types/coaching';

// ── Shared filter / data interfaces ────────────────────────────────

export interface CoachingFilters {
  branchId?: string;
  userId?: string;
  month?: number;
  year?: number;
}

export interface CoachingStats {
  totalEmployees: number;
  coachingsThisMonth: number;
  pendingCoachings: number;
  pendingAcknowledgments: number;
  completionRate: number;
  averageScore: number | null;
  employeesWithoutCoaching: string[];
  totalManagers: number;
  managersWithCoaching: number;
  pendingManagerCoachings: number;
  managersWithoutCoaching: string[];
}

export interface CertificationFilters {
  branchId?: string;
  userId?: string;
  stationId?: string;
}

export interface UpsertCertificationData {
  userId: string;
  branchId: string;
  stationId: string;
  level: CertificationLevel;
  notes?: string;
}

// ── Coaching queries ───────────────────────────────────────────────

export async function fetchCoachings(
  filters: CoachingFilters,
): Promise<CoachingWithDetails[]> {
  const { branchId, userId, month, year } = filters;

  let query = supabase
    .from('coachings')
    .select('*')
    .order('coaching_date', { ascending: false })
    .limit(100);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (month) {
    query = query.eq('coaching_month', month);
  }
  if (year) {
    query = query.eq('coaching_year', year);
  }

  const { data, error } = await query;
  if (error) throw error;

  const userIds = [
    ...new Set([...data.map((c) => c.user_id), ...data.map((c) => c.evaluated_by)]),
  ];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return data.map((coaching) => ({
    ...coaching,
    employee: profileMap.get(coaching.user_id),
    evaluator: profileMap.get(coaching.evaluated_by),
  })) as CoachingWithDetails[];
}

export async function fetchCoachingDetails(
  coachingId: string,
): Promise<CoachingWithDetails | null> {
  if (!coachingId) return null;

  const { data: coaching, error: coachingError } = await supabase
    .from('coachings')
    .select('*')
    .eq('id', coachingId)
    .single();

  if (coachingError) throw coachingError;

  const { data: stationScores } = await supabase
    .from('coaching_station_scores')
    .select('*')
    .eq('coaching_id', coachingId);

  const { data: competencyScores } = await supabase
    .from('coaching_competency_scores')
    .select('*')
    .eq('coaching_id', coachingId);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', [coaching.user_id, coaching.evaluated_by]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return {
    ...coaching,
    employee: profileMap.get(coaching.user_id),
    evaluator: profileMap.get(coaching.evaluated_by),
    station_scores: stationScores as CoachingStationScore[],
    competency_scores: competencyScores as CoachingCompetencyScore[],
  };
}

export async function fetchEmployeeCoachings(
  userId: string,
  branchId: string | null,
): Promise<CoachingWithDetails[]> {
  if (!userId) return [];

  let query = supabase
    .from('coachings')
    .select('*')
    .eq('user_id', userId)
    .order('coaching_year', { ascending: false })
    .order('coaching_month', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const evaluatorIds = [...new Set(data.map((c) => c.evaluated_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', evaluatorIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return data.map((coaching) => ({
    ...coaching,
    evaluator: profileMap.get(coaching.evaluated_by),
  })) as CoachingWithDetails[];
}

// ── Coaching mutations ─────────────────────────────────────────────

export async function createCoaching(
  formData: CoachingFormData & { previousActionReview?: string },
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('No autenticado');
  }

  const coachingDate = formData.coachingDate;
  const month = coachingDate.getMonth() + 1;
  const year = coachingDate.getFullYear();

  const stationAvg =
    formData.stationScores.length > 0
      ? formData.stationScores.reduce((sum, s) => sum + s.score, 0) /
        formData.stationScores.length
      : null;

  const generalAvg =
    formData.generalScores.length > 0
      ? formData.generalScores.reduce((sum, s) => sum + s.score, 0) /
        formData.generalScores.length
      : null;

  const overallAvg =
    stationAvg && generalAvg ? (stationAvg + generalAvg) / 2 : stationAvg || generalAvg;

  const { data: coaching, error: coachingError } = await supabase
    .from('coachings')
    .insert({
      user_id: formData.userId,
      branch_id: formData.branchId,
      evaluated_by: session.session.user.id,
      coaching_date: coachingDate.toISOString().split('T')[0],
      coaching_month: month,
      coaching_year: year,
      station_score: stationAvg ? Number(stationAvg.toFixed(2)) : null,
      general_score: generalAvg ? Number(generalAvg.toFixed(2)) : null,
      overall_score: overallAvg ? Number(overallAvg.toFixed(2)) : null,
      strengths: formData.strengths || null,
      areas_to_improve: formData.areasToImprove || null,
      action_plan: formData.actionPlan || null,
      manager_notes: formData.managerNotes || null,
      previous_action_review: formData.previousActionReview || null,
    })
    .select()
    .single();

  if (coachingError) throw coachingError;

  if (formData.stationScores.length > 0) {
    const stationScoresData = formData.stationScores.map((s) => ({
      coaching_id: coaching.id,
      station_id: s.stationId,
      score: s.score,
    }));

    const { error: stationError } = await supabase
      .from('coaching_station_scores')
      .insert(stationScoresData);

    if (stationError) throw stationError;

    const competencyScoresData = formData.stationScores.flatMap((s) =>
      s.competencyScores.map((c) => ({
        coaching_id: coaching.id,
        competency_type: 'station' as const,
        competency_id: c.competencyId,
        score: c.score,
      })),
    );

    if (competencyScoresData.length > 0) {
      const { error: compError } = await supabase
        .from('coaching_competency_scores')
        .insert(competencyScoresData);

      if (compError) throw compError;
    }
  }

  if (formData.generalScores.length > 0) {
    const generalScoresData = formData.generalScores.map((g) => ({
      coaching_id: coaching.id,
      competency_type: 'general' as const,
      competency_id: g.competencyId,
      score: g.score,
    }));

    const { error: generalError } = await supabase
      .from('coaching_competency_scores')
      .insert(generalScoresData);

    if (generalError) throw generalError;
  }

  if (formData.certificationChanges.length > 0) {
    const certUpdates = formData.certificationChanges.map((c) => ({
      user_id: formData.userId,
      branch_id: formData.branchId,
      station_id: c.stationId,
      level: c.newLevel,
      certified_by: session.session.user.id,
      certified_at: c.newLevel >= 2 ? new Date().toISOString() : null,
    }));

    const { error: certError } = await supabase
      .from('employee_certifications')
      .upsert(certUpdates, {
        onConflict: 'user_id,branch_id,station_id',
      });

    if (certError) throw certError;
  }

  return coaching;
}

export async function acknowledgeCoaching(coachingId: string, notes?: string) {
  const { data, error } = await supabase
    .from('coachings')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_notes: notes || null,
    })
    .eq('id', coachingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Coaching stats queries ─────────────────────────────────────────

const EMPTY_COACHING_STATS: CoachingStats = {
  totalEmployees: 0,
  coachingsThisMonth: 0,
  pendingCoachings: 0,
  pendingAcknowledgments: 0,
  completionRate: 0,
  averageScore: null,
  employeesWithoutCoaching: [],
  totalManagers: 0,
  managersWithCoaching: 0,
  pendingManagerCoachings: 0,
  managersWithoutCoaching: [],
};

export async function fetchCoachingStats(
  branchId: string,
  currentMonth: number,
  currentYear: number,
): Promise<CoachingStats> {
  if (!branchId) return EMPTY_COACHING_STATS;

  const { data: employeeRoles, error: rolesError } = await supabase
    .from('user_branch_roles')
    .select('user_id, local_role')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('local_role', ['empleado', 'cajero', 'encargado']);

  if (rolesError) throw rolesError;

  const employeeIds =
    employeeRoles?.filter((r) => r.local_role !== 'encargado').map((r) => r.user_id) ?? [];
  const managerIds =
    employeeRoles?.filter((r) => r.local_role === 'encargado').map((r) => r.user_id) ?? [];
  const totalEmployees = employeeIds.length;
  const totalManagers = managerIds.length;

  if (totalEmployees === 0 && totalManagers === 0) {
    return EMPTY_COACHING_STATS;
  }

  const { data: coachings, error: coachingsError } = await supabase
    .from('coachings')
    .select('user_id, overall_score, acknowledged_at')
    .eq('branch_id', branchId)
    .eq('coaching_month', currentMonth)
    .eq('coaching_year', currentYear);

  if (coachingsError) throw coachingsError;

  const employeeCoachings = coachings?.filter((c) => employeeIds.includes(c.user_id)) ?? [];
  const managerCoachings = coachings?.filter((c) => managerIds.includes(c.user_id)) ?? [];

  const coachingsThisMonth = employeeCoachings.length;
  const employeesWithCoaching = new Set(employeeCoachings.map((c) => c.user_id));
  const employeesWithoutCoaching = employeeIds.filter((id) => !employeesWithCoaching.has(id));
  const pendingCoachings = employeesWithoutCoaching.length;
  const pendingAcknowledgments = employeeCoachings.filter((c) => !c.acknowledged_at).length;

  const managersWithCoachingCount = managerCoachings.length;
  const managersWithCoachingSet = new Set(managerCoachings.map((c) => c.user_id));
  const managersWithoutCoaching = managerIds.filter((id) => !managersWithCoachingSet.has(id));
  const pendingManagerCoachings = managersWithoutCoaching.length;

  const scoresWithValues = employeeCoachings.filter((c) => c.overall_score !== null);
  const averageScore =
    scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, c) => sum + (c.overall_score || 0), 0) /
        scoresWithValues.length
      : null;

  const completionRate =
    totalEmployees > 0 ? Math.round((coachingsThisMonth / totalEmployees) * 100) : 0;

  return {
    totalEmployees,
    coachingsThisMonth,
    pendingCoachings,
    pendingAcknowledgments,
    completionRate,
    averageScore: averageScore ? Number(averageScore.toFixed(2)) : null,
    employeesWithoutCoaching,
    totalManagers,
    managersWithCoaching: managersWithCoachingCount,
    pendingManagerCoachings,
    managersWithoutCoaching,
  };
}

export async function checkHasCoachingThisMonth(
  userId: string,
  branchId: string,
  currentMonth: number,
  currentYear: number,
): Promise<boolean> {
  if (!userId || !branchId) return false;

  const { count, error } = await supabase
    .from('coachings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .eq('coaching_month', currentMonth)
    .eq('coaching_year', currentYear);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function fetchMyPendingCoachings() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return [];

  const { data, error } = await supabase
    .from('coachings')
    .select(
      `
      id,
      coaching_date,
      coaching_month,
      coaching_year,
      overall_score,
      strengths,
      areas_to_improve
    `,
    )
    .eq('user_id', session.session.user.id)
    .is('acknowledged_at', null)
    .order('coaching_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchEmployeeScoreHistory(
  userId: string,
  branchId: string,
  months: number = 6,
) {
  if (!userId || !branchId) return [];

  const { data, error } = await supabase
    .from('coachings')
    .select('coaching_month, coaching_year, overall_score, station_score, general_score')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .not('overall_score', 'is', null)
    .order('coaching_year', { ascending: false })
    .order('coaching_month', { ascending: false })
    .limit(months);

  if (error) throw error;
  return data.reverse();
}

// ── Certification queries ──────────────────────────────────────────

export async function fetchCertifications(
  filters: CertificationFilters,
): Promise<EmployeeCertificationWithStation[]> {
  let query = supabase
    .from('employee_certifications')
    .select(
      `
      *,
      station:work_stations(*)
    `,
    )
    .order('created_at', { ascending: false });

  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.stationId) {
    query = query.eq('station_id', filters.stationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as EmployeeCertificationWithStation[];
}

export async function fetchEmployeeCertifications(
  userId: string,
  branchId: string,
): Promise<EmployeeCertificationWithStation[]> {
  if (!userId || !branchId) return [];

  const { data, error } = await supabase
    .from('employee_certifications')
    .select(
      `
      *,
      station:work_stations(*)
    `,
    )
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .order('created_at');

  if (error) throw error;
  return data as EmployeeCertificationWithStation[];
}

export async function fetchTeamCertifications(branchId: string) {
  if (!branchId) return { certifications: [] as EmployeeCertificationWithStation[], byUser: {} };

  const { data, error } = await supabase
    .from('employee_certifications')
    .select(
      `
      *,
      station:work_stations(*)
    `,
    )
    .eq('branch_id', branchId)
    .order('user_id')
    .order('station_id');

  if (error) throw error;

  const byUser = (data as EmployeeCertificationWithStation[]).reduce(
    (acc, cert) => {
      if (!acc[cert.user_id]) {
        acc[cert.user_id] = {};
      }
      acc[cert.user_id][cert.station_id] = cert;
      return acc;
    },
    {} as Record<string, Record<string, EmployeeCertificationWithStation>>,
  );

  return {
    certifications: data as EmployeeCertificationWithStation[],
    byUser,
  };
}

// ── Certification mutations ────────────────────────────────────────

export async function upsertCertification(data: UpsertCertificationData) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('No autenticado');
  }

  const certificationData = {
    user_id: data.userId,
    branch_id: data.branchId,
    station_id: data.stationId,
    level: data.level,
    notes: data.notes || null,
    certified_by: session.session.user.id,
    certified_at: data.level >= 2 ? new Date().toISOString() : null,
  };

  const { data: result, error } = await supabase
    .from('employee_certifications')
    .upsert(certificationData, {
      onConflict: 'user_id,branch_id,station_id',
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

// ── Network coaching stats ─────────────────────────────────────────

export async function fetchActiveBranches() {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function fetchStaffRolesByBranches(branchIds: string[]) {
  const { data, error } = await supabase
    .from('user_branch_roles')
    .select('user_id, branch_id')
    .in('branch_id', branchIds)
    .in('local_role', ['empleado', 'cajero'])
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function fetchCoachingsByBranchesAndMonth(
  branchIds: string[],
  month: number,
  year: number,
) {
  const { data, error } = await supabase
    .from('coachings')
    .select('id, user_id, branch_id, overall_score, acknowledged_at')
    .in('branch_id', branchIds)
    .eq('coaching_month', month)
    .eq('coaching_year', year);
  if (error) throw error;
  return data || [];
}

export async function fetchProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

export async function fetchCoachingScoresByBranchesAndMonth(
  branchIds: string[],
  month: number,
  year: number,
) {
  const { data, error } = await supabase
    .from('coachings')
    .select('overall_score')
    .in('branch_id', branchIds)
    .eq('coaching_month', month)
    .eq('coaching_year', year);
  if (error) throw error;
  return data || [];
}

// ── Team coaching analysis ─────────────────────────────────────────

export async function fetchBranchCoachingsLast6Months(branchId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data, error } = await supabase
    .from('coachings')
    .select('user_id, overall_score, coaching_month, coaching_year')
    .eq('branch_id', branchId)
    .gte('coaching_date', sixMonthsAgo.toISOString().split('T')[0])
    .order('coaching_year', { ascending: false })
    .order('coaching_month', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchStationScoresByBranch(branchId: string) {
  const { data, error } = await supabase
    .from('coaching_station_scores')
    .select(
      `
      station_id,
      score,
      coaching:coachings!inner(user_id, branch_id)
    `,
    )
    .eq('coaching.branch_id', branchId);
  if (error) throw error;
  return data || [];
}

export async function fetchActiveWorkStations() {
  const { data, error } = await supabase
    .from('work_stations')
    .select('id, name, key')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function fetchCompetencyScoresByBranch(branchId: string) {
  const { data, error } = await supabase
    .from('coaching_competency_scores')
    .select(
      `
      competency_id,
      score,
      competency_type,
      coaching:coachings!inner(user_id, branch_id)
    `,
    )
    .eq('coaching.branch_id', branchId)
    .eq('competency_type', 'general');
  if (error) throw error;
  return data || [];
}

export async function fetchActiveGeneralCompetencies() {
  const { data, error } = await supabase
    .from('general_competencies')
    .select('id, name, key')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function fetchEmployeeCoachingComparison(userId: string, branchId: string) {
  const { data: myScores } = await supabase
    .from('coachings')
    .select('overall_score, coaching_month, coaching_year')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .not('overall_score', 'is', null)
    .order('coaching_year', { ascending: true })
    .order('coaching_month', { ascending: true })
    .limit(6);

  const { data: allScores } = await supabase
    .from('coachings')
    .select('overall_score, coaching_month, coaching_year, user_id')
    .eq('branch_id', branchId)
    .not('overall_score', 'is', null);

  return { myScores: myScores || [], allScores: allScores || [] };
}

// ── Managers coaching list ─────────────────────────────────────────

export async function fetchManagerRoles(branchId?: string) {
  let query = supabase
    .from('user_branch_roles')
    .select('user_id, branch_id')
    .eq('local_role', 'encargado')
    .eq('is_active', true);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchBranchesByIds(branchIds: string[]) {
  if (branchIds.length === 0) return [];
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .in('id', branchIds);
  if (error) throw error;
  return data || [];
}

export async function fetchCoachingsByUsersAndMonth(
  userIds: string[],
  month: number,
  year: number,
) {
  const { data, error } = await supabase
    .from('coachings')
    .select(
      'id, user_id, branch_id, coaching_date, overall_score, acknowledged_at, evaluated_by',
    )
    .in('user_id', userIds)
    .eq('coaching_month', month)
    .eq('coaching_year', year);
  if (error) throw error;
  return data || [];
}

export async function fetchCoachingScoresByUsersAndMonth(
  userIds: string[],
  month: number,
  year: number,
) {
  const { data, error } = await supabase
    .from('coachings')
    .select('user_id, branch_id, overall_score')
    .in('user_id', userIds)
    .eq('coaching_month', month)
    .eq('coaching_year', year);
  if (error) throw error;
  return data || [];
}

// ── Station & competency config ────────────────────────────────────

export async function fetchAllWorkStations() {
  const { data, error } = await supabase
    .from('work_stations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchStationCompetencies(stationId: string) {
  const { data, error } = await supabase
    .from('station_competencies')
    .select('*')
    .eq('station_id', stationId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchAllStationCompetencies() {
  const { data, error } = await supabase
    .from('station_competencies')
    .select('*')
    .eq('is_active', true)
    .order('station_id')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchAllGeneralCompetencies() {
  const { data, error } = await supabase
    .from('general_competencies')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchManagerCompetencies() {
  const { data, error } = await supabase
    .from('manager_competencies')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchBranchNameForCoaching(branchId: string) {
  const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
  return data;
}

export async function fetchCoachingTeamMembers(branchId: string, excludeUserId?: string) {
  const { data: roles, error: rolesError } = await supabase
    .from('user_branch_roles')
    .select('user_id, local_role')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('local_role', ['empleado', 'cajero']);

  if (rolesError) throw rolesError;

  const userIds = roles?.map((r) => r.user_id).filter((id) => id !== excludeUserId) ?? [];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  return (
    profiles?.map((p) => ({
      ...p,
      local_role: roles.find((r) => r.user_id === p.id)?.local_role || 'empleado',
    })) ?? []
  );
}

export async function fetchEmployeesWithCoachingCounts(branchId: string) {
  const { data: roles, error: rolesError } = await supabase
    .from('user_branch_roles')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .in('local_role', ['empleado', 'cajero']);

  if (rolesError) throw rolesError;

  const userIds = roles?.map((r) => r.user_id) ?? [];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const { data: coachings, error: coachingsError } = await supabase
    .from('coachings')
    .select('user_id, overall_score, coaching_year, coaching_month')
    .eq('branch_id', branchId)
    .in('user_id', userIds)
    .order('coaching_year', { ascending: false })
    .order('coaching_month', { ascending: false });

  if (coachingsError) throw coachingsError;

  const userCoachings = new Map<string, { count: number; latestScore: number | null }>();
  coachings?.forEach((c) => {
    const existing = userCoachings.get(c.user_id);
    if (!existing) {
      userCoachings.set(c.user_id, { count: 1, latestScore: c.overall_score });
    } else {
      userCoachings.set(c.user_id, { ...existing, count: existing.count + 1 });
    }
  });

  return (
    profiles
      ?.map((p) => ({
        ...p,
        coaching_count: userCoachings.get(p.id)?.count ?? 0,
        latest_score: userCoachings.get(p.id)?.latestScore ?? null,
      }))
      .sort((a, b) => b.coaching_count - a.coaching_count) ?? []
  );
}

export async function fetchOwnCoachings(userId: string, branchId: string) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('coachings')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .order('coaching_year', { ascending: false })
    .order('coaching_month', { ascending: false });

  if (error) throw error;

  const evaluatorIds = [...new Set(data.map((c) => c.evaluated_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', evaluatorIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return data.map((c) => ({
    ...c,
    evaluator: profileMap.get(c.evaluated_by) || null,
  }));
}

export async function fetchBranchManager(branchId: string) {
  const { data: roles, error } = await supabase
    .from('user_branch_roles')
    .select('user_id')
    .eq('branch_id', branchId)
    .eq('local_role', 'encargado')
    .eq('is_active', true)
    .limit(1);

  if (error || !roles?.length) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', roles[0].user_id)
    .single();

  return profile;
}

export async function fetchManagerCoachings(managerId: string, branchId: string) {
  if (!managerId) return [];

  const { data, error } = await supabase
    .from('coachings')
    .select('*')
    .eq('user_id', managerId)
    .eq('branch_id', branchId)
    .order('coaching_year', { ascending: false })
    .order('coaching_month', { ascending: false });

  if (error) throw error;

  const evaluatorIds = [...new Set(data.map((c) => c.evaluated_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', evaluatorIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return data.map((c) => ({
    ...c,
    evaluator: profileMap.get(c.evaluated_by) || null,
  }));
}

export async function batchUpdateCertifications(updates: UpsertCertificationData[]) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('No autenticado');
  }

  const certificationsData = updates.map((data) => ({
    user_id: data.userId,
    branch_id: data.branchId,
    station_id: data.stationId,
    level: data.level,
    notes: data.notes || null,
    certified_by: session.session.user.id,
    certified_at: data.level >= 2 ? new Date().toISOString() : null,
  }));

  const { data: result, error } = await supabase
    .from('employee_certifications')
    .upsert(certificationsData, {
      onConflict: 'user_id,branch_id,station_id',
    })
    .select();

  if (error) throw error;
  return result;
}
