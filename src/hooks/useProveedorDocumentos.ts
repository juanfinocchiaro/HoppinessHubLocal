import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchProveedorDocumentos,
  uploadProveedorDoc,
  softDeleteProveedorDoc,
  uploadFacturaPdf,
} from '@/services/proveedoresService';

export interface ProveedorDocumento {
  id: string;
  proveedor_id: string;
  nombre_archivo: string;
  storage_path: string;
  public_url: string;
  tipo: string;
  file_size_bytes: number | null;
  created_at: string;
}

export function useProveedorDocumentos(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ['proveedor-documentos', proveedorId],
    queryFn: () => fetchProveedorDocumentos(proveedorId!),
    enabled: !!proveedorId,
  });
}

export function useUploadProveedorDoc() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      proveedorId,
      file,
      tipo = 'general',
    }: {
      proveedorId: string;
      file: File;
      tipo?: string;
    }) => uploadProveedorDoc(proveedorId, file, tipo, user?.id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['proveedor-documentos', variables.proveedorId] });
      toast.success('Documento subido');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteProveedorDoc() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ docId, proveedorId }: { docId: string; proveedorId: string }) => {
      await softDeleteProveedorDoc(docId);
      return proveedorId;
    },
    onSuccess: (proveedorId) => {
      qc.invalidateQueries({ queryKey: ['proveedor-documentos', proveedorId] });
      toast.success('Documento eliminado');
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUploadFacturaPdf() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ facturaId, file }: { facturaId: string; file: File }) =>
      uploadFacturaPdf(facturaId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('PDF adjuntado a la factura');
    },
    onError: (e) => toast.error(e.message),
  });
}
