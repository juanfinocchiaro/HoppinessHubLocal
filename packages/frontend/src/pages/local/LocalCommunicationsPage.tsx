import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Send,
  Bell,
  AlertTriangle,
  PartyPopper,
  Info,
  MessageSquare,
  Users,
  Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  fetchBranchForComms,
  fetchBranchTeamForComms,
  fetchLocalCommunications,
  createLocalCommunication,
  deleteLocalCommunication,
} from '@/services/communicationsService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { useUserCommunications, useMarkAsRead } from '@/hooks/useCommunications';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const TYPES = [
  { value: 'info', label: 'Información', icon: Info, color: 'bg-blue-500/10 text-blue-600' },
  {
    value: 'warning',
    label: 'Aviso',
    icon: AlertTriangle,
    color: 'bg-yellow-500/10 text-yellow-600',
  },
  { value: 'urgent', label: 'Urgente', icon: Bell, color: 'bg-red-500/10 text-red-600' },
  {
    value: 'celebration',
    label: 'Celebración',
    icon: PartyPopper,
    color: 'bg-green-500/10 text-green-600',
  },
];

export default function LocalCommunicationsPage() {
  const { branchId } = useParams();
  const { user } = useAuth();
  const { local } = useDynamicPermissions(branchId);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'info' as 'info' | 'warning' | 'urgent' | 'celebration',
  });
  const [targetType, setTargetType] = useState<'all' | 'selected'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => fetchBranchForComms(branchId!),
    enabled: !!branchId,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['branch-team-for-comms', branchId],
    queryFn: () => fetchBranchTeamForComms(branchId!),
    enabled: !!branchId,
  });

  const { data: communications, isLoading } = useQuery({
    queryKey: ['local-communications', branchId],
    queryFn: () => fetchLocalCommunications(branchId!),
    enabled: !!branchId,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || !branchId) throw new Error('No autenticado');

      await createLocalCommunication({
        title: formData.title,
        body: formData.body,
        type: formData.type,
        branchId,
        createdBy: user.id,
        targetRoles: targetType === 'selected' && selectedUsers.length > 0 ? selectedUsers : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-communications', branchId] });
      toast.success('Comunicado enviado al equipo');
      setOpen(false);
      setFormData({ title: '', body: '', type: 'info' });
      setTargetType('all');
      setSelectedUsers([]);
    },
    onError: () => toast.error('Error al enviar comunicado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLocalCommunication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-communications', branchId] });
      toast.success('Comunicado eliminado');
    },
  });

  const getTypeInfo = (type: string) => TYPES.find((t) => t.value === type) || TYPES[0];

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  // Get brand communications for this user
  const { data: userComms } = useUserCommunications();
  const brandCommsForMe = userComms?.brand || [];
  const unreadBrandCount = brandCommsForMe.filter((c) => !c.is_read).length;
  const markAsRead = useMarkAsRead();

  return (
    <div className="space-y-6">
      <PageHeader title="Comunicados" subtitle={branch?.name} />

      <Tabs defaultValue="sent" className="w-full">
        <TabsList>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            Mis Mensajes al Equipo
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2">
            <Inbox className="h-4 w-4" />
            De la Marca
            {unreadBrandCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center"
              >
                {unreadBrandCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          {/* New message button */}
          {local.canSendLocalCommunication && (
            <div className="flex justify-end mb-4">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Mensaje
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Mensaje para el Equipo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Título del mensaje"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mensaje</Label>
                      <Textarea
                        value={formData.body}
                        onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                        placeholder="Escribe el mensaje para tu equipo..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, type: v as typeof formData.type }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                <t.icon className="w-4 h-4" />
                                {t.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Recipients Selector */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Destinatarios
                      </Label>
                      <RadioGroup
                        value={targetType}
                        onValueChange={(v) => setTargetType(v as 'all' | 'selected')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="all" />
                          <label htmlFor="all" className="text-sm">
                            Todo el equipo
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="selected" id="selected" />
                          <label htmlFor="selected" className="text-sm">
                            Seleccionar empleados
                          </label>
                        </div>
                      </RadioGroup>

                      {targetType === 'selected' && (
                        <ScrollArea className="h-40 border rounded-md p-2">
                          <div className="space-y-2">
                            {teamMembers?.map((member) => (
                              <div key={member.user_id} className="flex items-center gap-2">
                                <Checkbox
                                  id={member.user_id!}
                                  checked={selectedUsers.includes(member.user_id!)}
                                  onCheckedChange={() => toggleUserSelection(member.user_id!)}
                                />
                                <label htmlFor={member.user_id!} className="text-sm cursor-pointer">
                                  {member.full_name || 'Sin nombre'}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}

                      {targetType === 'selected' && selectedUsers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedUsers.length} empleado(s) seleccionado(s)
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => createMutation.mutate()}
                      disabled={
                        !formData.title ||
                        !formData.body ||
                        createMutation.isPending ||
                        (targetType === 'selected' && selectedUsers.length === 0)
                      }
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar al Equipo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : communications && communications.length > 0 ? (
            <div className="space-y-4">
              {communications.map((comm) => {
                const typeInfo = getTypeInfo(comm.type);
                const TypeIcon = typeInfo.icon;
                const readCount = comm.communication_reads?.length || 0;

                return (
                  <Card key={comm.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate mb-1">{comm.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{comm.body}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(comm.published_at), 'd MMM yyyy HH:mm', {
                                locale: es,
                              })}
                            </span>
                            <span>👁 {readCount} lecturas</span>
                            {comm.target_roles && comm.target_roles.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {comm.target_roles.length} destinatarios
                              </Badge>
                            )}
                          </div>
                        </div>
                        {local.canSendLocalCommunication && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(comm.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay mensajes para tu equipo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Los comunicados que envíes solo serán visibles para el personal de esta sucursal
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {brandCommsForMe.length > 0 ? (
            <div className="space-y-4">
              {brandCommsForMe.map((comm) => {
                const typeInfo = getTypeInfo(comm.type);
                const TypeIcon = typeInfo.icon;

                return (
                  <Card
                    key={comm.id}
                    className={!comm.is_read ? 'border-primary/30 bg-primary/5' : ''}
                    onClick={() => !comm.is_read && markAsRead.mutate(comm.id)}
                  >
                    <CardContent className="p-4 cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{comm.title}</h3>
                            {!comm.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{comm.body}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(comm.published_at), 'd MMM yyyy HH:mm', {
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay comunicados de la marca</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar comunicado"
        description="¿Estás seguro de que querés eliminar este comunicado? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
