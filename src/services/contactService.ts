import { supabase } from './supabaseClient';

export async function submitContactMessage(data: Record<string, unknown>) {
  return supabase
    .from('contact_messages')
    .insert([data as never])
    .select()
    .single();
}

export async function insertContactMessage(data: Record<string, unknown>) {
  return supabase.from('contact_messages').insert(data);
}

export async function sendContactNotification(body: Record<string, unknown>) {
  return supabase.functions.invoke('contact-notification', { body });
}

export type MessageType =
  | 'all'
  | 'franquicia'
  | 'empleo'
  | 'proveedor'
  | 'pedidos'
  | 'consulta'
  | 'otro';

export async function fetchContactMessages(
  typeFilter: MessageType = 'all',
  showOnlyUnread = false,
) {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (typeFilter !== 'all') {
    query = query.eq('subject', typeFilter);
  }

  if (showOnlyUnread) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markContactMessageAsRead(messageId: string) {
  const { error } = await supabase
    .from('contact_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function archiveContactMessage(messageId: string) {
  const { error } = await supabase
    .from('contact_messages')
    .update({ status: 'archived' })
    .eq('id', messageId);
  if (error) throw error;
}

export async function fetchUnreadMessagesCount() {
  const { count, error } = await supabase
    .from('contact_messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('status', 'archived');
  if (error) throw error;
  return count ?? 0;
}

export async function fetchMessageCounts() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('subject')
    .neq('status', 'archived');
  if (error) throw error;
  return data;
}

export async function uploadCV(file: File, email: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${email.replace('@', '_at_')}.${fileExt}`;

  const { error } = await supabase.storage
    .from('cv-uploads')
    .upload(fileName, file);
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('cv-uploads')
    .getPublicUrl(fileName);

  return urlData?.publicUrl || fileName;
}
