import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertEmployeeData, updateBranchRole } from '@/services/staffService';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Info, Briefcase } from 'lucide-react';
import type { EmployeeData } from './types';
import type { LocalRole } from '@/hooks/usePermissions';
import type { WorkPositionType } from '@/types/workPosition';
import { useWorkPositions } from '@/hooks/useWorkPositions';

const ROLE_OPTIONS: { value: LocalRole; label: string }[] = [
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

interface EmployeeDataModalProps {
  userId: string;
  branchId: string;
  existingData: EmployeeData | null | undefined;
  currentRole: LocalRole;
  roleId: string;
  currentDefaultPosition?: WorkPositionType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EmployeeDataModal({
  userId,
  branchId,
  existingData,
  currentRole,
  roleId,
  currentDefaultPosition,
  open,
  onOpenChange,
  onSuccess,
}: EmployeeDataModalProps) {
  const queryClient = useQueryClient();
  const { data: workPositions = [] } = useWorkPositions();

  // Personal data
  const [dni, setDni] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [personalAddress, setPersonalAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Banking data
  const [bankName, setBankName] = useState('');
  const [cbu, setCbu] = useState('');
  const [alias, setAlias] = useState('');
  const [cuil, setCuil] = useState('');

  // Labor data
  const [selectedRole, setSelectedRole] = useState<LocalRole>(currentRole);
  const [hireDate, setHireDate] = useState('');
  const [defaultPosition, setDefaultPosition] = useState<string>(currentDefaultPosition || '');
  const [registeredHours, setRegisteredHours] = useState<string>('');

  useEffect(() => {
    setDni(existingData?.dni || '');
    setBirthDate(existingData?.birth_date || '');
    setPersonalAddress(existingData?.personal_address || '');
    setEmergencyContact(existingData?.emergency_contact || '');
    setEmergencyPhone(existingData?.emergency_phone || '');
    setBankName(existingData?.bank_name || '');
    setCbu(existingData?.cbu || '');
    setAlias(existingData?.alias || '');
    setCuil(existingData?.cuil || '');
    setHireDate(existingData?.hire_date || '');
    setRegisteredHours(
      existingData?.registered_hours != null ? String(existingData.registered_hours) : '',
    );
  }, [existingData, userId, branchId]);

  useEffect(() => {
    setSelectedRole(currentRole);
    setDefaultPosition(currentDefaultPosition || '');
  }, [currentRole, currentDefaultPosition]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        user_id: userId,
        branch_id: branchId,
        dni: dni || null,
        birth_date: birthDate || null,
        personal_address: personalAddress || null,
        emergency_contact: emergencyContact || null,
        emergency_phone: emergencyPhone || null,
        bank_name: bankName || null,
        cbu: cbu || null,
        alias: alias || null,
        cuil: cuil || null,
        hire_date: hireDate || null,
        registered_hours: registeredHours ? parseInt(registeredHours, 10) : null,
      };

      await upsertEmployeeData(existingData?.id, data);

      if (roleId) {
        const roleUpdates: { local_role?: LocalRole; default_position?: string | null } = {};
        if (selectedRole !== currentRole) {
          roleUpdates.local_role = selectedRole;
        }
        if (defaultPosition !== (currentDefaultPosition || '')) {
          roleUpdates.default_position = defaultPosition || null;
        }
        if (Object.keys(roleUpdates).length > 0) {
          await updateBranchRole(roleId, roleUpdates);
        }
      }
    },
    onSuccess: () => {
      toast.success('Datos guardados correctamente');
      queryClient.invalidateQueries({ queryKey: ['employee-data', userId, branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Detectar errores de permisos RLS
      if (errorMessage.includes('row-level security') || errorMessage.includes('policy')) {
        toast.error('No tenés permisos para editar estos datos. Contactá al administrador.');
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        toast.error('Ya existe un registro con estos datos.');
      } else {
        toast.error(`Error al guardar: ${errorMessage}`);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar datos del empleado</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="banking">Bancarios</TabsTrigger>
            <TabsTrigger value="labor">Laboral</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="12.345.678"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={personalAddress}
                onChange={(e) => setPersonalAddress(e.target.value)}
                placeholder="Calle 123, Ciudad"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contacto de emergencia</Label>
                <Input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono emergencia</Label>
                <Input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+54 351 ..."
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="banking" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Banco Galicia"
              />
            </div>
            <div className="space-y-2">
              <Label>CBU</Label>
              <Input
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                placeholder="0070055530004..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="NOMBRE.APELLIDO.BANCO"
                />
              </div>
              <div className="space-y-2">
                <Label>CUIL</Label>
                <Input
                  value={cuil}
                  onChange={(e) => setCuil(e.target.value)}
                  placeholder="20-12345678-9"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="labor" className="space-y-4 mt-4">
            {/* Role Selector - Only if NOT franquiciado */}
            {currentRole !== 'franquiciado' && (
              <div className="space-y-2">
                <Label>Rol en el local</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as LocalRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Determina los permisos y acceso del colaborador en este local.
                </p>
              </div>
            )}

            {/* Default Position */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Posición predefinida
              </Label>
              <Select
                value={defaultPosition || 'none'}
                onValueChange={(v) => setDefaultPosition(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar posición..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin posición predefinida</SelectItem>
                  {workPositions.map((pos) => (
                    <SelectItem key={pos.key} value={pos.key}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Posición habitual del empleado. Se usará como valor por defecto al crear horarios.
              </p>
            </div>

            <Separator />

            {/* Hire Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de ingreso al trabajo
              </Label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Fecha real en que el colaborador comenzó a trabajar en la empresa.
                <br />
                <span className="text-primary">
                  Puede ser anterior al registro en el sistema
                </span>{' '}
                (para empleados antiguos).
              </p>
            </div>

            <Separator />

            {/* Registered Hours (horas en blanco) */}
            <div className="space-y-2">
              <Label>Horas registradas (en blanco)</Label>
              <Select
                value={registeredHours || 'not_set'}
                onValueChange={(v) => setRegisteredHours(v === 'not_set' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_set">No definido</SelectItem>
                  <SelectItem value="60">60 hs/mes (mínimo legal)</SelectItem>
                  <SelectItem value="96">96 hs/mes</SelectItem>
                  <SelectItem value="120">120 hs/mes</SelectItem>
                  <SelectItem value="150">150 hs/mes</SelectItem>
                  <SelectItem value="190">190 hs/mes (jornada completa)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cantidad de horas mensuales declaradas formalmente. Dato informativo para
                liquidación.
              </p>
            </div>

            {/* Info about PIN */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                El PIN de fichaje lo configura cada empleado desde su propio perfil en "Mi Cuenta".
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
