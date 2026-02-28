import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContactMessages,
  markContactMessageAsRead,
  archiveContactMessage,
  fetchUnreadMessagesCount,
  fetchMessageCounts as fetchMessageCountsService,
  type MessageType,
} from '@/services/contactService';
import { toast } from 'sonner';

export type { MessageType };

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string | null;
  status: string | null;
  read_at: string | null;
  created_at: string | null;
  // Franquicia fields
  franchise_has_zone: string | null;
  franchise_has_location: string | null;
  franchise_investment_capital: string | null;
  // Empleo fields
  employment_position: string | null;
  employment_cv_link: string | null;
  employment_motivation: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  // Pedidos fields
  order_number: string | null;
  order_date: string | null;
  order_issue: string | null;
  // Additional fields
  investment_range: string | null;
  employment_branch_id: string | null;
}

interface UseContactMessagesOptions {
  typeFilter?: MessageType;
  showOnlyUnread?: boolean;
}

export function useContactMessages(options: UseContactMessagesOptions = {}) {
  const { typeFilter = 'all', showOnlyUnread = false } = options;
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['contact-messages', typeFilter, showOnlyUnread],
    queryFn: () => fetchContactMessages(typeFilter, showOnlyUnread) as Promise<ContactMessage[]>,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) => markContactMessageAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const archiveMutation = useMutation({
    mutationFn: (messageId: string) => archiveContactMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      toast.success('Mensaje archivado');
    },
    onError: (e: Error) => toast.error(`Error al archivar: ${e.message}`),
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    markAsRead: markAsReadMutation.mutate,
    archive: archiveMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: () => fetchUnreadMessagesCount(),
    refetchInterval: 60000,
  });
}

export function useMessageCounts() {
  return useQuery({
    queryKey: ['contact-messages-counts'],
    queryFn: async () => {
      const data = await fetchMessageCountsService();

      const counts = {
        all: data?.length ?? 0,
        franquicia: 0,
        empleo: 0,
        proveedor: 0,
        pedidos: 0,
        consulta: 0,
        otro: 0,
      };

      data?.forEach((msg) => {
        const subject = msg.subject as keyof typeof counts;
        if (subject in counts && subject !== 'all') {
          counts[subject]++;
        } else if (subject !== 'all') {
          counts.otro++;
        }
      });

      return counts;
    },
  });
}
