import { useState } from 'react';
import { getSession } from '@/services/authService';
import {
  findBranchRole,
  findProfileByEmail,
  reactivateBranchMember,
  sendStaffInvitation,
} from '@/services/staffService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import {
  Loader2,
  Mail,
  UserPlus,
  CheckCircle,
  Search,
  ArrowLeft,
  AlertCircle,
  User,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

type LocalRole = 'encargado' | 'cajero' | 'empleado';
type SearchStatus = 'idle' | 'searching' | 'found' | 'not_found';
type BranchMemberStatus = 'available' | 'already_active' | 'inactive';

interface FoundUser {
  id: string;
  full_name: string;
  email: string;
}

interface BranchRoleInfo {
  status: BranchMemberStatus;
  currentRole?: string;
}

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  onSuccess?: () => void;
}

const INVITABLE_ROLES: { value: LocalRole; label: string }[] = [
  { value: 'encargado', label: 'Encargado' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Colaborador' },
];

export function InviteStaffDialog({
  open,
  onOpenChange,
  branchId,
  branchName,
  onSuccess,
}: InviteStaffDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<LocalRole>('cajero');
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [branchRoleInfo, setBranchRoleInfo] = useState<BranchRoleInfo | null>(null);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail('');
      setRole('cajero');
      setSearchStatus('idle');
      setFoundUser(null);
      setBranchRoleInfo(null);
      setLoading(false);
    }
    onOpenChange(isOpen);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (searchStatus !== 'idle') {
      setSearchStatus('idle');
      setFoundUser(null);
      setBranchRoleInfo(null);
    }
  };

  const handleSearch = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      toast.error('Ingresá un email válido');
      return;
    }

    setSearchStatus('searching');

    try {
      const { data: profile, error } = await findProfileByEmail(email);

      if (error) {
        handleError(error, {
          userMessage: 'Error al buscar el usuario',
          context: 'InviteStaffDialog.handleSearch',
        });
        setSearchStatus('idle');
        return;
      }

      if (!profile) {
        setFoundUser(null);
        setBranchRoleInfo(null);
        setSearchStatus('not_found');
        return;
      }

      setFoundUser(profile);

      // Check if user already has a role in this branch
      const { data: existingRole } = await findBranchRole(profile.id, branchId);

      if (existingRole) {
        if (existingRole.is_active) {
          setBranchRoleInfo({
            status: 'already_active',
            currentRole: existingRole.local_role,
          });
        } else {
          setBranchRoleInfo({
            status: 'inactive',
            currentRole: existingRole.local_role,
          });
          setRole(existingRole.local_role as LocalRole);
        }
      } else {
        setBranchRoleInfo({ status: 'available' });
      }

      setSearchStatus('found');
    } catch (error) {
      handleError(error, {
        userMessage: 'Error al buscar el usuario',
        context: 'InviteStaffDialog.handleSearch',
      });
      setSearchStatus('idle');
    }
  };

  const handleReset = () => {
    setSearchStatus('idle');
    setFoundUser(null);
    setBranchRoleInfo(null);
    setEmail('');
    setRole('cajero');
  };

  const handleReactivate = async () => {
    if (!foundUser) return;

    setLoading(true);
    try {
      const { error } = await reactivateBranchMember(foundUser.id, branchId, role);

      if (error) throw error;

      toast.success(`${foundUser.full_name} reactivado en el equipo`);
      handleClose(false);
      onSuccess?.();
    } catch (error) {
      handleError(error, {
        userMessage: 'Error al reactivar colaborador',
        context: 'InviteStaffDialog.handleReactivate',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (r: string) => {
    switch (r) {
      case 'encargado':
        return 'Encargado';
      case 'cajero':
        return 'Cajero';
      case 'empleado':
        return 'Colaborador';
      case 'franquiciado':
        return 'Franquiciado';
      default:
        return r;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await sendStaffInvitation({
        email: email.toLowerCase().trim(),
        role,
        branch_id: branchId,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al procesar solicitud');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const action = response.data?.action;
      if (action === 'added') {
        toast.success(response.data.message || `Colaborador agregado al equipo`, {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        });
      } else {
        toast.success(response.data.message || `Invitación enviada a ${email}`);
      }

      handleClose(false);
      onSuccess?.();
    } catch (error) {
      handleError(error, {
        userMessage: 'Error al procesar la solicitud',
        context: 'InviteStaffDialog.handleSubmit',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (r: LocalRole) => {
    switch (r) {
      case 'encargado':
        return 'Gestiona equipo, horarios, comunicados y operación diaria';
      case 'cajero':
        return 'Carga ventas, fichaje y visualiza horarios';
      case 'empleado':
        return 'Fichaje y visualiza horarios y comunicados';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Colaborador
          </DialogTitle>
          <DialogDescription>
            {searchStatus === 'idle' || searchStatus === 'searching'
              ? `Buscá el email del colaborador para agregarlo al equipo de ${branchName}.`
              : searchStatus === 'found' && branchRoleInfo?.status === 'already_active'
                ? `Este colaborador ya está activo en el equipo.`
                : searchStatus === 'found' && branchRoleInfo?.status === 'inactive'
                  ? `Podés reactivar a este ex-colaborador.`
                  : searchStatus === 'found'
                    ? `Confirmá el rol para agregar a ${foundUser?.full_name} al equipo.`
                    : `El email no está registrado. Podés enviar una invitación.`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Search */}
        {(searchStatus === 'idle' || searchStatus === 'searching') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del colaborador</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@email.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSearch}
                disabled={searchStatus === 'searching' || !email.trim()}
              >
                {searchStatus === 'searching' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2a: User Found - Already Active */}
        {searchStatus === 'found' && foundUser && branchRoleInfo?.status === 'already_active' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium text-sm">Ya es parte del equipo</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{foundUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Rol actual: {getRoleName(branchRoleInfo.currentRole || '')}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Podés editar su rol desde la lista de equipo.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleReset}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Buscar otro
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleClose(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2b: User Found - Inactive (Ex-collaborator) */}
        {searchStatus === 'found' && foundUser && branchRoleInfo?.status === 'inactive' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
                <RefreshCw className="h-4 w-4" />
                <span className="font-medium text-sm">Ex-colaborador encontrado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{foundUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Rol anterior: {getRoleName(branchRoleInfo.currentRole || '')}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Este colaborador estuvo en el equipo y fue dado de baja. Podés reactivarlo con un
              nuevo rol.
            </p>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as LocalRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{getRoleDescription(role)}</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleReset}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Buscar otro
              </Button>
              <Button onClick={handleReactivate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reactivando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reactivar colaborador
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2c: User Found - Available (New to branch) */}
        {searchStatus === 'found' && foundUser && branchRoleInfo?.status === 'available' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium text-sm">Usuario encontrado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-700 dark:text-green-300" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{foundUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as LocalRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{getRoleDescription(role)}</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleReset}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Buscar otro
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar al equipo
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2b: User Not Found */}
        {searchStatus === 'not_found' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium text-sm">Usuario no encontrado</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                El email <strong>{email}</strong> no está registrado en el sistema. Se enviará una
                invitación para que pueda registrarse.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as LocalRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{getRoleDescription(role)}</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleReset}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Buscar otro
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar invitación
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
