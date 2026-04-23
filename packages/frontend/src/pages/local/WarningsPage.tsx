/**
 * WarningsPage - Gestión de apercibimientos de empleados
 * Fase 6: Migrado a user_id, con upload de documento firmado
 * V2: Con tabs Todos / Por Empleado / Informes
 */
import { useState, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBranchTeamMembersBasic,
  fetchBranchWarnings,
  createWarningRecord,
  uploadWarningSignature,
} from '@/services/warningsService';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  AlertTriangle,
  MessageSquare,
  FileText,
  Clock,
  UserX,
  CheckCircle,
  Search,
  Upload,
  Image,
  ExternalLink,
  User,
  BarChart3,
} from 'lucide-react';
import type { Tables } from '@/types/database';
import { EmployeeWarningsHistory, WarningsReport } from '@/components/warnings';

type Branch = Tables<'branches'>;

interface Warning {
  id: string;
  user_id: string;
  branch_id: string;
  warning_type: string;
  description: string;
  warning_date: string;
  issued_by: string;
  acknowledged_at: string | null;
  signed_document_url: string | null;
  is_active: boolean;
  created_at: string;
  employee_name?: string;
  issuer_name?: string;
}

const WARNING_TYPES = [
  {
    value: 'verbal',
    label: 'Llamado de atención verbal',
    icon: MessageSquare,
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'written',
    label: 'Apercibimiento escrito',
    icon: FileText,
    color: 'bg-orange-100 text-orange-800',
  },
  { value: 'lateness', label: 'Llegada tarde', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  { value: 'absence', label: 'Inasistencia', icon: UserX, color: 'bg-red-100 text-red-800' },
  {
    value: 'suspension',
    label: 'Suspensión',
    icon: AlertTriangle,
    color: 'bg-red-200 text-red-900',
  },
  { value: 'other', label: 'Otro', icon: AlertTriangle, color: 'bg-gray-100 text-gray-800' },
];

export default function WarningsPage() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const { user } = useAuth();
  const { local } = useDynamicPermissions(branchId);
  const queryClient = useQueryClient();

  const [showNewWarning, setShowNewWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [warningType, setWarningType] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Upload state
  const [uploadingWarningId, setUploadingWarningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch team members using user_role_assignments + profiles
  const { data: teamMembers } = useQuery({
    queryKey: ['branch-team-members', branchId],
    queryFn: () => fetchBranchTeamMembersBasic(branchId!),
    enabled: !!branchId,
  });

  // Fetch warnings
  const { data: warnings, isLoading } = useQuery({
    queryKey: ['branch-warnings', branchId],
    queryFn: () => fetchBranchWarnings(branchId!) as Promise<Warning[]>,
    enabled: !!branchId,
  });

  // Create warning mutation
  const createWarning = useMutation({
    mutationFn: () =>
      createWarningRecord({
        userId: selectedUser,
        branchId: branchId!,
        warningType,
        description,
        warningDate: incidentDate,
        issuedBy: user?.id!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-warnings'] });
      toast.success('Apercibimiento registrado');
      setShowNewWarning(false);
      resetForm();
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error(error);
      toast.error('Error al registrar el apercibimiento');
    },
  });

  // Upload signed document mutation
  const uploadSignedDocument = useMutation({
    mutationFn: async ({ warningId, file }: { warningId: string; file: File }) => {
      const warning = warnings?.find((w) => w.id === warningId);
      if (!warning) throw new Error('Apercibimiento no encontrado');
      await uploadWarningSignature(warningId, warning.user_id, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-warnings'] });
      toast.success('Documento firmado subido correctamente');
      setUploadingWarningId(null);
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error(error);
      toast.error('Error al subir el documento');
      setUploadingWarningId(null);
    },
  });

  const resetForm = () => {
    setSelectedUser('');
    setWarningType('');
    setDescription('');
    setIncidentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleFileSelect = (warningId: string) => {
    setUploadingWarningId(warningId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingWarningId) {
      uploadSignedDocument.mutate({ warningId: uploadingWarningId, file });
    }
    e.target.value = '';
  };

  const getWarningTypeBadge = (type: string) => {
    const config = WARNING_TYPES.find((t) => t.value === type) || WARNING_TYPES[5];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Filter warnings
  const filteredWarnings =
    warnings?.filter((w) => {
      if (!searchQuery) return true;
      return (
        w.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }) || [];

  // Stats by type
  const warningsByType = WARNING_TYPES.map((type) => ({
    ...type,
    count: warnings?.filter((w) => w.warning_type === type.value).length || 0,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <PageHeader
        title="Apercibimientos"
        subtitle={branch?.name}
        actions={
          local.canCreateWarning ? (
            <Dialog open={showNewWarning} onOpenChange={setShowNewWarning}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Apercibimiento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Apercibimiento</DialogTitle>
                  <DialogDescription>
                    Este registro será visible para el empleado en su cuenta
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Empleado *</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers?.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id!}>
                            {member.full_name || 'Sin nombre'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={warningType} onValueChange={setWarningType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de apercibimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        {WARNING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha del incidente *</Label>
                    <Input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción *</Label>
                    <Textarea
                      placeholder="Describí la situación..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewWarning(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => createWarning.mutate()}
                    disabled={
                      !selectedUser || !warningType || !description || createWarning.isPending
                    }
                  >
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="by-employee" className="gap-2">
            <User className="h-4 w-4" />
            Por Empleado
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Informes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Stats by type */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {warningsByType.map((type) => (
              <Card key={type.value} className={type.count > 0 ? '' : 'opacity-50'}>
                <CardContent className="p-4 text-center">
                  <type.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{type.count}</p>
                  <p className="text-xs text-muted-foreground truncate">{type.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empleado o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Warnings Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Documento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No hay apercibimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWarnings.map((warning) => (
                    <TableRow key={warning.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(warning.warning_date), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{warning.employee_name}</TableCell>
                      <TableCell>{getWarningTypeBadge(warning.warning_type)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate">{warning.description}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{warning.issuer_name}</TableCell>
                      <TableCell>
                        {warning.acknowledged_at ? (
                          <Badge variant="outline" className="gap-1 text-primary">
                            <CheckCircle className="h-3 w-3" />
                            Visto
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {warning.signed_document_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary"
                            onClick={() => window.open(warning.signed_document_url!, '_blank')}
                          >
                            <Image className="h-4 w-4" />
                            Ver
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        ) : local.canUploadSignature ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleFileSelect(warning.id)}
                            disabled={
                              uploadSignedDocument.isPending && uploadingWarningId === warning.id
                            }
                          >
                            <Upload className="h-4 w-4" />
                            Subir firma
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pendiente</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="by-employee" className="mt-4">
          <EmployeeWarningsHistory
            teamMembers={teamMembers?.map((m) => ({
              user_id: m.user_id!,
              full_name: m.full_name || '',
            }))}
            warnings={warnings}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <WarningsReport warnings={warnings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
