import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchProfileClockPin,
  updateEmployeeNotes,
  deactivateBranchRole,
} from '@/services/staffService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  Plus,
  Pencil,
  UserX,
  Copy,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEmployeeDetails } from './useTeamData';
import { WarningModal } from './WarningModal';
import { EmployeeDataModal } from './EmployeeDataModal';
import type { TeamMember, NoteEntry } from './types';
import { WARNING_TYPE_LABELS, calculateAge } from './types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmployeeExpandedRowProps {
  member: TeamMember;
  branchId: string;
  onClose: () => void;
  onMemberUpdated: () => void;
}

export function EmployeeExpandedRow({
  member,
  branchId,
  onClose,
  onMemberUpdated,
}: EmployeeExpandedRowProps) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { employeeData, warnings } = useEmployeeDetails(member.user_id, branchId);

  const [newNote, setNewNote] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ['profile-clock-pin', member.user_id],
    queryFn: () => fetchProfileClockPin(member.user_id),
  });

  const hasClockPin = !!profileData?.clock_pin;

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const newNoteEntry = {
        date: new Date().toISOString(),
        note,
        by: currentUser?.id || '',
      };

      const currentNotes = (employeeData?.internal_notes || []) as NoteEntry[];
      const updatedNotes = [...currentNotes, newNoteEntry];

      await updateEmployeeNotes(employeeData?.id, member.user_id, branchId, updatedNotes);
    },
    onSuccess: () => {
      toast.success('Nota agregada');
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['employee-data', member.user_id, branchId] });
    },
    onError: () => toast.error('Error al agregar nota'),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateBranchRole(member.role_id),
    onSuccess: () => {
      toast.success('Empleado desactivado');
      onMemberUpdated();
      onClose();
    },
    onError: () => toast.error('Error al desactivar'),
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const age = calculateAge(employeeData?.birth_date || null);

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: Personal Data */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Datos personales</h4>

        {/* Clock PIN Status */}
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          {hasClockPin ? (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            >
              PIN configurado
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
            >
              Sin PIN de fichaje
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {member.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{member.phone}</span>
            </div>
          )}

          {employeeData?.dni && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>DNI: {employeeData.dni}</span>
            </div>
          )}

          {employeeData?.personal_address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{employeeData.personal_address}</span>
            </div>
          )}

          {employeeData?.birth_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(parseISO(employeeData.birth_date), 'dd/MM/yyyy', { locale: es })}
                {age && <span className="text-muted-foreground"> ({age} años)</span>}
              </span>
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="pt-2 border-t">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Apercibimientos ({warnings.length})
            </h5>
            <div className="space-y-1 text-sm">
              {warnings.slice(0, 3).map((w) => (
                <div key={w.id} className="text-muted-foreground">
                  ⚠️ {format(new Date(w.warning_date), 'dd/MM', { locale: es })} -{' '}
                  {WARNING_TYPE_LABELS[w.warning_type]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Column 2: Banking + Notes */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Datos bancarios</h4>

        <div className="space-y-2 text-sm">
          {employeeData?.bank_name && <div>🏦 {employeeData.bank_name}</div>}

          {employeeData?.cbu && (
            <div className="flex items-center gap-2">
              <span className="truncate">CBU: {employeeData.cbu.slice(0, 10)}...</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => copyToClipboard(employeeData.cbu!)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}

          {employeeData?.alias && (
            <div className="flex items-center gap-2">
              <span>Alias: {employeeData.alias}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => copyToClipboard(employeeData.alias!)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}

          {employeeData?.cuil && <div>CUIL: {employeeData.cuil}</div>}
        </div>

        {/* Internal Notes */}
        <div className="pt-2 border-t">
          <h5 className="font-medium text-sm mb-2">Notas internas</h5>
          <div className="space-y-1 text-sm mb-2">
            {((employeeData?.internal_notes as NoteEntry[]) || []).slice(-3).map((note, i) => (
              <p key={i} className="text-muted-foreground italic">
                "{note.note}"
              </p>
            ))}
            {(!employeeData?.internal_notes ||
              (employeeData.internal_notes as NoteEntry[]).length === 0) && (
              <p className="text-muted-foreground text-xs">Sin notas</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Agregar nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNoteMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column 3: Actions */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Acciones</h4>

        <div className="space-y-2">
          {/* HR actions - hidden for franchisees (they are owners, not employees) */}
          {member.local_role !== 'franquiciado' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(`/milocal/${branchId}/equipo/fichajes`)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver fichajes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(`/milocal/${branchId}/equipo/horarios`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Ver horarios
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(`/milocal/${branchId}/tiempo/liquidacion`)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Ver liquidación
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-amber-600"
                onClick={() => setShowWarningModal(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Nuevo apercibimiento
              </Button>
            </>
          )}

          {/* These actions are always visible */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowEditModal(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar datos
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start text-destructive">
                <UserX className="h-4 w-4 mr-2" />
                Desactivar empleado
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desactivar a este empleado?</AlertDialogTitle>
                <AlertDialogDescription>
                  El empleado perderá acceso al sistema. Podés reactivarlo en cualquier momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deactivateMutation.mutate()}>
                  Desactivar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {showWarningModal && (
        <WarningModal
          userId={member.user_id}
          branchId={branchId}
          open={showWarningModal}
          onOpenChange={setShowWarningModal}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['employee-warnings', member.user_id, branchId],
            });
            queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
          }}
        />
      )}

      {showEditModal && (
        <EmployeeDataModal
          userId={member.user_id}
          branchId={branchId}
          existingData={employeeData}
          currentRole={member.local_role}
          roleId={member.role_id}
          currentDefaultPosition={member.default_position}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['employee-data', member.user_id, branchId],
            });
            onMemberUpdated();
          }}
        />
      )}
    </div>
  );
}
