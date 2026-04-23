import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

function createSupabaseClient() {
  const url = typeof SUPABASE_URL === 'string' ? SUPABASE_URL.trim() : '';
  const key = typeof SUPABASE_PUBLISHABLE_KEY === 'string' ? SUPABASE_PUBLISHABLE_KEY.trim() : '';
  const validUrl = url && url !== 'undefined' && url.startsWith('http');
  const validKey = key && key !== 'undefined';

  if (!validUrl || !validKey) {
    if (typeof import.meta.env.DEV !== 'undefined' && import.meta.env.DEV) {
      console.warn(
        '[Supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env. La app abre pero Pedí Online y otras cosas no van a cargar. Agregá las variables en hoppiness-hub-platform/.env y reiniciá el servidor.',
      );
    }
  }

  const urlClean = validUrl ? url.replace(/\/+$/, '') : 'https://diolgjqstduyvilmrtng.supabase.co';
  const keyToUse = validKey ? key : 'no-key-configurada';
  const client = createClient<Database>(urlClean, keyToUse, {
    auth: {
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  if (typeof (client as { from?: unknown }).from !== 'function') {
    throw new Error(
      'El cliente de Supabase no se inicializó bien. Probá reiniciar el servidor (npm run dev) y revisar .env.',
    );
  }
  return client;
}

export const supabase = createSupabaseClient();
