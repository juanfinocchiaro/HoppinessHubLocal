/**
 * PermissionsConfigPage - Tablero de permisos configurables
 *
 * Permite al superadmin activar/desactivar permisos por rol.
 * Los permisos marcados como is_editable=false no pueden modificarse.
 */
import React from 'react';
import { Lock, Check, X, Shield, Building2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import {
  usePermissionConfig,
  BRAND_ROLES,
  LOCAL_ROLES,
  BRAND_ROLE_LABELS,
  LOCAL_ROLE_LABELS,
  type PermissionConfigRow,
} from '@/hooks/usePermissionConfig';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { PERMISSION_DESCRIPTIONS } from '@/constants/permissionDescriptions';

export default function PermissionsConfigPage() {
  const { isSuperadmin } = useDynamicPermissions();
  const {
    brandPermissions,
    localPermissions,
    brandCategories,
    localCategories,
    isLoading,
    togglePermission,
    updatePermission,
  } = usePermissionConfig();

  if (!isSuperadmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>No tenés permisos para acceder a esta página.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderPermissionGrid = (
    permissions: PermissionConfigRow[],
    categories: string[],
    roles: readonly string[],
    roleLabels: Record<string, string>,
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium w-48">Permiso</th>
            {roles.map((role) => (
              <th key={role} className="text-center py-3 px-2 font-medium w-16">
                {roleLabels[role]}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <React.Fragment key={`cat-${category}`}>
              <tr className="bg-muted/50">
                <td
                  colSpan={roles.length + 2}
                  className="py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wide"
                >
                  {category}
                </td>
              </tr>
              {permissions
                .filter((p) => p.category === category)
                .map((permission) => {
                  const description = PERMISSION_DESCRIPTIONS[permission.permission_key];

                  return (
                    <tr key={permission.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <span className="font-medium inline-flex items-center gap-1.5">
                          {permission.permission_label}
                          {description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-xs text-xs leading-relaxed"
                              >
                                {description}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </td>
                      {roles.map((role) => {
                        const hasRole = permission.allowed_roles.includes(role);
                        const isEditable = permission.is_editable;
                        const isUpdating = updatePermission.isPending;

                        return (
                          <td key={role} className="text-center py-2 px-2">
                            <button
                              onClick={() => isEditable && togglePermission(permission.id, role)}
                              disabled={!isEditable || isUpdating}
                              className={cn(
                                'w-8 h-8 rounded-full inline-flex items-center justify-center transition-all',
                                hasRole
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground',
                                isEditable &&
                                  !isUpdating &&
                                  'cursor-pointer hover:ring-2 hover:ring-primary/50',
                                !isEditable && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              {hasRole ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2">
                        {!permission.is_editable && (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                  );
                })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Configuración de Permisos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona qué puede hacer cada rol en la plataforma
            </p>
          </div>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-primary inline-flex items-center justify-center">
                  <Check className="w-2 h-2 text-primary-foreground" />
                </div>
                Habilitado
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-muted inline-flex items-center justify-center">
                  <X className="w-2 h-2 text-muted-foreground" />
                </div>
                Deshabilitado
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-4 h-4 text-muted-foreground" />
                No editable
              </span>
              <span className="flex items-center gap-1">
                <Info className="w-4 h-4 text-muted-foreground" />
                Info del permiso
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {/* Permisos de Marca */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Permisos de Marca
            </CardTitle>
            <CardDescription>Permisos para el panel Mi Marca (nivel central)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              {renderPermissionGrid(
                brandPermissions,
                brandCategories,
                BRAND_ROLES,
                BRAND_ROLE_LABELS,
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Permisos de Local */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              Permisos de Sucursal
            </CardTitle>
            <CardDescription>Permisos para el panel Mi Local (por sucursal)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              {renderPermissionGrid(
                localPermissions,
                localCategories,
                LOCAL_ROLES,
                LOCAL_ROLE_LABELS,
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
