import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { ClosureConfigItem, BranchClosureConfig } from '@/types/shiftClosure';

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
  return apiGet<BranchShiftConfig>(`/config/branches/${branchId}/shift-config`);
}

export async function updateBranchShiftConfig(
  branchId: string,
  config: Partial<BranchShiftConfig>,
): Promise<void> {
  return apiPut(`/config/branches/${branchId}/shift-config`, config);
}

// ─── Closure Config ────────────────────────────────────────────

export async function fetchBrandClosureConfig() {
  return apiGet<{
    categorias: ClosureConfigItem[];
    tipos: ClosureConfigItem[];
    extras: ClosureConfigItem[];
    apps: ClosureConfigItem[];
    all: ClosureConfigItem[];
  }>('/config/brand-closure-config');
}

export async function fetchBranchClosureConfig(branchId: string) {
  return apiGet<{
    branchConfig: (BranchClosureConfig & {
      brand_closure_config: ClosureConfigItem;
    })[];
    brandApps: ClosureConfigItem[];
    enabledApps: Record<string, boolean>;
  }>(`/config/branches/${branchId}/closure-config`);
}

export async function upsertBranchClosureConfig(params: {
  branchId: string;
  configId: string;
  habilitado: boolean;
}) {
  return apiPost(`/config/branches/${params.branchId}/closure-config`, params);
}

// ─── Branch Printers ───────────────────────────────────────────

export async function fetchBranchPrinters(branchId: string): Promise<BranchPrinter[]> {
  return apiGet<BranchPrinter[]>(`/branches/${branchId}/printers`);
}

export async function createBranchPrinter(
  printer: Omit<BranchPrinter, 'id' | 'created_at'>,
): Promise<void> {
  return apiPost(`/branches/${printer.branch_id}/printers`, printer);
}

export async function updateBranchPrinter({
  id,
  ...data
}: Partial<BranchPrinter> & { id: string }): Promise<void> {
  return apiPut(`/branches/printers/${id}`, data);
}

export async function deleteBranchPrinter(id: string): Promise<void> {
  return apiDelete(`/branches/printers/${id}`);
}

// ─── Kitchen Stations ──────────────────────────────────────────

export async function fetchKitchenStations(branchId: string): Promise<KitchenStation[]> {
  return apiGet<KitchenStation[]>(`/branches/${branchId}/stations`);
}

export async function createKitchenStation(
  station: Omit<KitchenStation, 'id' | 'created_at'>,
): Promise<void> {
  return apiPost(`/branches/${station.branch_id}/stations`, station);
}

export async function updateKitchenStation({
  id,
  ...data
}: Partial<KitchenStation> & { id: string }): Promise<void> {
  return apiPut(`/branches/stations/${id}`, data);
}

export async function softDeleteKitchenStation(id: string): Promise<void> {
  return apiDelete(`/branches/stations/${id}`);
}

// ─── Print Config ──────────────────────────────────────────────

export async function fetchPrintConfig(branchId: string): Promise<PrintConfig | null> {
  return apiGet<PrintConfig | null>(`/config/branches/${branchId}/print-config`);
}

// ─── POS Config ────────────────────────────────────────────────

export async function fetchPosConfig(branchId: string) {
  try {
    return await apiGet<{ pos_enabled: boolean } | null>(`/branches/${branchId}/pos-config`);
  } catch {
    return null;
  }
}

// ─── Sidebar Order ─────────────────────────────────────────────

export async function fetchSidebarOrder() {
  return apiGet<{ section_id: string; sort_order: number }[]>('/config/sidebar-order');
}

export async function upsertSidebarOrder(row: {
  section_id: string;
  sort_order: number;
  updated_at: string;
}) {
  return apiPost('/config/sidebar-order', row);
}

// ─── Contextual Help ───────────────────────────────────────────

export async function fetchHelpPreferences(userId: string) {
  return apiGet<{
    help_dismissed_pages: string[] | null;
    show_floating_help: boolean | null;
  } | null>(`/config/users/${userId}/help-preferences`);
}

export async function updateHelpDismissedPages(userId: string, pages: string[]) {
  return apiPut(`/config/users/${userId}/help-preferences/dismissed-pages`, { pages });
}

export async function updateShowFloatingHelp(userId: string, show: boolean) {
  return apiPut(`/config/users/${userId}/help-preferences/floating-help`, { show });
}

export async function upsertPrintConfig(
  branchId: string,
  config: Partial<PrintConfig>,
): Promise<void> {
  return apiPost(`/config/branches/${branchId}/print-config`, config);
}

export async function fetchBranchNameOnly(branchId: string) {
  return apiGet<{ name: string } | null>(`/branches/${branchId}/name`);
}

export async function fetchBranchSlugAndName(branchId: string) {
  return apiGet<{ slug: string; name: string } | null>(`/branches/${branchId}/slug`);
}

export async function fetchAllBranchSlugs() {
  return apiGet<{ id: string; name: string; slug: string }[]>('/branches/slugs');
}

export async function fetchBranchesByIds(branchIds: string[]) {
  if (branchIds.length === 0) return [];
  return apiPost<{ id: string; name: string }[]>('/branches/by-ids', { branchIds });
}

import { subscribeToEvent } from '@/hooks/useSocket';

export function subscribeToBranchStatusUpdates(branchId: string, callback: (payload: any) => void) {
  return subscribeToEvent('branch:updated', callback, `branch:${branchId}`);
}
