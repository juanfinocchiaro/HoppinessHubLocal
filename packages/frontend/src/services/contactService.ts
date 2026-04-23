import { apiGet, apiPost, apiPatch, apiUpload } from './apiClient';

export type MessageType =
  | 'all'
  | 'franquicia'
  | 'empleo'
  | 'proveedor'
  | 'pedidos'
  | 'consulta'
  | 'otro';

export async function submitContactMessage(data: Record<string, unknown>) {
  return apiPost('/contacts', data);
}

export async function insertContactMessage(data: Record<string, unknown>) {
  return apiPost('/contacts', data);
}

export async function sendContactNotification(body: Record<string, unknown>) {
  return apiPost('/contacts/notify', body);
}

export async function fetchContactMessages(
  typeFilter: MessageType = 'all',
  showOnlyUnread = false,
) {
  const params: Record<string, string> = {};
  if (typeFilter !== 'all') params.type = typeFilter;
  if (showOnlyUnread) params.unread_only = 'true';
  return apiGet('/contacts', params);
}

export async function markContactMessageAsRead(messageId: string) {
  return apiPatch(`/contacts/${messageId}/read`);
}

export async function archiveContactMessage(messageId: string) {
  return apiPatch(`/contacts/${messageId}/archive`);
}

export async function fetchUnreadMessagesCount(): Promise<number> {
  const result = await apiGet<{ count: number }>('/contacts/unread-count');
  return result.count ?? 0;
}

export async function fetchMessageCounts() {
  return apiGet('/contacts/counts');
}

export async function uploadCV(file: File, email: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${email.replace('@', '_at_')}.${fileExt}`;

  const renamedFile = new File([file], fileName, { type: file.type });
  await apiUpload('/storage/upload/cv-uploads', renamedFile);

  return `/uploads/cv-uploads/${fileName}`;
}
