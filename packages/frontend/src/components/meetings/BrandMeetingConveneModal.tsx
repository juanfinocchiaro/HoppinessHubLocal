/**
 * BrandMeetingConveneModal - Modal para convocar reuniones de red desde Mi Marca
 * Permite seleccionar participantes de múltiples sucursales
 * Incluye validación de conflictos de horario
 */
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Users, Send, Building2, AlertTriangle } from 'lucide-react';
import {
  useConveneMeeting,
  useNetworkMembers,
  useCheckMeetingConflicts,
  type MeetingConflict,
} from '@/hooks/useMeetings';
import { MEETING_AREAS, type MeetingArea, type MeetingConveneData } from '@/types/meeting';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface BrandMeetingConveneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Role labels for display
const ROLE_LABELS: Record<string, string> = {
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function BrandMeetingConveneModal({ open, onOpenChange }: BrandMeetingConveneModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [area, setArea] = useState<MeetingArea>('operaciones');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [conflicts, setConflicts] = useState<MeetingConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const conveneMeeting = useConveneMeeting();
  const checkConflicts = useCheckMeetingConflicts();
  const { data: networkMembers = [], isLoading: loadingMembers } = useNetworkMembers();

  // Check for conflicts when date, time, or participants change
  useEffect(() => {
    if (!open || selectedIds.length === 0) {
      setConflicts([]);
      return;
    }

    const checkForConflicts = async () => {
      setCheckingConflicts(true);
      try {
        const result = await checkConflicts.mutateAsync({
          date: new Date(date),
          time,
          participantIds: selectedIds,
        });
        setConflicts(result);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error checking conflicts:', error);
      } finally {
        setCheckingConflicts(false);
      }
    };

    // Debounce the check
    const timeout = setTimeout(checkForConflicts, 500);
    return () => clearTimeout(timeout);
  }, [open, date, time, selectedIds]);

  // Get unique branches for filter
  const branches = useMemo(() => {
    const branchMap = new Map<string, string>();
    networkMembers.forEach((m) => {
      if (m.branch_id && m.branch_name) {
        branchMap.set(m.branch_id, m.branch_name);
      }
    });
    return Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }));
  }, [networkMembers]);

  // Get unique user IDs (a user can appear in multiple branches)
  const filteredMembers = useMemo(() => {
    let members = networkMembers;

    if (roleFilter !== 'all') {
      members = members.filter((m) => m.local_role === roleFilter);
    }

    if (branchFilter !== 'all') {
      members = members.filter((m) => m.branch_id === branchFilter);
    }

    // Group by user to show each user once with their branches
    const userMap = new Map<string, (typeof networkMembers)[0] & { branches: string[] }>();
    members.forEach((m) => {
      const existing = userMap.get(m.id);
      if (existing) {
        if (m.branch_name && !existing.branches.includes(m.branch_name)) {
          existing.branches.push(m.branch_name);
        }
      } else {
        userMap.set(m.id, {
          ...m,
          branches: m.branch_name ? [m.branch_name] : [],
        });
      }
    });

    return Array.from(userMap.values());
  }, [networkMembers, roleFilter, branchFilter]);

  const handleClose = () => {
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('10:00');
    setArea('operaciones');
    setSelectedIds([]);
    setRoleFilter('all');
    setBranchFilter('all');
    setConflicts([]);
    onOpenChange(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const selectAll = () => {
    const visibleIds = filteredMembers.map((m) => m.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const canSubmit = title.trim() && selectedIds.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      const data: MeetingConveneData = {
        title: title.trim(),
        date: new Date(date),
        time,
        area,
        participantIds: selectedIds,
        branchId: null, // Network meeting - no specific branch
      };

      await conveneMeeting.mutateAsync(data);
      toast.success('Reunión de red convocada exitosamente');
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al convocar la reunión');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nueva Reunión de Red
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la reunión</Label>
            <Input
              id="title"
              placeholder="Ej: Coordinación de encargados"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Área */}
          <div className="space-y-2">
            <Label>Área</Label>
            <Select value={area} onValueChange={(v) => setArea(v as MeetingArea)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtros de participantes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participantes ({selectedIds.length} seleccionados)
            </Label>

            <div className="flex gap-2">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="franquiciado">Franquiciados</SelectItem>
                  <SelectItem value="encargado">Encargados</SelectItem>
                  <SelectItem value="cajero">Cajeros</SelectItem>
                  <SelectItem value="empleado">Empleados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de participantes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredMembers.length} personas disponibles
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                {filteredMembers.every((m) => selectedIds.includes(m.id))
                  ? 'Deseleccionar'
                  : 'Seleccionar todos'}
              </Button>
            </div>

            <ScrollArea className="h-52 border rounded-md p-2">
              {loadingMembers ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Cargando participantes...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay participantes con los filtros seleccionados
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleMember(member.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {member.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.full_name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {member.local_role && (
                            <Badge variant="outline" className="text-[10px] px-1">
                              {ROLE_LABELS[member.local_role] || member.local_role}
                            </Badge>
                          )}
                          {member.branches.slice(0, 2).map((b) => (
                            <Badge key={b} variant="secondary" className="text-[10px] px-1">
                              {b}
                            </Badge>
                          ))}
                          {member.branches.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{member.branches.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <Alert variant="destructive" className="bg-warning/10 border-warning/30 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Conflictos de horario detectados:</strong>
                <ul className="mt-1 ml-4 list-disc text-xs">
                  {conflicts.map((c) => (
                    <li key={c.userId}>
                      <strong>{c.userName}</strong> ya tiene "{c.meetingTitle}" a las{' '}
                      {format(parseISO(c.meetingTime), 'HH:mm', { locale: es })}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || conveneMeeting.isPending || checkingConflicts}
          >
            <Send className="w-4 h-4 mr-1" />
            {conveneMeeting.isPending
              ? 'Convocando...'
              : conflicts.length > 0
                ? 'Convocar de todos modos'
                : 'Convocar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
