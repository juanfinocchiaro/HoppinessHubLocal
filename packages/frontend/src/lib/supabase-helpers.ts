/**
 * Helper for querying tables that exist in the database but aren't yet
 * reflected in the auto-generated Supabase types file.
 *
 * Usage:
 *   import { fromUntyped } from '@/lib/supabase-helpers';
 *   const { data } = await fromUntyped('my_table').select('*');
 */
import { supabase } from '@/services/supabaseClient';

export function fromUntyped(table: string) {
  if (!supabase) {
    throw new Error(
      'El cliente de Supabase no está inicializado. Revisá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env',
    );
  }
  return (supabase as any).from(table);
}
