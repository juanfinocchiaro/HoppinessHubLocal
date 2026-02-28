import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchWhatsAppTemplates,
  updateWhatsAppTemplate,
} from '@/services/whatsappService';

export interface WhatsAppTemplate {
  id: string;
  subject_type: string;
  template_text: string;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const data = await fetchWhatsAppTemplates();
      return data as WhatsAppTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, template_text }: { id: string; template_text: string }) => {
      await updateWhatsAppTemplate(id, template_text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Plantilla actualizada');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const getTemplateText = (subjectType: string): string => {
    const template = query.data?.find((t) => t.subject_type === subjectType && t.is_active);
    return template?.template_text ?? '';
  };

  const resolveTemplate = (
    subjectType: string,
    contact: { name: string; email: string; phone: string },
  ): string => {
    let text = getTemplateText(subjectType);
    if (!text) text = getTemplateText('otro');
    return text
      .replace(/\[NOMBRE\]/g, contact.name)
      .replace(/\[EMAIL\]/g, contact.email)
      .replace(/\[TELEFONO\]/g, contact.phone);
  };

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    updateTemplate: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    getTemplateText,
    resolveTemplate,
  };
}
