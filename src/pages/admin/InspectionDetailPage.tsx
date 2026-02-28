/**
 * InspectionDetailPage - Ejecutar o ver una visita de supervisión
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Check, X, AlertTriangle, Users } from 'lucide-react';
import { fetchBranchManagers, fetchBranchStaffMembers } from '@/services/adminService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  InspectionChecklist,
  InspectionSummary,
  InspectionActionItems,
  InspectionStaffChecklist,
} from '@/components/inspections';
import {
  useInspection,
  useCompleteInspection,
  useCancelInspection,
  useUpdateInspection,
} from '@/hooks/useInspections';
import { TYPE_SHORT_LABELS, STATUS_LABELS } from '@/types/inspection';
import type { InspectionActionItem } from '@/types/inspection';
import { cn } from '@/lib/utils';

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [generalNotes, setGeneralNotes] = useState('');
  const [criticalFindings, setCriticalFindings] = useState('');
  const [actionItems, setActionItems] = useState<InspectionActionItem[]>([]);
  const [presentManagerId, setPresentManagerId] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const { data: inspection, isLoading } = useInspection(id);
  const completeInspection = useCompleteInspection();
  const cancelInspection = useCancelInspection();
  const updateInspection = useUpdateInspection();

  // Initialize form values when inspection loads
  useEffect(() => {
    if (inspection) {
      setGeneralNotes(inspection.general_notes || '');
      setCriticalFindings(inspection.critical_findings || '');
      setActionItems(inspection.action_items || []);
      setPresentManagerId(inspection.present_manager_id || '');
    }
  }, [inspection]);

  // Fetch encargados for this branch (only encargado role)
  const { data: branchManagers } = useQuery({
    queryKey: ['branch-managers', inspection?.branch_id],
    queryFn: () => fetchBranchManagers(inspection!.branch_id),
    enabled: !!inspection?.branch_id,
  });

  // Fetch team members for action items (excluding franquiciados - they are owners, not staff)
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-for-actions', inspection?.branch_id],
    queryFn: () => fetchBranchStaffMembers(inspection!.branch_id),
    enabled: !!inspection?.branch_id,
  });

  // Handle manager change
  const handleManagerChange = async (managerId: string) => {
    const newValue = managerId === 'none' ? null : managerId;
    setPresentManagerId(newValue || '');

    if (id) {
      await updateInspection.mutateAsync({
        inspectionId: id,
        data: { present_manager_id: newValue },
      });
    }
  };

  // Calculate current score
  const currentScore = useMemo(() => {
    if (!inspection?.items) return 0;
    const applicable = inspection.items.filter((i) => i.complies !== null);
    const compliant = applicable.filter((i) => i.complies === true).length;
    return applicable.length > 0 ? Math.round((compliant / applicable.length) * 100) : 0;
  }, [inspection?.items]);

  // Check if all items are answered
  const allAnswered = useMemo(() => {
    if (!inspection?.items) return false;
    return inspection.items.every((i) => i.complies !== null);
  }, [inspection?.items]);

  // Non-compliant items
  const nonCompliantItems = useMemo(() => {
    return inspection?.items?.filter((i) => i.complies === false) || [];
  }, [inspection?.items]);

  const handleComplete = async () => {
    if (!id) return;

    await completeInspection.mutateAsync({
      inspectionId: id,
      data: {
        general_notes: generalNotes,
        critical_findings: criticalFindings,
        action_items: actionItems,
      },
    });

    navigate('/mimarca/supervisiones');
  };

  const handleCancel = async () => {
    if (!id) return;
    await cancelInspection.mutateAsync(id);
    navigate('/mimarca/supervisiones');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <HoppinessLoader />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Visita no encontrada</p>
      </div>
    );
  }

  const isEditable = inspection.status === 'en_curso';
  const scoreColor =
    currentScore >= 80
      ? 'text-green-600'
      : currentScore >= 60
        ? 'text-yellow-600'
        : 'text-destructive';

  const titleContent = `Visita ${TYPE_SHORT_LABELS[inspection.inspection_type]} - ${inspection.branch?.name || 'Sucursal'}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={titleContent}
        subtitle={format(new Date(inspection.started_at), "d 'de' MMMM yyyy, HH:mm", {
          locale: es,
        })}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={
                inspection.status === 'completada'
                  ? 'default'
                  : inspection.status === 'en_curso'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {STATUS_LABELS[inspection.status]}
            </Badge>
            <Button variant="ghost" onClick={() => navigate('/mimarca/supervisiones')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        }
      />

      {/* Score Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Puntaje Actual</div>
              <div className={cn('text-4xl font-bold', scoreColor)}>
                {currentScore}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {inspection.items?.filter((i) => i.complies === true).length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Cumple</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {nonCompliantItems.length}
                </div>
                <div className="text-xs text-muted-foreground">No Cumple</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {inspection.items?.filter((i) => i.complies === null).length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Pendiente</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Present Manager Selection */}
      {isEditable && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">Encargado Presente</div>
                <Select value={presentManagerId || 'none'} onValueChange={handleManagerChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {branchManagers?.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditable ? (
        /* Execution Mode */
        <Tabs defaultValue="checklist" className="space-y-4">
          <TabsList>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="cierre">Cierre</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4">
            <InspectionChecklist
              items={inspection.items || []}
              inspectionId={inspection.id}
              readOnly={false}
            />
          </TabsContent>

          <TabsContent value="personal" className="space-y-4">
            <InspectionStaffChecklist
              inspectionId={inspection.id}
              branchId={inspection.branch_id}
              readOnly={false}
            />
          </TabsContent>

          <TabsContent value="cierre" className="space-y-4">
            {/* Critical Findings */}
            {nonCompliantItems.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    Hallazgos ({nonCompliantItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {nonCompliantItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <span>{item.item_label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* General Notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Observaciones Generales</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Comentarios generales sobre la visita..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Critical Findings Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumen de Hallazgos Críticos</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={criticalFindings}
                  onChange={(e) => setCriticalFindings(e.target.value)}
                  placeholder="Hallazgos más importantes que requieren atención inmediata..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Action Items */}
            <InspectionActionItems
              value={actionItems}
              onChange={setActionItems}
              teamMembers={teamMembers || []}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancelar Visita
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowCompleteConfirm(true)}
                disabled={!allAnswered}
              >
                <Check className="w-4 h-4 mr-2" />
                Completar Visita
              </Button>
            </div>

            {!allAnswered && (
              <p className="text-sm text-muted-foreground text-center">
                Completa todos los ítems del checklist para poder cerrar la visita
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* View Mode */
        <InspectionSummary inspection={inspection} items={inspection.items} />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="¿Cancelar visita?"
        description="Esta acción no se puede deshacer. La visita quedará registrada como cancelada."
        confirmLabel="Cancelar Visita"
        onConfirm={handleCancel}
        variant="destructive"
      />

      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title="¿Completar visita?"
        description={`El puntaje final será ${currentScore}/100. Se notificará al encargado y franquiciado.`}
        confirmLabel="Completar"
        onConfirm={handleComplete}
      />
    </div>
  );
}
