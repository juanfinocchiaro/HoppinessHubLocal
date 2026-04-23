import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  confirmCommunication,
  createCommunication,
  deleteCommunication,
  listCommunications,
  listUserCommunications,
  markCommunicationAsRead,
} from '@/services/communicationsService';
import type {
  Communication,
  CommunicationWithRead,
} from '@/types/communications';

export function useCommunications() {
  return useQuery({
    queryKey: ['communications'],
    queryFn: () => listCommunications(100),
    staleTime: 60000,
  });
}

export function useUserCommunications() {
  const { id: userId } = useEffectiveUser();

  return useQuery({
    queryKey: ['user-communications', userId],
    queryFn: async () => {
      if (!userId) return { brand: [], local: [] };
      return listUserCommunications(userId);
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

export function useUnreadCount() {
  const { data } = useUserCommunications();
  if (!data) return 0;
  const brandUnread = data.brand?.filter((c) => !c.is_read).length || 0;
  const localUnread = data.local?.filter((c) => !c.is_read).length || 0;
  return brandUnread + localUnread;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();

  return useMutation({
    mutationFn: async (communicationId: string) => {
      if (!userId) throw new Error('Not authenticated');
      await markCommunicationAsRead(userId, communicationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-communications'] });
    },
    onError: (e: Error) => toast.error(`Error al marcar como leído: ${e.message}`),
  });
}

export function useConfirmCommunication() {
  const queryClient = useQueryClient();
  const { id: userId } = useEffectiveUser();

  return useMutation({
    mutationFn: async (communicationId: string) => {
      if (!userId) throw new Error('Not authenticated');
      await confirmCommunication(userId, communicationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-communications'] });
    },
    onError: (e: Error) => toast.error(`Error al confirmar comunicado: ${e.message}`),
  });
}

export function useCreateCommunication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      body: string;
      type: Communication['type'];
      target_branch_ids?: string[];
      target_roles?: string[];
      expires_at?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      await createCommunication(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Comunicado creado');
    },
    onError: (e: Error) => toast.error(`Error al crear comunicado: ${e.message}`),
  });
}

export function useDeleteCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => deleteCommunication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Comunicado eliminado');
    },
    onError: (e: Error) => toast.error(`Error al eliminar comunicado: ${e.message}`),
  });
}

export function getTypeLabel(type: Communication['type']): string {
  switch (type) {
    case 'info':
      return 'Información';
    case 'warning':
      return 'Aviso';
    case 'urgent':
      return 'Urgente';
    case 'celebration':
      return 'Celebración';
    default:
      return type;
  }
}

export function getTypeColor(type: Communication['type']): string {
  switch (type) {
    case 'info':
      return 'bg-blue-500/10 text-blue-600';
    case 'warning':
      return 'bg-yellow-500/10 text-yellow-600';
    case 'urgent':
      return 'bg-red-500/10 text-red-600';
    case 'celebration':
      return 'bg-green-500/10 text-green-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export type { Communication, CommunicationWithRead };
