import { supabase } from './supabaseClient';

export interface ClienteAddress {
  id: string;
  etiqueta: string;
  direccion: string;
  piso: string | null;
  referencia: string | null;
  ciudad: string | null;
  is_primary: boolean;
}

export async function listAddresses(userId: string) {
  const { data, error } = await supabase
    .from('cliente_direcciones')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return (data || []) as ClienteAddress[];
}

export async function saveAddress(
  userId: string,
  payload: {
    etiqueta: string;
    direccion: string;
    piso: string | null;
    referencia: string | null;
    ciudad: string | null;
  },
  editId?: string | null,
) {
  if (editId) {
    const { error } = await supabase
      .from('cliente_direcciones')
      .update({ ...payload, user_id: userId })
      .eq('id', editId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('cliente_direcciones')
      .insert({ ...payload, user_id: userId });
    if (error) throw error;
  }
}

export async function deleteAddress(id: string) {
  const { error } = await supabase.from('cliente_direcciones').delete().eq('id', id);
  if (error) throw error;
}
