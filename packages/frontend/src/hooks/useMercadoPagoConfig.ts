import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchMercadoPagoConfig as fetchMpConfig,
  fetchMercadoPagoStatus as fetchMpStatus,
  fetchPointDevices as fetchMpPointDevices,
  upsertMercadoPagoConfig,
  testMercadoPagoConnection,
  disconnectMercadoPago,
  saveMercadoPagoDevice,
  changeMercadoPagoDeviceMode,
  removeMercadoPagoDevice,
} from '@/services/paymentConfigService';

export interface MercadoPagoConfig {
  id: string;
  branch_id: string;
  access_token: string;
  public_key: string;
  connection_status: 'conectado' | 'desconectado' | 'error';
  webhook_secret: string | null;
  collector_id: string | null;
  last_test: string | null;
  last_test_ok: boolean | null;
  device_id: string | null;
  device_name: string | null;
  device_operating_mode: 'PDV' | 'STANDALONE' | null;
}

/**
 * Reads MP config for authenticated users (admin panel).
 * For public pages use `useMercadoPagoStatus` instead.
 */
export function useMercadoPagoConfig(branchId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mp-config', branchId],
    queryFn: async () => {
      const data = await fetchMpConfig(branchId!);
      return data as MercadoPagoConfig | null;
    },
    enabled: !!user && !!branchId,
  });
}

/**
 * Lightweight public query — only checks if MP is connected for a branch.
 * Does not require authentication. Only reads `estado_conexion`.
 */
export function useMercadoPagoStatus(branchId: string | undefined) {
  return useQuery({
    queryKey: ['mp-status', branchId],
    queryFn: () => fetchMpStatus(branchId!),
    enabled: !!branchId,
  });
}

export function usePointDevices(branchId: string | undefined) {
  return useQuery({
    queryKey: ['mp-point-devices', branchId],
    queryFn: () => fetchMpPointDevices(branchId!),
    enabled: !!branchId,
  });
}

export function useMercadoPagoConfigMutations(branchId: string | undefined) {
  const qc = useQueryClient();

  const upsert = useMutation({
    mutationFn: async (values: { access_token: string; public_key: string }) => {
      if (!branchId) throw new Error('branch_id requerido');
      return upsertMercadoPagoConfig(branchId, values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Configuración guardada');
    },
    onError: (err: Error) => {
      toast.error('Error al guardar', { description: err.message });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('branch_id requerido');
      return testMercadoPagoConnection(branchId);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Conexión exitosa', {
        description: `Collector ID: ${data?.collector_id ?? 'N/A'}`,
      });
    },
    onError: (err: Error) => {
      const msg = err.message || 'Token inválido o sin permisos';
      toast.error('Error de conexión', { description: msg });
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('branch_id requerido');
      await disconnectMercadoPago(branchId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Desconectado de MercadoPago');
    },
  });

  const saveDevice = useMutation({
    mutationFn: async (values: { device_id: string; device_name: string }) => {
      if (!branchId) throw new Error('branch_id requerido');
      await saveMercadoPagoDevice(branchId, values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Dispositivo vinculado en modo PDV', {
        description: 'Listo para recibir cobros desde el POS.',
      });
    },
    onError: (err: Error) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.warning('Dispositivo guardado, pero no se pudo activar modo PDV', {
        description:
          err.message || 'Activalo manualmente: Más opciones → Ajustes → Modo de vinculación.',
      });
    },
  });

  const changeDeviceMode = useMutation({
    mutationFn: async (operating_mode: 'PDV' | 'STANDALONE') => {
      if (!branchId) throw new Error('branch_id requerido');
      return changeMercadoPagoDeviceMode(branchId, operating_mode);
    },
    onSuccess: (mode) => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success(mode === 'PDV' ? 'Modo PDV activado' : 'Modo Standalone activado', {
        description:
          mode === 'PDV'
            ? 'El dispositivo está listo para integrarse con el POS.'
            : 'El dispositivo volvió al modo independiente.',
      });
    },
    onError: (err: Error) => {
      toast.error('Error al cambiar modo', { description: err.message });
    },
  });

  const removeDevice = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('branch_id requerido');
      await removeMercadoPagoDevice(branchId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp-config', branchId] });
      toast.success('Dispositivo desvinculado');
    },
  });

  return { upsert, testConnection, disconnect, saveDevice, removeDevice, changeDeviceMode };
}
