/**
 * ClosureConfigPage - Configuración de Cierre de Turno desde Mi Marca
 *
 * Permite gestionar:
 * - Categorías de hamburguesas
 * - Tipos individuales (veggies, ultrasmash)
 * - Extras
 * - Apps de delivery
 */
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllClosureConfig, toggleClosureConfigItem, addClosureConfigItem, deleteClosureConfigItem } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import type { ClosureConfigItem, ConfigTipo } from '@/types/shiftClosure';

interface ConfigGroup {
  tipo: ConfigTipo;
  titulo: string;
  descripcion: string;
  items: ClosureConfigItem[];
}

import { RequireBrandPermission } from '@/components/guards';

function ClosureConfigPageContent() {
  const queryClient = useQueryClient();
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});

  // Fetch all config
  const { data: configItems, isLoading } = useQuery({
    queryKey: ['brand-closure-config-all'],
    queryFn: async () => {
      const data = await fetchAllClosureConfig();
      return data as ClosureConfigItem[];
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      toggleClosureConfigItem(id, activo as boolean),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-closure-config'] });
      toast.success('Configuración actualizada');
    },
    onError: (err: Error) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  // Add new item
  const addMutation = useMutation({
    mutationFn: async ({
      tipo,
      etiqueta,
      categoriaPadre,
    }: {
      tipo: ConfigTipo;
      etiqueta: string;
      categoriaPadre?: string;
    }) => {
      const clave = etiqueta
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      const maxOrden =
        configItems?.filter((i) => i.type === tipo).reduce((max, i) => Math.max(max, i.sort_order), 0) ||
        0;

      await addClosureConfigItem({
        type: tipo,
        key: clave,
        label: etiqueta,
        categoria_padre: categoriaPadre,
        sort_order: maxOrden + 1,
        is_active: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-closure-config'] });
      setNewItemLabel((prev) => ({ ...prev, [variables.tipo]: '' }));
      toast.success('Elemento agregado');
    },
    onError: (err: Error) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  // Delete item
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClosureConfigItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-closure-config'] });
      toast.success('Elemento eliminado');
    },
    onError: (err: Error) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  // Group items by type
  const groups: ConfigGroup[] = [
    {
      tipo: 'categoria_hamburguesa',
      titulo: 'Categorías de Hamburguesas',
      descripcion:
        'Categorías principales que se muestran en el formulario de cierre (Clásicas, Originales, etc.)',
      items: configItems?.filter((i) => i.type === 'categoria_hamburguesa') || [],
    },
    {
      tipo: 'tipo_hamburguesa',
      titulo: 'Tipos Específicos',
      descripcion:
        'Hamburguesas individuales dentro de categorías (Veggies â†’ Not American, Ultrasmash â†’ Ultra Cheese)',
      items: configItems?.filter((i) => i.type === 'tipo_hamburguesa') || [],
    },
    {
      tipo: 'extra',
      titulo: 'Extras',
      descripcion: 'Extras que se suman a la venta (Extra Carne, Extra Not Burger, etc.)',
      items: configItems?.filter((i) => i.type === 'extra') || [],
    },
    {
      tipo: 'app_delivery',
      titulo: 'Apps de Delivery',
      descripcion: 'Aplicaciones de delivery disponibles para registrar ventas',
      items: configItems?.filter((i) => i.tipo === 'app_delivery') || [],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerLoader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Cierre de Turno"
        subtitle="Define las categorías de hamburguesas, extras y apps de delivery que aparecen en el formulario de cierre."
      />

      {groups.map((group) => (
        <Card key={group.tipo}>
          <CardHeader>
            <CardTitle className="text-lg">{group.titulo}</CardTitle>
            <CardDescription>{group.descripcion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing items */}
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      {item.categoria_padre && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.categoria_padre}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`active-${item.id}`}
                        className="text-sm text-muted-foreground"
                      >
                        Activo
                      </Label>
                      <Switch
                        id={`active-${item.id}`}
                      checked={item.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: item.id, activo: checked })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {group.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay elementos configurados
                </p>
              )}
            </div>

            <Separator />

            {/* Add new item */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`new-${group.tipo}`}>Agregar nuevo</Label>
                <Input
                  id={`new-${group.tipo}`}
                  placeholder="Nombre del elemento..."
                  value={newItemLabel[group.tipo] || ''}
                  onChange={(e) =>
                    setNewItemLabel((prev) => ({ ...prev, [group.tipo]: e.target.value }))
                  }
                />
              </div>
              <Button
                onClick={() => {
                  if (newItemLabel[group.tipo]?.trim()) {
                    addMutation.mutate({
                      tipo: group.tipo,
                      etiqueta: newItemLabel[group.tipo].trim(),
                    });
                  }
                }}
                disabled={!newItemLabel[group.tipo]?.trim() || addMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ClosureConfigPage() {
  return (
    <RequireBrandPermission
      permission="canEditBrandConfig"
      noAccessMessage="Solo el Superadmin puede modificar la configuración de cierre."
    >
      <ClosureConfigPageContent />
    </RequireBrandPermission>
  );
}
