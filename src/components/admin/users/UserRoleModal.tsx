import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBrandRole, insertBrandRole, deactivateBranchRole, updateBranchRoleById, insertBranchRole } from '@/services/adminService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import type { UserWithStats, Branch } from './types';
import type { BrandRole, LocalRole } from '@/hooks/usePermissions';
import { useWorkPositions } from '@/hooks/useWorkPositions';

interface UserRoleModalProps {
  user: UserWithStats;
  branches: Branch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BRAND_ROLES: { value: BrandRole; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'contador_marca', label: 'Contador Marca' },
  { value: 'informes', label: 'Informes' },
];

const LOCAL_ROLES: { value: LocalRole; label: string }[] = [
  { value: 'franquiciado', label: 'Franquiciado' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

interface BranchRoleEdit {
  branch_id: string;
  local_role: LocalRole;
  default_position: string | null;
  existing_id: string | null; // null = new
  toDelete?: boolean;
}

export function UserRoleModal({
  user,
  branches,
  open,
  onOpenChange,
  onSuccess,
}: UserRoleModalProps) {
  const queryClient = useQueryClient();
  const { data: workPositions = [] } = useWorkPositions();

  // Brand role state
  const [hasBrandAccess, setHasBrandAccess] = useState(!!user.brand_role);
  const [brandRole, setBrandRole] = useState<BrandRole>(user.brand_role || 'coordinador');

  // Branch roles state - nueva arquitectura
  const [branchRoles, setBranchRoles] = useState<BranchRoleEdit[]>(() =>
    user.branch_roles.map((br) => ({
      branch_id: br.branch_id,
      local_role: br.local_role,
      default_position: br.default_position,
      existing_id: br.role_record_id,
    })),
  );

  // Available branches (not already assigned)
  const availableBranches = branches.filter(
    (b) => !branchRoles.some((br) => br.branch_id === b.id && !br.toDelete),
  );

  const addBranchRole = () => {
    if (availableBranches.length === 0) return;
    setBranchRoles((prev) => [
      ...prev,
      {
        branch_id: availableBranches[0].id,
        local_role: 'empleado',
        default_position: null,
        existing_id: null,
      },
    ]);
  };

  const updateBranchRole = (index: number, updates: Partial<BranchRoleEdit>) => {
    setBranchRoles((prev) => prev.map((br, i) => (i === index ? { ...br, ...updates } : br)));
  };

  const removeBranchRole = (index: number) => {
    const role = branchRoles[index];
    if (role.existing_id) {
      // Marcar para eliminar
      updateBranchRole(index, { toDelete: true });
    } else {
      // Eliminar del estado
      setBranchRoles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const finalBrandRole = hasBrandAccess ? brandRole : null;

      if (user.brand_role_id) {
        await updateBrandRole(user.brand_role_id, finalBrandRole);
      } else if (finalBrandRole) {
        await insertBrandRole(user.user_id!, finalBrandRole);
      }

      for (const br of branchRoles) {
        if (br.toDelete && br.existing_id) {
          await deactivateBranchRole(br.existing_id);
        } else if (br.existing_id) {
          await updateBranchRoleById(br.existing_id, br.local_role, br.default_position);
        } else if (!br.toDelete) {
          await insertBranchRole(user.user_id!, br.branch_id, br.local_role, br.default_position);
        }
      }
    },
    onSuccess: () => {
      toast.success('Roles actualizados');
      queryClient.invalidateQueries({ queryKey: ['admin-users-consolidated'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error al guardar');
      if (import.meta.env.DEV) console.error(error);
    },
  });

  const activeBranchRoles = branchRoles.filter((br) => !br.toDelete);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar roles de {user.full_name || user.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Brand Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Acceso a Mi Marca</Label>
              <Switch checked={hasBrandAccess} onCheckedChange={setHasBrandAccess} />
            </div>

            {hasBrandAccess && (
              <Select value={brandRole || ''} onValueChange={(v) => setBrandRole(v as BrandRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value!}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Branch Roles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Acceso a Sucursales</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBranchRole}
                disabled={availableBranches.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {activeBranchRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin acceso a sucursales</p>
            ) : (
              <div className="space-y-3">
                {branchRoles.map((br, index) => {
                  if (br.toDelete) return null;
                  const branchName =
                    branches.find((b) => b.id === br.branch_id)?.name || 'Sucursal';

                  return (
                    <div
                      key={`${br.branch_id}-${index}`}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        {/* Branch selector at top if new, otherwise show name */}
                        {!br.existing_id ? (
                          <Select
                            value={br.branch_id}
                            onValueChange={(v) => updateBranchRole(index, { branch_id: v })}
                          >
                            <SelectTrigger className="h-8 w-48 font-medium text-sm">
                              <SelectValue placeholder="Seleccionar sucursal" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...availableBranches, branches.find((b) => b.id === br.branch_id)!]
                                .filter(Boolean)
                                .map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-medium text-sm">{branchName}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBranchRole(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Rol Sistema</Label>
                          <Select
                            value={br.local_role || ''}
                            onValueChange={(v) =>
                              updateBranchRole(index, { local_role: v as LocalRole })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCAL_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value!}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Posición Habitual</Label>
                          <Select
                            value={br.default_position || 'none'}
                            onValueChange={(v) =>
                              updateBranchRole(index, {
                                default_position: v === 'none' ? null : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin definir</SelectItem>
                              {workPositions.map((p) => (
                                <SelectItem key={p.key} value={p.key}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
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
