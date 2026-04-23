/**
 * Hook para el Sistema de Supervisiones de Sucursales
 * CRUD de inspecciones y sus ítems
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  BranchInspection,
  InspectionTemplate,
  CreateInspectionInput,
  UpdateInspectionItemInput,
  CompleteInspectionInput,
  InspectionType,
} from '@/types/inspection';
import {
  fetchInspectionTemplates,
  fetchInspections,
  fetchInspection,
  createInspection,
  updateInspectionItem,
  updateInspectionData,
  completeInspection,
  cancelInspection,
  deleteInspection,
  uploadInspectionPhoto,
} from '@/services/inspectionsService';

// ============================================================================
// TEMPLATES
// ============================================================================

export function useInspectionTemplates(type?: InspectionType) {
  return useQuery({
    queryKey: ['inspection-templates', type],
    queryFn: async () => {
      const data = await fetchInspectionTemplates(type);
      return data as InspectionTemplate[];
    },
  });
}

// ============================================================================
// INSPECTIONS LIST
// ============================================================================

interface UseInspectionsOptions {
  branchId?: string;
  status?: string;
  inspectorId?: string;
  limit?: number;
}

export function useInspections(options: UseInspectionsOptions = {}) {
  return useQuery({
    queryKey: ['inspections', options],
    queryFn: async () => {
      const data = await fetchInspections(options);
      return data as BranchInspection[];
    },
  });
}

// ============================================================================
// SINGLE INSPECTION WITH ITEMS
// ============================================================================

export function useInspection(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return null;
      const data = await fetchInspection(inspectionId);
      return data as BranchInspection;
    },
    enabled: !!inspectionId,
  });
}

// ============================================================================
// CREATE INSPECTION
// ============================================================================

export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      return createInspection(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Visita iniciada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error creating inspection:', error);
      toast.error('Error al iniciar la visita');
    },
  });
}

// ============================================================================
// UPDATE INSPECTION ITEM (with optimistic updates for instant UI feedback)
// ============================================================================

export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      inspectionId,
      data,
    }: {
      itemId: string;
      inspectionId: string;
      data: UpdateInspectionItemInput;
    }) => {
      await updateInspectionItem(itemId, data);
      return { itemId, inspectionId, data };
    },
    onMutate: async ({ itemId, inspectionId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['inspection', inspectionId] });

      const previousInspection = queryClient.getQueryData<BranchInspection>([
        'inspection',
        inspectionId,
      ]);

      if (previousInspection?.items) {
        queryClient.setQueryData<BranchInspection>(['inspection', inspectionId], {
          ...previousInspection,
          items: previousInspection.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  complies: data.complies,
                  observations: data.observations ?? item.observations,
                  photo_urls: data.photo_urls ?? item.photo_urls,
                }
              : item,
          ),
        });
      }

      return { previousInspection };
    },
    onError: (error, { inspectionId }, context) => {
      if (context?.previousInspection) {
        queryClient.setQueryData(['inspection', inspectionId], context.previousInspection);
      }
      if (import.meta.env.DEV) console.error('Error updating item:', error);
      toast.error('Error al guardar');
    },
    onSettled: (_, __, { inspectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
    },
  });
}

// ============================================================================
// UPDATE INSPECTION (Manager, Notes, etc.)
// ============================================================================

export function useUpdateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      data,
    }: {
      inspectionId: string;
      data: Partial<
        Pick<BranchInspection, 'present_manager_id' | 'general_notes' | 'critical_findings'>
      >;
    }) => {
      await updateInspectionData(inspectionId, data);
      return inspectionId;
    },
    onSuccess: (inspectionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error updating inspection:', error);
      toast.error('Error al actualizar');
    },
  });
}

// ============================================================================
// COMPLETE INSPECTION
// ============================================================================

export function useCompleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      data,
    }: {
      inspectionId: string;
      data: CompleteInspectionInput;
    }) => {
      return completeInspection(inspectionId, data);
    },
    onSuccess: ({ inspectionId, score }) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success(`Visita completada con puntaje ${score}/100`);
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error completing inspection:', error);
      toast.error('Error al completar la visita');
    },
  });
}

// ============================================================================
// CANCEL INSPECTION
// ============================================================================

export function useCancelInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      await cancelInspection(inspectionId);
      return inspectionId;
    },
    onSuccess: (inspectionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Visita cancelada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error canceling inspection:', error);
      toast.error('Error al cancelar');
    },
  });
}

// ============================================================================
// DELETE INSPECTION
// ============================================================================

export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      await deleteInspection(inspectionId);
      return inspectionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast.success('Visita eliminada');
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error deleting inspection:', error);
      toast.error('Error al eliminar la visita');
    },
  });
}

// ============================================================================
// UPLOAD PHOTO
// ============================================================================

export function useUploadInspectionPhoto() {
  return useMutation({
    mutationFn: async ({
      inspectionId,
      itemKey,
      file,
    }: {
      inspectionId: string;
      itemKey: string;
      file: File;
    }) => {
      return uploadInspectionPhoto(inspectionId, itemKey, file);
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
    },
  });
}
