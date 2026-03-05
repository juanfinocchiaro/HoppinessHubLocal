/**
 * configService - Supabase operations for branch/brand configuration
 * (shifts, closures, printers, kitchen stations, print config)
 */
import { supabase } from './supabaseClient';
import type { ClosureConfigItem, BranchClosureConfig, ConfigTipo } from '@/types/shiftClosure';

// ─── Types ─────────────────────────────────────────────────────

export interface BranchShiftConfig {
  shifts_morning_enabled: boolean;
  shifts_overnight_enabled: boolean;
}

export interface BranchPrinter {
  id: string;
  branch_id: string;
  name: string;
  connection_type: string;
  ip_address: string | null;
  port: number;
  paper_width: number;
  is_active: boolean;
  configured_from_network: string | null;
  created_at: string;
}

export interface KitchenStation {
  id: string;
  branch_id: string;
  name: string;
  icon: string;
  sort_order: number;
  kds_enabled: boolean;
  printer_id: string | null;
  print_on: string;
  print_copies: number;
  is_active: boolean;
  created_at: string;
}

export interface PrintConfig {
  id: string;
  branch_id: string;
  ticket_printer_id: string | null;
  ticket_enabled: boolean;
  ticket_trigger: string;
  delivery_printer_id: string | null;
  delivery_enabled: boolean;
  backup_printer_id: string | null;
  backup_enabled: boolean;
  reprint_requires_pin: boolean;
  comanda_printer_id: string | null;
  vale_printer_id: string | null;
  salon_vales_enabled: boolean;
  no_salon_todo_en_comanda: boolean;
  updated_at: string;
}

// ─── Shift Config ──────────────────────────────────────────────

export async function fetchBranchShiftConfig(
  branchId: string,
): Promise<BranchShiftConfig> {
  const { data, error } = await supabase
    .from('branches')
    .select('shifts_morning_enabled, shifts_overnight_enabled')
    .eq('id', branchId)
    .single();

  if (error) throw error;
  return data as BranchShiftConfig;
}

export async function updateBranchShiftConfig(
  branchId: string,
  config: Partial<BranchShiftConfig>,
): Promise<void> {
  const { error } = await supabase.from('branches').update(config).eq('id', branchId);
  if (error) throw error;
}

// ─── Closure Config ────────────────────────────────────────────

function toClosureConfigItem(row: any): ClosureConfigItem {
  return {
    id: row.id,
    type: (row.type ?? row.tipo) as ConfigTipo,
    key: row.key ?? row.clave,
    label: row.label ?? row.etiqueta,
    categoria_padre: row.categoria_padre,
    sort_order: row.sort_order ?? row.orden,
    is_active: row.is_active,
  };
}

export async function fetchBrandClosureConfig() {
  const { data, error } = await supabase
    .from('brand_closure_config')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;

  const config = {
    categorias: [] as ClosureConfigItem[],
    tipos: [] as ClosureConfigItem[],
    extras: [] as ClosureConfigItem[],
    apps: [] as ClosureConfigItem[],
    all: [] as ClosureConfigItem[],
  };

  (data || []).forEach((row) => {
    const item = toClosureConfigItem(row);
    config.all.push(item);
    switch (item.type) {
      case 'categoria_hamburguesa':
        config.categorias.push(item);
        break;
      case 'tipo_hamburguesa':
        config.tipos.push(item);
        break;
      case 'extra':
        config.extras.push(item);
        break;
      case 'app_delivery':
        config.apps.push(item);
        break;
    }
  });

  return config;
}

export async function fetchBranchClosureConfig(branchId: string) {
  const { data: branchConfig, error: configError } = await supabase
    .from('branch_closure_config')
    .select('*, brand_closure_config(*)')
    .eq('branch_id', branchId);

  if (configError) throw configError;

  const { data: brandApps, error: appsError } = await supabase
    .from('brand_closure_config')
    .select('*')
    .eq('tipo', 'app_delivery')
    .eq('is_active', true)
    .order('sort_order');

  if (appsError) throw appsError;

  const enabledApps = new Map<string, boolean>();

  (brandApps || []).forEach((row) => {
    enabledApps.set(row.clave, true);
  });

  (branchConfig || []).forEach((bc) => {
    const raw = bc.brand_closure_config as any;
    if (raw && raw.tipo === 'app_delivery') {
      enabledApps.set(raw.clave, bc.habilitado);
    }
  });

  return {
    branchConfig: branchConfig as (BranchClosureConfig & {
      brand_closure_config: ClosureConfigItem;
    })[],
    brandApps: (brandApps || []).map(toClosureConfigItem),
    enabledApps,
  };
}

