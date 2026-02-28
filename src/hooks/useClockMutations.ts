import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createManualClockEntry,
  updateClockEntry,
  deleteClockEntry,
  createLeaveRequest,
} from '@/services/hrService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UseClockMutationsOptions {
  branchId: string;
  onSuccess?: () => void;
}

export function useClockMutations({ branchId, onSuccess }: UseClockMutationsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['clock-entries-grouped'] });
    queryClient.invalidateQueries({ queryKey: ['employee-clock-ins'] });
    queryClient.invalidateQueries({ queryKey: ['my-clock-entries'] });
    queryClient.invalidateQueries({ queryKey: ['currently-working', branchId] });
    queryClient.invalidateQueries({ queryKey: ['labor-clock-entries', branchId] });
    queryClient.invalidateQueries({ queryKey: ['clocked-in-at-branch'] });
    queryClient.invalidateQueries({ queryKey: ['day-requests-for-clock'] });
    onSuccess?.();
  };

  const addMutation = useMutation({
    mutationFn: (params: {
      userId: string;
      entryType: 'clock_in' | 'clock_out';
      timestamp: string;
      reason: string;
    }) =>
      createManualClockEntry({
        branchId,
        userId: params.userId,
        entryType: params.entryType,
        timestamp: params.timestamp,
        reason: params.reason,
        managerId: user!.id,
      }),
    onSuccess: () => {
      toast.success('Fichaje manual agregado');
      invalidateAll();
    },
    onError: () => toast.error('Error al agregar fichaje'),
  });

  const editMutation = useMutation({
    mutationFn: (params: {
      entryId: string;
      patch: { entry_type?: string; created_at?: string; reason: string };
      originalCreatedAt: string;
    }) =>
      updateClockEntry(
        params.entryId,
        params.patch,
        user!.id,
        params.originalCreatedAt,
      ),
    onSuccess: () => {
      toast.success('Fichaje corregido');
      invalidateAll();
    },
    onError: () => toast.error('Error al corregir fichaje'),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteClockEntry(entryId),
    onSuccess: () => {
      toast.success('Fichaje eliminado');
      invalidateAll();
    },
    onError: () => toast.error('Error al eliminar fichaje'),
  });

  const leaveMutation = useMutation({
    mutationFn: (params: {
      userId: string;
      date: string;
      requestType: 'sick_leave' | 'vacation' | 'day_off';
      reason?: string;
    }) =>
      createLeaveRequest({
        branchId,
        userId: params.userId,
        date: params.date,
        requestType: params.requestType,
        reason: params.reason,
        respondedBy: user!.id,
      }),
    onSuccess: () => {
      toast.success('Licencia registrada');
      invalidateAll();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al registrar licencia';
      toast.error(message);
    },
  });

  return { addMutation, editMutation, deleteMutation, leaveMutation };
}
