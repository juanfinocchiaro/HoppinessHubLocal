/**
 * InspectionStaffChecklist - Checklist de personal presente durante la inspección
 *
 * Nuevo enfoque: Solo agregar quienes están presentes, con evaluación de:
 * - Uniforme en correcto estado
 * - Estación de trabajo limpia
 * - Observaciones
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shirt, Sparkles, MessageSquare, Users } from 'lucide-react';
import {
  fetchInspectionStaffMembers,
  fetchInspectionStaffPresent,
  addInspectionStaffPresent,
  removeInspectionStaffPresent,
  updateInspectionStaffEvaluation,
  updateInspectionStaffObservation,
} from '@/services/inspectionsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  full_name: string;
  local_role: string;
}

interface StaffPresent {
  id: string;
  user_id: string;
  uniform_ok: boolean | null;
  station_clean: boolean | null;
  observations: string | null;
}

interface InspectionStaffChecklistProps {
  inspectionId: string;
  branchId: string;
  readOnly?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  encargado: 'Encargado',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function InspectionStaffChecklist({
  inspectionId,
  branchId,
  readOnly = false,
}: InspectionStaffChecklistProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [editingObservation, setEditingObservation] = useState<string | null>(null);
  const [observationText, setObservationText] = useState('');

  const { data: allStaff = [] } = useQuery({
    queryKey: ['inspection-staff-members', branchId],
    queryFn: () => fetchInspectionStaffMembers(branchId) as Promise<StaffMember[]>,
    enabled: !!branchId,
  });

  const { data: presentStaff = [] } = useQuery({
    queryKey: ['inspection-staff-present', inspectionId],
    queryFn: () => fetchInspectionStaffPresent(inspectionId) as Promise<StaffPresent[]>,
    enabled: !!inspectionId,
  });

  // Available staff (not yet added)
  const availableStaff = allStaff.filter((s) => !presentStaff.some((p) => p.user_id === s.id));

  const addStaff = useMutation({
    mutationFn: (userId: string) => addInspectionStaffPresent(inspectionId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-staff-present', inspectionId] });
      setSelectedUserId('');
    },
    onError: () => {
      toast.error('Error al agregar');
    },
  });

  const removeStaff = useMutation({
    mutationFn: (recordId: string) => removeInspectionStaffPresent(recordId),
    onMutate: async (recordId) => {
      await queryClient.cancelQueries({ queryKey: ['inspection-staff-present', inspectionId] });
      const previous = queryClient.getQueryData<StaffPresent[]>([
        'inspection-staff-present',
        inspectionId,
      ]);
      queryClient.setQueryData<StaffPresent[]>(
        ['inspection-staff-present', inspectionId],
        (old) => old?.filter((s) => s.id !== recordId) || [],
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inspection-staff-present', inspectionId], context.previous);
      }
      toast.error('Error al eliminar');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-staff-present', inspectionId] });
    },
  });

  const updateEvaluation = useMutation({
    mutationFn: async ({
      recordId,
      field,
      value,
    }: {
      recordId: string;
      field: 'uniform_ok' | 'station_clean';
      value: boolean | null;
    }) => {
      await updateInspectionStaffEvaluation(recordId, field, value);
    },
    onMutate: async ({ recordId, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ['inspection-staff-present', inspectionId] });
      const previous = queryClient.getQueryData<StaffPresent[]>([
        'inspection-staff-present',
        inspectionId,
      ]);
      queryClient.setQueryData<StaffPresent[]>(
        ['inspection-staff-present', inspectionId],
        (old) => old?.map((s) => (s.id === recordId ? { ...s, [field]: value } : s)) || [],
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inspection-staff-present', inspectionId], context.previous);
      }
      toast.error('Error al guardar');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-staff-present', inspectionId] });
    },
  });

  const saveObservation = useMutation({
    mutationFn: async ({ recordId, observations }: { recordId: string; observations: string }) => {
      await updateInspectionStaffObservation(recordId, observations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-staff-present', inspectionId] });
      setEditingObservation(null);
      setObservationText('');
    },
    onError: () => {
      toast.error('Error al guardar observación');
    },
  });

  const handleAddStaff = (userId: string) => {
    if (!userId) return;
    addStaff.mutate(userId);
  };

  const handleBulkAddAll = async () => {
    if (availableStaff.length === 0) return;
    for (const staff of availableStaff) {
      await addStaff.mutateAsync(staff.id);
    }
  };

  const handleToggleEvaluation = (
    recordId: string,
    field: 'uniform_ok' | 'station_clean',
    currentValue: boolean | null,
  ) => {
    if (readOnly) return;
    // Toggle: null -> true -> false -> null
    let newValue: boolean | null;
    if (currentValue === null) newValue = true;
    else if (currentValue === true) newValue = false;
    else newValue = null;

    updateEvaluation.mutate({ recordId, field, value: newValue });
  };

  const handleStartEditObservation = (recordId: string, currentObs: string | null) => {
    if (readOnly) return;
    setEditingObservation(recordId);
    setObservationText(currentObs || '');
  };

  const handleSaveObservation = (recordId: string) => {
    saveObservation.mutate({ recordId, observations: observationText });
  };

  const getStaffName = (userId: string) => {
    const staff = allStaff.find((s) => s.id === userId);
    return staff?.full_name || 'Desconocido';
  };

  const getStaffRole = (userId: string) => {
    const staff = allStaff.find((s) => s.id === userId);
    return ROLE_LABELS[staff?.local_role || ''] || 'Empleado';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Personal Presente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add staff controls */}
        {!readOnly && availableStaff.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Agregar empleado presente..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name} ({ROLE_LABELS[staff.local_role] || staff.local_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleAddStaff(selectedUserId)}
                disabled={!selectedUserId || addStaff.isPending}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            {presentStaff.length === 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleBulkAddAll}
                disabled={addStaff.isPending}
              >
                <Users className="w-4 h-4 mr-2" />
                Cargar todo el equipo ({availableStaff.length})
              </Button>
            )}
          </div>
        )}

        {/* Present staff list */}
        {presentStaff.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No hay personal registrado. Agrega a quienes están presentes.
          </div>
        ) : (
          <div className="space-y-3">
            {presentStaff.map((record) => (
              <div key={record.id} className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  {/* Staff info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{getStaffName(record.user_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {getStaffRole(record.user_id)}
                    </div>
                  </div>

                  {/* Evaluation toggles */}
                  <div className="flex items-center gap-1">
                    {/* Uniform */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            'h-9 w-9',
                            record.uniform_ok === true &&
                              'bg-green-100 border-green-500 text-green-700',
                            record.uniform_ok === false && 'bg-red-100 border-red-500 text-red-700',
                          )}
                          onClick={() =>
                            handleToggleEvaluation(record.id, 'uniform_ok', record.uniform_ok)
                          }
                          disabled={readOnly}
                        >
                          <Shirt className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Uniforme:{' '}
                        {record.uniform_ok === true
                          ? 'âœ“ Correcto'
                          : record.uniform_ok === false
                            ? 'âœ— Incorrecto'
                            : 'Sin evaluar'}
                      </TooltipContent>
                    </Tooltip>

                    {/* Station clean */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            'h-9 w-9',
                            record.station_clean === true &&
                              'bg-green-100 border-green-500 text-green-700',
                            record.station_clean === false &&
                              'bg-red-100 border-red-500 text-red-700',
                          )}
                          onClick={() =>
                            handleToggleEvaluation(record.id, 'station_clean', record.station_clean)
                          }
                          disabled={readOnly}
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Estación:{' '}
                        {record.station_clean === true
                          ? 'âœ“ Limpia'
                          : record.station_clean === false
                            ? 'âœ— Sucia'
                            : 'Sin evaluar'}
                      </TooltipContent>
                    </Tooltip>

                    {/* Observation button */}
                    {!readOnly && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn('h-9 w-9', record.observations && 'text-primary')}
                            onClick={() =>
                              handleStartEditObservation(record.id, record.observations)
                            }
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Agregar observación</TooltipContent>
                      </Tooltip>
                    )}

                    {/* Remove button */}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeStaff.mutate(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Observation display (read-only) */}
                {readOnly && record.observations && (
                  <div className="ml-4 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    {record.observations}
                  </div>
                )}

                {/* Observation input (editing) */}
                {editingObservation === record.id && (
                  <div className="ml-4 flex gap-2">
                    <Input
                      value={observationText}
                      onChange={(e) => setObservationText(e.target.value)}
                      placeholder="Observación sobre este empleado..."
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveObservation(record.id);
                        if (e.key === 'Escape') setEditingObservation(null);
                      }}
                    />
                    <Button size="sm" onClick={() => handleSaveObservation(record.id)}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingObservation(null)}>
                      Cancelar
                    </Button>
                  </div>
                )}

                {/* Show saved observation (not editing) */}
                {!readOnly && editingObservation !== record.id && record.observations && (
                  <div
                    className="ml-4 text-sm text-muted-foreground bg-muted/30 p-2 rounded cursor-pointer hover:bg-muted/50"
                    onClick={() => handleStartEditObservation(record.id, record.observations)}
                  >
                    {record.observations}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary with legend */}
        {presentStaff.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <div className="text-sm text-muted-foreground">
              {presentStaff.length} empleado{presentStaff.length !== 1 ? 's' : ''} presente
              {presentStaff.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shirt className="w-3 h-3" /> Uniforme
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Estación limpia
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
