import { supabase } from './supabaseClient';

export async function fetchWhatsAppTemplates() {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .order('subject_type');
  if (error) throw error;
  return data ?? [];
}

export async function updateWhatsAppTemplate(id: string, templateText: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('whatsapp_templates')
    .update({ template_text: templateText, updated_by: user?.id })
    .eq('id', id);
  if (error) throw error;
}
