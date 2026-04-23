import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchAfipConfig,
  saveAfipConfig,
  saveAfipKeyAndCSR,
  saveAfipCertificate,
  testAfipConnection,
  emitirFactura as emitirFacturaService,
} from '@/services/fiscalService';

export type { ReglasFacturacion } from '@/types/shiftClosure';
import type { ReglasFacturacion } from '@/types/shiftClosure';

export const DEFAULT_REGLAS_FACTURACION: ReglasFacturacion = {
  canales_internos: {
    efectivo: false,
    debito: true,
    credito: true,
    qr: true,
    transferencia: true,
  },
  canales_externos: {
    rappi: true,
    pedidosya: true,
    mas_delivery_efectivo: false,
    mas_delivery_digital: true,
    mp_delivery: true,
  },
};

export interface AfipConfig {
  id: string;
  branch_id: string;
  cuit: string | null;
  business_name: string | null;
  direccion_fiscal: string | null;
  inicio_actividades: string | null;
  punto_venta: number | null;
  certificado_crt: string | null;
  clave_privada_enc: string | null;
  estado_conexion: string;
  ultimo_error: string | null;
  ultima_verificacion: string | null;
  ultimo_nro_factura_a: number;
  ultimo_nro_factura_b: number;
  ultimo_nro_factura_c: number;
  is_production: boolean;
  estado_certificado: string;
  csr_pem: string | null;
  reglas_facturacion: ReglasFacturacion;
  created_at: string;
  updated_at: string;
}

export function useAfipConfig(branchId: string | undefined) {
  return useQuery({
    queryKey: ['afip-config', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const data = await fetchAfipConfig(branchId);
      return data as AfipConfig | null;
    },
    enabled: !!branchId,
  });
}

interface SaveAfipConfigInput {
  branch_id: string;
  cuit?: string;
  business_name?: string;
  direccion_fiscal?: string;
  inicio_actividades?: string;
  punto_venta?: number;
  certificado_crt?: string;
  clave_privada_enc?: string;
  is_production?: boolean;
}

export function useAfipConfigMutations(branchId: string | undefined) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (input: SaveAfipConfigInput) => {
      await saveAfipConfig(input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', variables.branch_id] });
      toast.success('Configuración ARCA guardada');
    },
    onError: (err: Error) => {
      toast.error(`Error al guardar: ${err.message}`);
    },
  });

  const saveKeyAndCSRMutation = useMutation({
    mutationFn: async (input: { branch_id: string; privateKeyPem: string; csrPem: string }) => {
      await saveAfipKeyAndCSR(input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', variables.branch_id] });
      toast.success('Clave privada y solicitud generadas correctamente');
    },
    onError: (err: Error) => {
      toast.error(`Error al guardar certificado: ${err.message}`);
    },
  });

  const saveCertificateMutation = useMutation({
    mutationFn: async (input: { branch_id: string; certificado_crt: string }) => {
      await saveAfipCertificate(input.branch_id, input.certificado_crt);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', variables.branch_id] });
    },
    onError: (err: Error) => {
      toast.error(`Error al guardar certificado: ${err.message}`);
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('Branch ID requerido');
      return testAfipConnection(branchId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['afip-config', branchId] });
      if (data?.success) {
        toast.success(data.mensaje || 'Conexión exitosa');
      } else {
        toast.warning(data?.mensaje || 'No se pudo conectar');
      }
    },
    onError: (err: Error) => {
      toast.error(`Error al probar conexión: ${err.message}`);
    },
  });

  return { save, saveKeyAndCSR: saveKeyAndCSRMutation, saveCertificate: saveCertificateMutation, testConnection };
}

interface EmitirFacturaInput {
  branch_id: string;
  pedido_id?: string;
  tipo_factura: 'A' | 'B';
  receptor_cuit?: string;
  receptor_razon_social?: string;
  receptor_condicion_iva?: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number }[];
  total: number;
}

export function useEmitirFactura() {
  return useMutation({
    mutationFn: async (input: EmitirFacturaInput) => {
      return emitirFacturaService(input);
    },
    onSuccess: (data) => {
      if (data?.simulado) {
        toast.success(`Factura ${data.tipo} simulada: ${data.numero} (homologación)`);
      } else {
        toast.success(`Factura ${data.tipo} emitida: CAE ${data.cae}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Error al emitir factura: ${err.message}`);
    },
  });
}
