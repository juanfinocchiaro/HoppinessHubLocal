import { apiGet, apiPut } from './apiClient';

export async function fetchWhatsAppTemplates() {
  return apiGet('/whatsapp/templates');
}

export async function updateWhatsAppTemplate(id: string, templateText: string) {
  return apiPut(`/whatsapp/templates/${id}`, { template_text: templateText });
}
