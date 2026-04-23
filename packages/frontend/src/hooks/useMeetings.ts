/**
 * useMeetings - Hook para gestión de reuniones v2.0
 * Flujo de 2 fases: Convocatoria → Ejecución
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useEffectiveUser } from './useEffectiveUser';
import { toast } from 'sonner';
import type {
  MeetingConveneData,
  MeetingWizardData,
  MeetingStats,
} from '@/types/meeting';
import {
  fetchBranchMeetings,
  fetchMyMeetings,
  fetchUnreadMeetingsCount,
  fetchBrandMeetings,
  fetchBrandMeetingsStats,
  fetchMeetingDetail,
  conveneMeeting,
  updateConvokedMeeting,
  cancelMeeting as cancelMeetingService,
  startMeeting as startMeetingService,
  updateAttendance,
  saveMeetingNotes,
  addAgreement,
  deleteAgreement as deleteAgreementService,
  closeMeeting as closeMeetingService,
  markMeetingAsRead as markMeetingAsReadService,
  createMeetingLegacy,
  fetchBranchTeamMembers,
  fetchNetworkMembers,
  checkMeetingConflicts,
} from '@/services/meetingsService';
export type { MeetingConflict } from '@/services/meetingsService';

// ============================================
// QUERIES - Lectura de datos
// ============================================

// Fetch meetings for a branch
export function useBranchMeetings(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-meetings', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      return fetchBranchMeetings(branchId);
    },
    enabled: !!branchId,
  });
}

// Fetch meetings where current user is participant
export function useMyMeetings() {
  const effectiveUser = useEffectiveUser();
  const userId = effectiveUser.id;

  return useQuery({
    queryKey: ['my-meetings', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchMyMeetings(userId);
    },
    enabled: !!userId,
  });
}

// Fetch unread meetings count for dashboard
export function useUnreadMeetingsCount(branchId?: string) {
  const effectiveUser = useEffectiveUser();
  const userId = effectiveUser.id;

  return useQuery({
    queryKey: ['unread-meetings-count', branchId, userId],
    queryFn: async (): Promise<MeetingStats> => {
      if (!userId) return { totalMeetings: 0, unreadCount: 0 };
      return fetchUnreadMeetingsCount(userId);
    },
    enabled: !!userId,
  });
}

// Fetch ALL meetings for brand view (coordinators/superadmins)
export function useBrandMeetings() {
  return useQuery({
    queryKey: ['brand-meetings'],
    queryFn: fetchBrandMeetings,
  });
}

// Fetch brand meetings stats for dashboard metrics
export function useBrandMeetingsStats() {
  return useQuery({
    queryKey: ['brand-meetings-stats'],
    queryFn: fetchBrandMeetingsStats,
  });
}

// Fetch meeting detail with all relations
export function useMeetingDetail(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-detail', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;
      return fetchMeetingDetail(meetingId);
    },
    enabled: !!meetingId,
  });
}

// ============================================
// MUTATIONS - Fase 1: Convocatoria
// ============================================

// Convocar una reunión (crear en estado CONVOCADA)
export function useConveneMeeting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MeetingConveneData) => {
      if (!user?.id) throw new Error('No authenticated user');
      return conveneMeeting(user.id, data);
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['branch-meetings', data.branchId] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
      toast.success('Reunión convocada');
    },
    onError: (e: Error) => toast.error(`Error al convocar reunión: ${e.message}`),
  });
}

// Editar reunión CONVOCADA (antes de iniciar)
export function useUpdateConvokedMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      data,
    }: {
      meetingId: string;
      data: Partial<MeetingConveneData>;
    }) => {
      return updateConvokedMeeting(meetingId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      toast.success('Reunión actualizada');
    },
    onError: (e: Error) => toast.error(`Error al actualizar reunión: ${e.message}`),
  });
}

// Cancelar reunión CONVOCADA (cambiar a estado cancelada)
export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      await cancelMeetingService(meetingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
      toast.success('Reunión cancelada');
    },
    onError: (e: Error) => toast.error(`Error al cancelar reunión: ${e.message}`),
  });
}

// ============================================
// MUTATIONS - Fase 2: Ejecución
// ============================================

// Iniciar reunión (pasar de CONVOCADA a EN_CURSO)
export function useStartMeeting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      if (!user?.id) throw new Error('No authenticated user');
      return startMeetingService(meetingId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
      toast.success('Reunión iniciada');
    },
    onError: (e: Error) => toast.error(`Error al iniciar reunión: ${e.message}`),
  });
}

// Actualizar asistencia durante la ejecución
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      attendance,
    }: {
      meetingId: string;
      attendance: Record<string, boolean>;
    }) => {
      await updateAttendance(meetingId, attendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
    onError: (e: Error) => toast.error(`Error al guardar asistencia: ${e.message}`),
  });
}

// Guardar notas durante la ejecución
export function useSaveMeetingNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, notes }: { meetingId: string; notes: string }) => {
      await saveMeetingNotes(meetingId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
    onError: (e: Error) => toast.error(`Error al guardar notas: ${e.message}`),
  });
}

// Agregar acuerdo durante la ejecución
export function useAddAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      description,
      assigneeIds,
      sortOrder,
    }: {
      meetingId: string;
      description: string;
      assigneeIds: string[];
      sortOrder?: number;
    }) => {
      return addAgreement({ meetingId, description, assigneeIds, sortOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
    onError: (e: Error) => toast.error(`Error al agregar acuerdo: ${e.message}`),
  });
}

// Eliminar acuerdo
export function useDeleteAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreementId: string) => {
      await deleteAgreementService(agreementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
    },
    onError: (e: Error) => toast.error(`Error al eliminar acuerdo: ${e.message}`),
  });
}

// Cerrar reunión (pasar de EN_CURSO a CERRADA)
export function useCloseMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      notes,
      attendance,
      agreements,
    }: {
      meetingId: string;
      notes: string;
      attendance: Record<string, boolean>;
      agreements?: { description: string; assigneeIds: string[] }[];
    }) => {
      await closeMeetingService({ meetingId, notes, attendance, agreements });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
      toast.success('Reunión cerrada');
    },
    onError: (e: Error) => toast.error(`Error al cerrar reunión: ${e.message}`),
  });
}

// ============================================
// MUTATIONS - General
// ============================================

// Mark meeting as read
export function useMarkMeetingAsRead() {
  const effectiveUser = useEffectiveUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      if (!effectiveUser.id) throw new Error('No user');
      await markMeetingAsReadService(meetingId, effectiveUser.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['unread-meetings-count'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-detail'] });
      queryClient.invalidateQueries({ queryKey: ['branch-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
    },
    onError: (e: Error) => toast.error(`Error al marcar como leída: ${e.message}`),
  });
}

// Legacy: Create meeting (mantener por compatibilidad)
export function useCreateMeeting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: MeetingWizardData }) => {
      if (!user?.id) throw new Error('No authenticated user');
      return createMeetingLegacy(user.id, branchId, data);
    },
    onSuccess: (_, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: ['branch-meetings', branchId] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['unread-meetings-count'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['brand-meetings-stats'] });
      toast.success('Reunión creada');
    },
    onError: (e: Error) => toast.error(`Error al crear reunión: ${e.message}`),
  });
}

// ============================================
// QUERIES - Team Members
// ============================================

// Get team members for branch (for participant selection)
export function useBranchTeamMembers(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-team-members', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      return fetchBranchTeamMembers(branchId);
    },
    enabled: !!branchId,
  });
}

// Get all network members for brand meetings
export function useNetworkMembers() {
  return useQuery({
    queryKey: ['network-members'],
    queryFn: fetchNetworkMembers,
  });
}

// ============================================
// QUERIES - Conflict Detection
// ============================================

// Check for schedule conflicts when convening a meeting
export function useCheckMeetingConflicts() {
  return useMutation({
    mutationFn: async ({
      date,
      time,
      participantIds,
    }: {
      date: Date;
      time: string;
      participantIds: string[];
    }) => {
      return checkMeetingConflicts({ date, time, participantIds });
    },
  });
}
