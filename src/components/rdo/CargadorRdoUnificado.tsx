import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Circle, Edit2, Info, Save, Loader2 } from 'lucide-react';
import { getCurrentPeriodo } from '@/types/compra';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import {
  useRdoMovimientos,
  useRdoMovimientoMutations,
  type RdoMovimientoFormData,
} from '@/hooks/useRdoMovimientos';
import type { RdoCategory } from '@/types/rdo';

// Section definitions matching the document
const LOADER_SECTIONS = [
  {
    key: 'cmv',
    title: 'CMV (Costo de Mercadería Vendida)',
    parentCode: 'cmv',
    origen: 'consumo_inventario',
    instructions: 'Cargar consumos del mes. Puede venir de inventario o carga manual.',
  },
  {
    key: 'comisiones',
    title: 'Comisiones por Venta',
    parentCode: 'comisiones_venta',
    origen: 'comision_plataforma',
    instructions: 'Cargar comisiones de MP Point, Rappi y PedidosYa del informe mensual.',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    parentCode: 'delivery',
    origen: 'manual',
    instructions: 'Total pagado a cadetes RappiBoy y terceros.',
  },
  {
    key: 'fee_marca',
    title: 'Fee de Marca',
    parentCode: 'publicidad_marca',
    origen: 'fee_marca',
    instructions: 'Canon y Marketing se calculan automáticamente sobre ventas.',
    readOnly: true,
  },
  {
    key: 'estructura',
    title: 'Estructura Operativa',
    parentCode: 'estructura_operativa',
    origen: 'compra_directa',
    instructions:
      'Estos costos vienen de facturas de proveedores. Solo cargá lo que no tenga factura.',
  },
  {
    key: 'laborales',
    title: 'Costos Laborales',
    parentCode: 'costos_laborales',
    origen: 'nomina',
    instructions: 'Sueldos y cargas sociales del mes.',
  },
  {
    key: 'admin',
    title: 'Administración',
    parentCode: 'administracion',
    origen: 'compra_directa',
    instructions: 'Software, contador, bromatología. Vienen de facturas normalmente.',
  },
  {
    key: 'servicios',
    title: 'Servicios e Infraestructura',
    parentCode: 'servicios_infraestructura',
    origen: 'compra_directa',
    instructions: 'Alquiler, expensas, gas, internet, energía.',
  },
];

interface Props {
  branchId: string;
  branchName?: string;
}

export function CargadorRdoUnificado({ branchId, branchName }: Props) {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const { data: allCategories = [] } = useRdoCategories();
  const { data: movimientos = [] } = useRdoMovimientos(branchId, periodo);
  const { upsertManual } = useRdoMovimientoMutations();

  const periodos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Group categories by parent
  const categoriesByParent = useMemo(() => {
    const map = new Map<string, RdoCategory[]>();
    for (const cat of allCategories) {
      if (cat.level === 3 && cat.parent_code) {
        const list = map.get(cat.parent_code) || [];
        list.push(cat);
        map.set(cat.parent_code, list);
      }
    }
    return map;
  }, [allCategories]);

  // Compute loaded amounts by category
  const loadedByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movimientos) {
      const current = map.get(m.rdo_category_code) || 0;
      map.set(m.rdo_category_code, current + Number(m.amount ?? 0));
    }
    return map;
  }, [movimientos]);

  // Calculate progress
  const totalSections = LOADER_SECTIONS.length;
  const loadedSections = LOADER_SECTIONS.filter((section) => {
    const cats = categoriesByParent.get(section.parentCode) || [];
    return cats.some((c) => (loadedByCategory.get(c.code) || 0) > 0);
  }).length;
  const progressPct = totalSections > 0 ? (loadedSections / totalSections) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cargador RDO</h2>
          <p className="text-sm text-muted-foreground">
            Carga mensual de costos {branchName ? `— ${branchName}` : ''}
          </p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodos.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso de carga</span>
            <Badge variant={progressPct === 100 ? 'default' : 'secondary'}>
              {loadedSections}/{totalSections} secciones
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="grid gap-4">
        {LOADER_SECTIONS.map((section) => {
          const cats = categoriesByParent.get(section.parentCode) || [];
          const sectionTotal = cats.reduce(
            (sum, c) => sum + (loadedByCategory.get(c.code) || 0),
            0,
          );
          const hasData = sectionTotal > 0;

          return (
            <Card key={section.key} className={hasData ? 'border-primary/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasData ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      $ {sectionTotal.toLocaleString('es-AR')}
                    </span>
                    {!section.readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSection(section.key)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {section.readOnly && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {section.instructions}
                  </p>
                )}
              </CardHeader>
              {cats.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {cats.map((cat) => {
                      const val = loadedByCategory.get(cat.code) || 0;
                      return (
                        <div key={cat.code} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cat.name}</span>
                          <span
                            className={`font-mono ${val > 0 ? '' : 'text-muted-foreground/50'}`}
                          >
                            $ {val.toLocaleString('es-AR')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingSection && (
        <SectionEditModal
          section={LOADER_SECTIONS.find((s) => s.key === editingSection)!}
          categories={
            categoriesByParent.get(
              LOADER_SECTIONS.find((s) => s.key === editingSection)!.parentCode,
            ) || []
          }
          loadedByCategory={loadedByCategory}
          branchId={branchId}
          periodo={periodo}
          onClose={() => setEditingSection(null)}
          onSave={upsertManual}
        />
      )}
    </div>
  );
}

interface SectionEditModalProps {
  section: (typeof LOADER_SECTIONS)[0];
  categories: RdoCategory[];
  loadedByCategory: Map<string, number>;
  branchId: string;
  periodo: string;
  onClose: () => void;
  onSave: ReturnType<typeof useRdoMovimientoMutations>['upsertManual'];
}

function SectionEditModal({
  section,
  categories,
  loadedByCategory,
  branchId,
  periodo,
  onClose,
  onSave,
}: SectionEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.code, String(loadedByCategory.get(c.code) || '')])),
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const cat of categories) {
        const amount = parseFloat(values[cat.code] || '0') || 0;
        const payload: RdoMovimientoFormData = {
          branch_id: branchId,
          period: periodo,
          rdo_category_code: cat.code,
          origen: section.origen,
          amount,
          descripcion: notes || undefined,
        };
        await onSave.mutateAsync(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{section.title}</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{section.instructions}</span>
        </div>

        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.code} className="flex items-center gap-3">
              <Label className="flex-1 text-sm">{cat.name}</Label>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-7 text-right font-mono"
                  value={values[cat.code]}
                  onChange={(e) => setValues({ ...values, [cat.code]: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones sobre esta carga..."
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm font-medium">
            Total:{' '}
            <span className="font-mono">
              ${' '}
              {Object.values(values)
                .reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
                .toLocaleString('es-AR')}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