export async function upsertBranchClosureConfig(params: {
  branchId: string;
  configId: string;
  habilitado: boolean;
}) {
  const { data, error } = await supabase
    .from('branch_closure_config')
    .upsert(
      {
        branch_id: params.branchId,
        config_id: params.configId,
        habilitado: params.habilitado,
      },
      {
        onConflict: 'branch_id,config_id',
      },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Branch Printers ───────────────────────────────────────────

export async function fetchBranchPrinters(branchId: string): Promise<BranchPrinter[]> {
  const { data, error } = await supabase
    .from('branch_printers')
    .select('*')
    .eq('branch_id', branchId)
    .order('name');
  if (error) throw error;
  return data as BranchPrinter[];
}

export async function createBranchPrinter(
  printer: Omit<BranchPrinter, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('branch_printers').insert(printer);
  if (error) throw error;
}

export async function updateBranchPrinter({
  id,
  ...data
}: Partial<BranchPrinter> & { id: string }): Promise<void> {
  const { error } = await supabase.from('branch_printers').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteBranchPrinter(id: string): Promise<void> {
  const { error } = await supabase.from('branch_printers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Kitchen Stations ──────────────────────────────────────────

export async function fetchKitchenStations(branchId: string): Promise<KitchenStation[]> {
  const { data, error } = await supabase
    .from('kitchen_stations')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data as KitchenStation[];
}

export async function createKitchenStation(
  station: Omit<KitchenStation, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('kitchen_stations').insert(station);
  if (error) throw error;
}

export async function updateKitchenStation({
  id,
  ...data
}: Partial<KitchenStation> & { id: string }): Promise<void> {
  const { error } = await supabase.from('kitchen_stations').update(data).eq('id', id);
  if (error) throw error;
}

export async function softDeleteKitchenStation(id: string): Promise<void> {
  const { error } = await supabase
    .from('kitchen_stations')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ─── Print Config ──────────────────────────────────────────────

export async function fetchPrintConfig(branchId: string): Promise<PrintConfig | null> {
  const { data, error } = await supabase
    .from('print_config')
    .select('*')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) throw error;
  return data as PrintConfig | null;
}

// ─── POS Config ────────────────────────────────────────────────

export async function fetchPosConfig(branchId: string) {
  try {
    const { data: row } = await supabase
      .from('pos_config')
      .select('pos_enabled')
      .eq('branch_id', branchId)
      .maybeSingle();
    return row;
  } catch {
    return null;
  }
}

// ─── Sidebar Order ─────────────────────────────────────────────

export async function fetchSidebarOrder() {
  const { data, error } = await supabase
    .from('brand_sidebar_order')
    .select('section_id, sort_order')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function upsertSidebarOrder(row: {
  section_id: string;
  sort_order: number;
  updated_at: string;
}) {
  const { error } = await supabase
    .from('brand_sidebar_order')
    .upsert(row, { onConflict: 'section_id' });
  if (error) throw error;
}

// ─── Contextual Help ───────────────────────────────────────────

export async function fetchHelpPreferences(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('help_dismissed_pages, show_floating_help')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as {
    help_dismissed_pages: string[] | null;
    show_floating_help: boolean | null;
  } | null;
}

export async function updateHelpDismissedPages(userId: string, pages: string[]) {
  const { error } = await supabase
    .from('profiles')
    .update({ help_dismissed_pages: pages })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateShowFloatingHelp(userId: string, show: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ show_floating_help: show })
    .eq('id', userId);
  if (error) throw error;
}

export async function upsertPrintConfig(
  branchId: string,
  config: Partial<PrintConfig>,
): Promise<void> {
  const { error } = await supabase
    .from('print_config')
    .upsert(
      { branch_id: branchId, ...config, updated_at: new Date().toISOString() },
      { onConflict: 'branch_id' },
    );
  if (error) throw error;
}

export async function fetchBranchNameOnly(branchId: string) {
  const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
  return data;
}

export async function fetchBranchSlugAndName(branchId: string) {
  const { data } = await supabase
    .from('branches')
    .select('slug, name')
    .eq('id', branchId)
    .single();
  return data;
}

export async function fetchAllBranchSlugs() {
  const { data } = await supabase.from('branches').select('id, name, slug').order('name');
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

export function subscribeToBranchStatusUpdates(
  branchId: string,
  callback: (payload: { new: Record<string, unknown> }) => void,
) {
  const channel = supabase
    .channel(`branch-status-${branchId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'branches',
        filter: `id=eq.${branchId}`,
      },
      callback,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
