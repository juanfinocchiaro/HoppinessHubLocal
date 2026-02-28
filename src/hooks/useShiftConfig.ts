import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getUnifiedShiftLabel } from '@/types/shift';
import {
  fetchBranchShiftConfig,
  updateBranchShiftConfig as updateShiftConfigApi,
  type BranchShiftConfig,
} from '@/services/configService';

export type ShiftType = 'morning' | 'midday' | 'night' | 'overnight';

export interface ShiftDefinition {
  value: ShiftType;
  label: string;
  defaultEnabled: boolean;
  configKey?: 'shifts_morning_enabled' | 'shifts_overnight_enabled';
}

/**
 * All 4 shifts with their configuration
 * - morning: Optional (configurable per branch)
 * - midday: Always enabled
 * - night: Always enabled
 * - overnight: Optional (configurable per branch)
 */
export const ALL_SHIFTS: ShiftDefinition[] = [
  { value: 'morning', label: 'Mañana', defaultEnabled: false, configKey: 'shifts_morning_enabled' },
  { value: 'midday', label: 'Mediodía', defaultEnabled: true },
  { value: 'night', label: 'Noche', defaultEnabled: true },
  {
    value: 'overnight',
    label: 'Trasnoche',
    defaultEnabled: false,
    configKey: 'shifts_overnight_enabled',
  },
];

export function getShiftLabel(shift: string): string {
  return getUnifiedShiftLabel(shift);
}

export function useBranchShiftConfig(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-shift-config', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      return fetchBranchShiftConfig(branchId);
    },
    enabled: !!branchId,
    staleTime: 60000,
  });
}

export function useUpdateBranchShiftConfig(branchId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<BranchShiftConfig>) => {
      if (!branchId) throw new Error('Branch ID required');
      return updateShiftConfigApi(branchId, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-shift-config', branchId] });
      toast.success('Configuración de turnos actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Get the list of enabled shifts for a branch
 */
export function getEnabledShifts(config: BranchShiftConfig | null | undefined): ShiftDefinition[] {
  if (!config) {
    // Default: only midday and night
    return ALL_SHIFTS.filter((s) => s.defaultEnabled);
  }

  return ALL_SHIFTS.filter((shift) => {
    if (shift.defaultEnabled) return true;
    if (shift.configKey === 'shifts_morning_enabled') return config.shifts_morning_enabled;
    if (shift.configKey === 'shifts_overnight_enabled') return config.shifts_overnight_enabled;
    return false;
  });
}

/**
 * Get missing shifts for today based on what's already loaded
 */
export function getMissingShifts(
  loadedShifts: string[],
  enabledShifts: ShiftDefinition[],
): ShiftDefinition[] {
  return enabledShifts.filter((shift) => !loadedShifts.includes(shift.value));
}
