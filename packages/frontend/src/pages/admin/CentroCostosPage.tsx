import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { recalcularTodosLosCostos } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, BookOpen, RefreshCw, BarChart3, Calculator, DollarSign } from 'lucide-react';
import {
  useItemsCarta,
  useItemCartaMutations,
} from '@/hooks/useItemsCarta';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { useMenuCategorias } from '@/hooks/useMenu';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import { useAuth } from '@/hooks/useAuth';
import { enrich, groupByCat, fcColor } from '@/components/centro-costos/helpers';
import type { Tab } from '@/components/centro-costos/types';
// Tables type removed - using any for renamed tables
import type { LucideIcon } from 'lucide-react';

import { AnalisisTab } from '@/components/centro-costos/AnalisisTab';
import { SimuladorTab } from '@/components/centro-costos/SimuladorTab';
import { ActualizarTab } from '@/components/centro-costos/ActualizarTab';
import { ItemFormModal } from '@/components/centro-costos/ItemFormModal';
import { ComposicionModal } from '@/components/centro-costos/ComposicionModal';
import { HistorialModal } from '@/components/centro-costos/HistorialModal';


export default function CentroCostosPage() {
  const { data: items, isLoading, refetch, isFetching } = useItemsCarta();
  const { data: preparaciones } = usePreparaciones();
  const { data: insumos } = useInsumos();
  const { data: categorias } = useMenuCategorias();
  const { data: rdoCategories } = useRdoCategories();
  const { user } = useAuth();
  const mutations = useItemCartaMutations();
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      await recalcularTodosLosCostos();
      await refetch();
    } finally {
      setRecalculating(false);
    }
  }, [refetch]);

  const [tab, setTab] = useState<Tab>('analisis');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [compItem, setCompItem] = useState<any | null>(null);
  const [histItem, setHistItem] = useState<any | null>(null);
  const [delItem, setDelItem] = useState<any | null>(null);
  const [simPrices, setSimPrices] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Record<string, number>>({});

  const cmvCats = useMemo(
    () =>
      rdoCategories?.filter(
        (c) => c.level === 3 && (c.parent_code?.startsWith('cmv') || c.code?.startsWith('cmv')),
      ) || [],
    [rdoCategories],
  );
  const ei = useMemo(() => enrich(items || []), [items]);
  const cats = useMemo(() => groupByCat(ei, categorias), [ei, categorias]);

  const gs = useMemo(() => {
    const w = ei.filter((i) => i.hasComp && i.hasPrice);
    const n = w.length || 1;
    const cmv = w.reduce((s, i) => s + i.fc, 0) / n;
    const obj = w.reduce((s, i) => s + i.fcObj, 0) / n;
    const mg = w.reduce((s, i) => s + i.margen, 0) / n;
    return {
      cmv, obj, mg, total: ei.length,
      sinP: ei.filter((i) => !i.hasPrice).length,
      sinC: ei.filter((i) => !i.hasComp).length,
      ok: w.filter((i) => i.color === 'ok').length,
      warn: w.filter((i) => i.color === 'warn').length,
      danger: w.filter((i) => i.color === 'danger').length,
      gColor: fcColor(cmv, obj),
    };
  }, [ei]);

  const applySim = () => {
    setPending((p) => ({ ...p, ...simPrices }));
    setTab('actualizar');
  };

  const tabs: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'analisis', label: 'Análisis', icon: BarChart3 },
    { id: 'simulador', label: 'Simulador', icon: Calculator },
    { id: 'actualizar', label: 'Actualizar Precios', icon: DollarSign, count: Object.keys(pending).length || undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Control de Costos" subtitle="Análisis de márgenes, simulación y ajuste de precios" />
        <div className="flex items-center gap-2">
          <Link to="/mimarca/carta"><Button variant="outline" size="sm"><BookOpen className="w-4 h-4 mr-2" /> Ir a Carta</Button></Link>
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating || isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recalculating || isFetching ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculando...' : 'Actualizar Costos'}
          </Button>
          <Button onClick={() => { setEditingItem(null); setCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Nuevo Item</Button>
        </div>
      </div>

      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const I = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <I className="w-4 h-4" />{t.label}
                {t.count ? <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs">{t.count}</Badge> : null}
              </button>
            );
          })}
        </div>
      </div>

      

      {tab === 'analisis' && (
        <AnalisisTab items={ei} cats={cats} gs={gs} loading={isLoading}
          onQueuePrice={(id, price) => { setPending((p) => ({ ...p, [id]: price })); setTab('actualizar'); }} />
      )}
      {tab === 'simulador' && (
        <SimuladorTab items={ei} gs={gs} sim={simPrices} setSim={setSimPrices} onApply={applySim} />
      )}
      {tab === 'actualizar' && (
        <ActualizarTab items={ei} pending={pending} setPending={setPending} mutations={mutations} userId={user?.id} />
      )}

      <ItemFormModal open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditingItem(null); }}
        item={editingItem} categorias={categorias} cmvCats={cmvCats} mutations={mutations} />
      {compItem && (
        <ComposicionModal open={!!compItem} onOpenChange={() => setCompItem(null)}
          item={compItem} preparaciones={preparaciones || []} insumos={insumos || []} mutations={mutations} />
      )}
      {histItem && (
        <HistorialModal open={!!histItem} onOpenChange={() => setHistItem(null)} item={histItem} />
      )}
      <ConfirmDialog open={!!delItem} onOpenChange={() => setDelItem(null)}
        title="Eliminar item" description={`¿Eliminar "${delItem?.name}"?`}
        confirmLabel="Eliminar" variant="destructive"
        onConfirm={async () => { await mutations.softDelete.mutateAsync(delItem!.id); setDelItem(null); }} />
    </div>
  );
}
