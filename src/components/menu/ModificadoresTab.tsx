import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Ban, PlusCircle, ArrowRightLeft, Package } from 'lucide-react';
import { useModificadores, useModificadoresMutations } from '@/hooks/useModificadores';
import { useInsumos } from '@/hooks/useInsumos';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useItemCartaComposicion } from '@/hooks/useItemsCarta';
import { useItemIngredientesDeepList } from '@/hooks/useItemIngredientesDeepList';
import { useGruposOpcionales } from '@/hooks/useGruposOpcionales';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { NewRemovibleForm } from './NewRemovibleForm';
import { NewExtraForm } from './NewExtraForm';
import { NewSustitucionForm } from './NewSustitucionForm';
import type { Modificador } from './modificadores-types';

interface Props {
  itemId: string;
}

export function ModificadoresTab({ itemId }: Props) {
  const { data: modificadores, isLoading } = useModificadores(itemId);
  const { create, update, remove } = useModificadoresMutations();
  const { data: insumos } = useInsumos();
  const { data: recetas } = usePreparaciones();
  const { data: composicion } = useItemCartaComposicion(itemId);
  const { data: deepGroups } = useItemIngredientesDeepList(itemId);
  const { data: gruposOpcionales } = useGruposOpcionales(itemId);

  const [showNewRemovible, setShowNewRemovible] = useState(false);
  const [showNewExtra, setShowNewExtra] = useState(false);
  const [showNewSustitucion, setShowNewSustitucion] = useState(false);

  const ingredientesDelItem = useMemo(() => {
    if (!deepGroups) return [];
    return deepGroups.flatMap((g) =>
      g.ingredientes.map((ing) => ({
        id: ing.insumo_id,
        nombre: ing.nombre,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        costo_por_unidad_base: ing.costo_por_unidad_base,
        _fromItem: true,
        _recetaOrigen: ing.receta_origen,
      })),
    );
  }, [deepGroups]);

  const removibles: Modificador[] =
    modificadores?.filter((m: Modificador) => m.tipo === 'removible') || [];
  const extras: Modificador[] =
    modificadores?.filter((m: Modificador) => m.tipo === 'extra') || [];
  const sustituciones: Modificador[] =
    modificadores?.filter((m: Modificador) => m.tipo === 'sustitucion') || [];

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* ═══ REMOVIBLES ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" />
              Removibles
              <Badge variant="secondary" className="ml-1">
                {removibles.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewRemovible(true)}
              disabled={showNewRemovible}
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ingredientes que el cliente puede pedir SIN. No se cobra menos.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {removibles.length === 0 && !showNewRemovible && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay removibles configurados
            </p>
          )}
          {removibles.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  SIN
                </Badge>
                <div>
                  <p className="font-medium text-sm">{mod.nombre}</p>
                  {mod.cantidad_ahorro > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {mod.cantidad_ahorro} {mod.unidad_ahorro} · Ahorro:{' '}
                      {formatCurrency(mod.costo_ahorro)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={mod.activo}
                  onCheckedChange={(checked) =>
                    update.mutate({ id: mod.id, data: { activo: checked } })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => remove.mutate(mod.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {showNewRemovible && (
            <NewRemovibleForm
              itemId={itemId}
              ingredientes={ingredientesDelItem}
              deepGroups={deepGroups || []}
              insumos={insumos || []}
              composicion={composicion || []}
              onCreate={create}
              onClose={() => setShowNewRemovible(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* ═══ EXTRAS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-green-600" />
              Extras
              <Badge variant="secondary" className="ml-1">
                {extras.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewExtra(true)}
              disabled={showNewExtra}
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ingredientes o recetas que el cliente puede agregar pagando extra.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {extras.length === 0 && !showNewExtra && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay extras configurados
            </p>
          )}
          {extras.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-green-600 border-green-600/30">
                  EXTRA
                </Badge>
                <div>
                  <p className="font-medium text-sm">{mod.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {mod.cantidad_extra} {mod.unidad_extra} · Costo:{' '}
                    {formatCurrency(mod.costo_extra)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-sm text-green-600">
                  +{formatCurrency(mod.precio_extra)}
                </span>
                {mod.precio_extra > 0 && (
                  <Badge
                    variant={mod.costo_extra / mod.precio_extra <= 0.32 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    FC {((mod.costo_extra / mod.precio_extra) * 100).toFixed(0)}%
                  </Badge>
                )}
                <Switch
                  checked={mod.activo}
                  onCheckedChange={(checked) =>
                    update.mutate({ id: mod.id, data: { activo: checked } })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => remove.mutate(mod.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {showNewExtra && (
            <NewExtraForm
              itemId={itemId}
              ingredientes={ingredientesDelItem}
              deepGroups={deepGroups || []}
              insumos={insumos || []}
              recetas={recetas || []}
              onCreate={create}
              onClose={() => setShowNewExtra(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* ═══ OPCIONALES (read-only, from grupos) ═══ */}
      {gruposOpcionales && gruposOpcionales.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Opcionales
              <Badge variant="secondary" className="ml-1">
                {gruposOpcionales.length}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Grupos de opciones configurados en la composición del item. Solo lectura.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {gruposOpcionales.map((grupo) => (
              <div key={grupo.id} className="p-3 border rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                      GRUPO
                    </Badge>
                    <span className="font-medium text-sm">{grupo.nombre}</span>
                  </div>
                  <span className="font-mono text-sm">
                    Prom: {formatCurrency(grupo.costo_promedio || 0)}
                  </span>
                </div>
                {grupo.items && grupo.items.length > 0 && (
                  <div className="pl-6 space-y-0.5">
                    {grupo.items.map((gi) => (
                      <div
                        key={gi.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>{gi.insumos?.nombre || gi.preparaciones?.nombre || '—'}</span>
                        <span className="font-mono">
                          {formatCurrency(gi.cantidad * gi.costo_unitario)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══ SUSTITUCIONES ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Sustituciones
              <Badge variant="secondary" className="ml-1">
                {sustituciones.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewSustitucion(true)}
              disabled={showNewSustitucion}
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cambiar un ingrediente por otro. Puede tener cargo extra o ser gratis.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {sustituciones.length === 0 && !showNewSustitucion && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay sustituciones configuradas
            </p>
          )}
          {sustituciones.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-blue-600 border-blue-600/30">
                  CAMBIO
                </Badge>
                <div>
                  <p className="font-medium text-sm">{mod.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {mod.diferencia_precio !== 0 ? (
                  <span
                    className={`font-mono font-medium text-sm ${mod.diferencia_precio > 0 ? 'text-green-600' : 'text-destructive'}`}
                  >
                    {mod.diferencia_precio > 0 ? '+' : ''}
                    {formatCurrency(mod.diferencia_precio)}
                  </span>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Gratis
                  </Badge>
                )}
                <Switch
                  checked={mod.activo}
                  onCheckedChange={(checked) =>
                    update.mutate({ id: mod.id, data: { activo: checked } })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => remove.mutate(mod.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {showNewSustitucion && (
            <NewSustitucionForm
              itemId={itemId}
              ingredientes={ingredientesDelItem}
              insumos={insumos || []}
              onCreate={create}
              onClose={() => setShowNewSustitucion(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
