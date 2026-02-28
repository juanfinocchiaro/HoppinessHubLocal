import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  Megaphone,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { fetchBrandCommunications, createBrandCommunication, deleteBrandCommunication } from '@/services/adminService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import ReadersModal from '@/components/communications/ReadersModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const TAGS = [
  { value: 'general', label: 'General' },
  { value: 'actualizacion_menu', label: 'Actualización de Menú' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'reglamento', label: 'Reglamento' },
  { value: 'operativo', label: 'Operativo' },
];

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

const TARGET_ROLE_OPTIONS = [
  { value: 'franquiciado', label: 'Franquiciados' },
  { value: 'encargado', label: 'Encargados' },
];

import { RequireBrandPermission } from '@/components/guards';

function CommunicationsPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [readersModal, setReadersModal] = useState<{
    open: boolean;
    id: string | null;
    title: string;
    requiresConfirmation: boolean;
  }>({
    open: false,
    id: null,
    title: '',
    requiresConfirmation: false,
  });
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'info' as 'info' | 'warning' | 'urgent' | 'celebration',
    tag: 'general',
    custom_label: '',
    target_all: true,
    target_franquiciado: false,
    target_encargado: false,
    requires_confirmation: false,
  });

  const { data: communications, isLoading } = useQuery({
    queryKey: ['brand-communications'],
    queryFn: fetchBrandCommunications,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado');

      let targetRoles: string[] | null = null;
      if (!formData.target_all) {
        const roles: string[] = [];
        if (formData.target_franquiciado) roles.push('franquiciado');
        if (formData.target_encargado) roles.push('encargado');
        targetRoles = roles.length > 0 ? roles : null;
      }

      await createBrandCommunication({
        title: formData.title,
        body: formData.body,
        type: formData.type,
        tag: formData.tag,
        custom_label: formData.custom_label || null,
        target_roles: targetRoles,
        source_type: 'brand',
        created_by: user.id,
        is_published: true,
        published_at: new Date().toISOString(),
        requires_confirmation: formData.requires_confirmation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-communications'] });
      toast.success('Comunicado enviado');
      setOpen(false);
      setFormData({
        title: '',
        body: '',
        type: 'info',
        tag: 'general',
        custom_label: '',
        target_all: true,
        target_franquiciado: false,
        target_encargado: false,
        requires_confirmation: false,
      });
    },
    onError: () => toast.error('Error al enviar comunicado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrandCommunication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-communications'] });
      toast.success('Comunicado eliminado');
    },
  });

  const getTypeInfo = (type: string) => TYPES.find((t) => t.value === type) || TYPES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            Comunicados de Marca
          </h1>
          <p className="text-muted-foreground">
            Envía comunicados a toda la red o a roles específicos
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Comunicado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Comunicado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del comunicado"
                />
              </div>

              <div className="space-y-2">
                <Label>Mensaje</Label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Escribe el contenido del comunicado..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={formData.tag}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, tag: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Etiqueta personalizada (opcional)</Label>
                <Input
                  value={formData.custom_label}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, custom_label: e.target.value }))
                  }
                  placeholder="Ej: Importante, Nuevo, etc."
                />
              </div>

              <div className="space-y-3">
                <Label>Destinatarios</Label>
                <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="target-all"
                      checked={formData.target_all}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData((prev) => ({
                            ...prev,
                            target_all: true,
                            target_franquiciado: false,
                            target_encargado: false,
                          }));
                        } else {
                          setFormData((prev) => ({ ...prev, target_all: false }));
                        }
                      }}
                    />
                    <Label htmlFor="target-all" className="text-sm font-medium cursor-pointer">
                      Todos
                    </Label>
                  </div>

                  <div className="pl-6 space-y-2 border-l-2 border-muted ml-2">
                    {TARGET_ROLE_OPTIONS.map((role) => (
                      <div key={role.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`target-${role.value}`}
                          checked={
                            formData[`target_${role.value}` as keyof typeof formData] as boolean
                          }
                          disabled={formData.target_all}
                          onCheckedChange={(checked) => {
                            setFormData((prev) => ({
                              ...prev,
                              [`target_${role.value}`]: checked === true,
                            }));
                          }}
                        />
                        <Label
                          htmlFor={`target-${role.value}`}
                          className={`text-sm cursor-pointer ${formData.target_all ? 'text-muted-foreground' : ''}`}
                        >
                          {role.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {!formData.target_all &&
                    !formData.target_franquiciado &&
                    !formData.target_encargado && (
                      <p className="text-xs text-amber-600 mt-1">
                        Seleccioná al menos un destinatario o marcá "Todos"
                      </p>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="requires-confirmation"
                  checked={formData.requires_confirmation}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, requires_confirmation: checked === true }))
                  }
                />
                <Label htmlFor="requires-confirmation" className="text-sm cursor-pointer">
                  Requiere confirmación del equipo
                </Label>
              </div>

              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!formData.title || !formData.body || createMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Comunicado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            const confirmedCount =
              comm.communication_reads?.filter((r: any) => r.confirmed_at).length || 0;

            return (
              <Card key={comm.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{comm.title}</h3>
                        <Badge variant="secondary">
                          {TAGS.find((t) => t.value === comm.tag)?.label || comm.tag}
                        </Badge>
                        {comm.custom_label && <Badge variant="outline">{comm.custom_label}</Badge>}
                        {comm.requires_confirmation && (
                          <Badge variant="default" className="bg-primary/80">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Requiere confirmación
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{comm.body}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(comm.published_at), 'd MMM yyyy HH:mm', { locale: es })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs hover:text-foreground"
                          onClick={() =>
                            setReadersModal({
                              open: true,
                              id: comm.id,
                              title: comm.title,
                              requiresConfirmation: comm.requires_confirmation || false,
                            })
                          }
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {readCount} lecturas
                          {comm.requires_confirmation && ` â€¢ ${confirmedCount} confirmaciones`}
                        </Button>
                        {comm.target_roles && comm.target_roles.length > 0 && (
                          <span>â†’ {comm.target_roles.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(comm.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay comunicados de marca</p>
          </CardContent>
        </Card>
      )}

      <ReadersModal
        open={readersModal.open}
        onOpenChange={(open) => setReadersModal((prev) => ({ ...prev, open }))}
        communicationId={readersModal.id}
        communicationTitle={readersModal.title}
        requiresConfirmation={readersModal.requiresConfirmation}
      />

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

export default function CommunicationsPage() {
  return (
    <RequireBrandPermission
      permission="canManageMessages"
      noAccessMessage="No tenés permisos para gestionar comunicados de marca."
    >
      <CommunicationsPageContent />
    </RequireBrandPermission>
  );
}
