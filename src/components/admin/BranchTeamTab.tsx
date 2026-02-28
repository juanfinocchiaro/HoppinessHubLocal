import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBranchTeam, searchUsersByEmail, updateBranchMemberRole, updateBranchMemberPosition, addBranchMember, removeBranchMember } from '@/services/adminService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import {
  Search,
  UserPlus,
  Users,
  Home,
  Briefcase,
  UsersRound,
  ChevronDown,
  ChevronUp,
  UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { type LocalRole } from '@/hooks/usePermissions';
import { useWorkPositions } from '@/hooks/useWorkPositions';
import type { WorkPositionType } from '@/types/workPosition';

interface BranchTeamTabProps {
  branchId: string;
  branchName: string;
}

interface TeamMember {
  user_id: string;
  local_role: string;
  default_position: WorkPositionType | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

const AVAILABLE_ROLES: { value: LocalRole; label: string }[] = [
  { value: 'franquiciado', label: 'Franquiciado' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

const getRoleLabel = (role: string): string => {
  return AVAILABLE_ROLES.find((r) => r.value === role)?.label || role;
};

export default function BranchTeamTab({ branchId, branchName }: BranchTeamTabProps) {
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    user_id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<LocalRole>('empleado');
  const [selectedPosition, setSelectedPosition] = useState<string>('none');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Fetch work positions dynamically
  const { data: workPositions = [] } = useWorkPositions();

  // Simplified query: only team members, no coaching data
  const { data: team = [], isLoading } = useQuery({
    queryKey: ['branch-team', branchId],
    queryFn: async () => {
      const members = await fetchBranchTeam(branchId);
      return members as TeamMember[];
    },
    enabled: !!branchId,
  });

  // Group team by role
  const grouped = {
    propietarios: team.filter((m) => m.local_role === 'franquiciado'),
    encargados: team.filter((m) => m.local_role === 'encargado'),
    staff: team.filter((m) => ['cajero', 'empleado', 'contador_local'].includes(m.local_role)),
  };

  // Search for users to add
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['search-users-for-branch', searchEmail, branchId],
    queryFn: async () => {
      if (searchEmail.length < 3) return [];
      const data = await searchUsersByEmail(searchEmail);
      const existingUserIds = new Set(team.map((t) => t.user_id));
      return data.filter((u) => !existingUserIds.has(u.id));
    },
    enabled: searchEmail.length >= 3,
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: LocalRole }) =>
      updateBranchMemberRole(userId, branchId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Rol actualizado');
      setExpandedMember(null);
    },
    onError: (error) =>
      handleError(error, {
        userMessage: 'Error al actualizar rol',
        context: 'BranchTeamTab.updateRole',
      }),
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ userId, position }: { userId: string; position: string | null }) =>
      updateBranchMemberPosition(userId, branchId, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Posición actualizada');
    },
    onError: (error) =>
      handleError(error, {
        userMessage: 'Error al actualizar posición',
        context: 'BranchTeamTab.updatePosition',
      }),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({
      userId,
      role,
      position,
    }: {
      userId: string;
      role: LocalRole;
      position: string | null;
    }) => addBranchMember(userId, branchId, role, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Miembro agregado al equipo');
      setShowAddModal(false);
      setSelectedUser(null);
      setSearchEmail('');
      setSelectedPosition('none');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Este usuario ya está en el equipo');
      } else {
        handleError(error, {
          userMessage: 'Error al agregar miembro',
          context: 'BranchTeamTab.addMember',
        });
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeBranchMember(userId, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      toast.success('Miembro dado de baja');
      setMemberToRemove(null);
    },
    onError: (error) =>
      handleError(error, {
        userMessage: 'Error al dar de baja',
        context: 'BranchTeamTab.removeMember',
      }),
  });

  const handleSelectUser = (user: (typeof searchResults)[0]) => {
    setSelectedUser({ user_id: user.id, full_name: user.full_name, email: user.email });
    setShowAddModal(true);
  };

  const handleConfirmAdd = () => {
    if (selectedUser) {
      addMemberMutation.mutate({
        userId: selectedUser.user_id,
        role: selectedRole,
        position: selectedPosition === 'none' ? null : selectedPosition,
      });
    }
  };

  const getPositionLabel = (key: string | null) => {
    if (!key) return 'Sin definir';
    return workPositions.find((p) => p.key === key)?.label || key;
  };

  // Member row component for staff
  const MemberRow = ({ member, canEdit = true }: { member: TeamMember; canEdit?: boolean }) => {
    const isExpanded = expandedMember === member.user_id;
    const [editRole, setEditRole] = useState<LocalRole>(member.local_role as LocalRole);
    const [editPosition, setEditPosition] = useState<string>(member.default_position || 'none');

    const handleSave = () => {
      if (editRole !== member.local_role) {
        updateRoleMutation.mutate({ userId: member.user_id, newRole: editRole });
      }
      if ((editPosition === 'none' ? null : editPosition) !== member.default_position) {
        updatePositionMutation.mutate({
          userId: member.user_id,
          position: editPosition === 'none' ? null : editPosition,
        });
      }
      setExpandedMember(null);
    };

    return (
      <Collapsible
        open={isExpanded}
        onOpenChange={(open) => setExpandedMember(open ? member.user_id : null)}
      >
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.profile?.avatar_url || ''} />
              <AvatarFallback>
                {member.profile?.full_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{member.profile?.full_name || 'Usuario'}</p>
              <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{getRoleLabel(member.local_role)}</Badge>

              {member.default_position && (
                <Badge variant="outline" className="hidden sm:flex">
                  {getPositionLabel(member.default_position)}
                </Badge>
              )}

              {canEdit && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Editar
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          <CollapsibleContent>
            <div className="border-t p-4 bg-muted/30 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as LocalRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ROLES.filter((r) => r.value !== 'franquiciado').map((role) => (
                        <SelectItem key={role.value} value={role.value!}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Posición habitual</Label>
                  <Select value={editPosition} onValueChange={setEditPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin definir</SelectItem>
                      {workPositions.map((pos) => (
                        <SelectItem key={pos.key} value={pos.key}>
                          {pos.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="destructive" size="sm" onClick={() => setMemberToRemove(member)}>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Dar de baja
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExpandedMember(null)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateRoleMutation.isPending || updatePositionMutation.isPending}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipo de {branchName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipo de {branchName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search to add */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email para agregar..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />

              {searchEmail.length >= 3 && (
                <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                  {searching ? (
                    <div className="p-3 text-center text-muted-foreground">Buscando...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full p-3 text-left hover:bg-muted flex items-center gap-3"
                      >
                        <UserPlus className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Propietarios Section */}
        {grouped.propietarios.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4" />
                Propietarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.propietarios.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {member.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.profile?.full_name || 'Usuario'}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.profile?.email}
                    </p>
                  </div>

                  <Badge variant="secondary">Franquiciado/a</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Encargados Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Encargados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped.encargados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay encargados asignados
              </p>
            ) : (
              grouped.encargados.map((member) => <MemberRow key={member.user_id} member={member} />)
            )}
          </CardContent>
        </Card>

        {/* Staff Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {grouped.staff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay empleados asignados
              </p>
            ) : (
              grouped.staff.map((member) => <MemberRow key={member.user_id} member={member} />)
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add member modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar al equipo</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Rol en {branchName}</Label>
                <Select
                  value={selectedRole || 'empleado'}
                  onValueChange={(v) => setSelectedRole(v as LocalRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value!}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posición habitual</Label>
                <Select value={selectedPosition} onValueChange={(v) => setSelectedPosition(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin definir</SelectItem>
                    {workPositions.map((pos) => (
                      <SelectItem key={pos.key} value={pos.key}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esta es la posición que se asignará automáticamente al crear horarios.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAdd} disabled={addMemberMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm remove member */}
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Dar de baja"
        description={`¿Estás seguro de que deseas dar de baja a ${memberToRemove?.profile?.full_name || 'este usuario'}? Ya no tendrá acceso a este local.`}
        confirmLabel="Dar de baja"
        onConfirm={() => memberToRemove && removeMemberMutation.mutate(memberToRemove.user_id)}
        variant="destructive"
      />
    </>
  );
}
