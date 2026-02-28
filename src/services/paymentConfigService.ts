import { supabase } from './supabaseClient';

function mpTable() {
  return (supabase.from as any)('mercadopago_config');
}

export async function fetchMercadoPagoConfig(branchId: string) {
  const { data, error } = await mpTable()
    .select('*')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMercadoPagoStatus(branchId: string) {
  const { data, error } = await mpTable()
    .select('estado_conexion')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) return null;
  return data as { estado_conexion: string } | null;
}

export async function fetchPointDevices(branchId: string) {
  const { data, error } = await supabase.functions.invoke('mp-point-devices', {
    body: { branch_id: branchId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.devices ?? []) as Array<{
    id: string;
    pos_id: number | null;
    operating_mode: string;
    external_pos_id: string | null;
  }>;
}

export async function upsertMercadoPagoConfig(
  branchId: string,
  values: { access_token: string; public_key: string },
) {
  const { data, error } = await mpTable()
    .upsert(
      {
        branch_id: branchId,
        access_token: values.access_token,
        public_key: values.public_key,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'branch_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function testMercadoPagoConnection(branchId: string) {
  const { data: config } = await mpTable()
    .select('access_token')
    .eq('branch_id', branchId)
    .single();

  if (!config?.access_token) throw new Error('No hay access token configurado');

  const { data, error } = await supabase.functions.invoke('mp-test-connection', {
    body: { branch_id: branchId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function disconnectMercadoPago(branchId: string) {
  const { error } = await mpTable()
    .update({
      access_token: '',
      public_key: '',
      estado_conexion: 'desconectado',
      collector_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('branch_id', branchId);
  if (error) throw error;
}

export async function saveMercadoPagoDevice(
  branchId: string,
  values: { device_id: string; device_name: string },
) {
  const { error } = await mpTable()
    .update({
      device_id: values.device_id,
      device_name: values.device_name,
      device_operating_mode: null,
      updated_at: new Date().toISOString(),
    })
    .eq('branch_id', branchId);
  if (error) throw error;

  const { data, error: modeErr } = await supabase.functions.invoke('mp-point-setup', {
    body: { branch_id: branchId, terminal_id: values.device_id, operating_mode: 'PDV' },
  });
  if (modeErr) throw modeErr;
  if (data?.error) throw new Error(data.error);
}

export async function changeMercadoPagoDeviceMode(
  branchId: string,
  operatingMode: 'PDV' | 'STANDALONE',
) {
  const { data: cfg } = await mpTable()
    .select('device_id')
    .eq('branch_id', branchId)
    .single();
  if (!cfg?.device_id) throw new Error('No hay dispositivo vinculado');

  const { data, error } = await supabase.functions.invoke('mp-point-setup', {
    body: { branch_id: branchId, terminal_id: cfg.device_id, operating_mode: operatingMode },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return operatingMode;
}

export async function removeMercadoPagoDevice(branchId: string) {
  const { error } = await mpTable()
    .update({
      device_id: null,
      device_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq('branch_id', branchId);
  if (error) throw error;
}
