import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';

export async function fetchPublicBranches() {
  const { data, error } = await supabase
    .from('branches_public')
    .select(
      'id, name, address, city, opening_time, closing_time, public_status, public_hours, latitude, longitude',
    )
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchPublicBranchNames() {
  const { data } = await supabase
    .from('branches_public')
    .select('id, name, public_status')
    .order('name');
  return data || [];
}

export async function fetchPublicBranchIdAndName() {
  const { data } = await supabase
    .from('branches_public')
    .select('id, name')
    .order('name');
  return data || [];
}

export async function fetchActiveBranches() {
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  return data || [];
}

export async function fetchBranchesForPedir() {
  const { data: branches, error: bErr } = await supabase
    .from('branches_public')
    .select(
      'id, name, address, city, slug, public_status, cover_image_url, latitude, longitude, opening_time, closing_time, public_hours',
    )
    .in('public_status', ['active', 'coming_soon'])
    .order('name');

  if (bErr) throw bErr;

  const branchIds = (branches || []).map((b: any) => b.id).filter(Boolean);
  const configMap: Record<string, any> = {};

  if (branchIds.length > 0) {
    const { data: configs, error: configErr } = await fromUntyped('webapp_config')
      .select(
        'branch_id, webapp_activa, estado, delivery_habilitado, retiro_habilitado, delivery_costo, tiempo_estimado_retiro_min, tiempo_estimado_delivery_min',
      )
      .in('branch_id', branchIds);

    if (configErr) {
      console.warn('[fetchBranchesForPedir] webapp_config query failed, using defaults:', configErr.message);
    } else if (configs) {
      (configs as unknown as Array<Record<string, unknown>>).forEach((c) => {
        configMap[c.branch_id as string] = c;
      });
    }
  }

  return { branches: branches || [], configMap };
}
