import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import { Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePromociones, usePromocionMutations,
  type Promocion, type PromocionFormData,
} from '@/hooks/usePromociones';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { fetchPromoItemsWithExtras } from '@/services/adminService';

import { PromosByDay } from '@/components/promociones/PromosByDay';
import { PromoFormFields } from '@/components/promociones/PromoFormFields';
import { EMPTY_FORM, ALL_CANALES } from '@/components/promociones/constants';
import { getDraftSignature, buildFormFromPromo } from '@/components/promociones/helpers';
import type { PromoItemDraft, PromoItemExtraDraft, PromoEditDraft } from '@/components/promociones/types';

export default function PromocionesPage() {
  const { data: promos, isLoading } = usePromociones();
  const { data: allItems = [] } = useItemsCarta();
  const { create, update, toggleActive, remove } = usePromocionMutations();

  const [creatingNew, setCreatingNew] = useState(false);
  const [deleting, setDeleting] = useState<Promocion | null>(null);
  const [createForm, setCreateForm] = useState<PromocionFormData>(EMPTY_FORM);
  const [createPromoItems, setCreatePromoItems] = useState<PromoItemDraft[]>([]);
  const [createItemSearch, setCreateItemSearch] = useState('');
  const [openPromoIds, setOpenPromoIds] = useState<string[]>([]);
  const [promoDrafts, setPromoDrafts] = useState<Record<string, PromoEditDraft>>({});
  const [confirmClosePromo, setConfirmClosePromo] = useState<Promocion | null>(null);

  const menuItems = useMemo(
    () => (allItems as Array<{ id: string; nombre: string; tipo: string; activo: boolean; precio_base: number; imagen_url?: string | null }>)
      .filter((i) => i.tipo === 'item' && i.activo),
    [allItems],
  );

  const getSearchResults = (itemSearch: string, promoItems: PromoItemDraft[]) => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return menuItems
      .filter((i) => i.nombre.toLowerCase().includes(q))
      .filter((i) => !promoItems.some((pi) => pi.item_carta_id === i.id))
      .slice(0, 8);
  };

  const fetchPromoItems = async (promoId: string): Promise<PromoItemDraft[]> => {
    return fetchPromoItemsWithExtras(promoId) as Promise<PromoItemDraft[]>;
  };

  const openCreate = () => { setCreateForm(EMPTY_FORM); setCreatePromoItems([]); setCreateItemSearch(''); setCreatingNew(true); };
  const closePromoNow = (promoId: string) => {
    setOpenPromoIds((prev) => prev.filter((id) => id !== promoId));
    setPromoDrafts((prev) => { const next = { ...prev }; delete next[promoId]; return next; });
  };

  const openEdit = async (promo: Promocion) => {
    setOpenPromoIds((prev) => prev.includes(promo.id) ? prev : [...prev, promo.id]);
    if (promoDrafts[promo.id]) return;
    setPromoDrafts((prev) => ({ ...prev, [promo.id]: { form: buildFormFromPromo(promo), promoItems: [], itemSearch: '', initialSignature: '', loading: true } }));
    const loadedItems = await fetchPromoItems(promo.id);
    const loadedForm = buildFormFromPromo(promo);
    const initialSignature = getDraftSignature(loadedForm, loadedItems);
    setPromoDrafts((prev) => ({ ...prev, [promo.id]: { form: loadedForm, promoItems: loadedItems, itemSearch: '', initialSignature, loading: false } }));
    setCreatingNew(false);
  };

  const requestClosePromo = (promo: Promocion) => {
    const draft = promoDrafts[promo.id];
    if (!draft || draft.loading) { closePromoNow(promo.id); return; }
    if (getDraftSignature(draft.form, draft.promoItems) !== draft.initialSignature) { setConfirmClosePromo(promo); return; }
    closePromoNow(promo.id);
  };

  const openDuplicate = async (promo: Promocion) => {
    const loadedItems = await fetchPromoItems(promo.id);
    setCreateForm({ ...buildFormFromPromo(promo), nombre: `${promo.nombre} (Copia)` });
    setCreatePromoItems(loadedItems);
    setCreateItemSearch('');
    setCreatingNew(true);
  };

  const addItem = (item: { id: string; nombre: string; precio_base: number; imagen_url?: string | null }, setItems: Dispatch<SetStateAction<PromoItemDraft[]>>, setSearch: Dispatch<SetStateAction<string>>) => {
    setItems((prev) => [...prev, { item_carta_id: item.id, nombre: item.nombre, imagen_url: item.imagen_url, precio_base: Number(item.precio_base), precio_promo: Number(item.precio_base) }]);
    setSearch('');
  };

  const applyPercentageToAll = (form: PromocionFormData, setItems: Dispatch<SetStateAction<PromoItemDraft[]>>) => {
    if (form.tipo !== 'descuento_porcentaje' || form.valor <= 0) return;
    setItems((prev) => prev.map((i) => {
      const extrasTotal = (i.preconfigExtras || []).reduce((s, e) => s + e.precio_extra * e.cantidad, 0);
      return { ...i, precio_promo: Math.round((i.precio_base + extrasTotal) * (1 - form.valor / 100)) };
    }));
  };

  const validateForm = (form: PromocionFormData) => {
    if (!form.nombre.trim()) { toast.error('Ingresá un nombre para la promoción'); return false; }
    if (form.valor < 0) { toast.error('El valor no puede ser negativo'); return false; }
    if (form.tipo === 'descuento_porcentaje' && form.valor > 100) { toast.error('El porcentaje no puede ser mayor a 100'); return false; }
    if (form.dias_semana.length === 0) { toast.error('Seleccioná al menos un día de la semana'); return false; }
    if (form.canales.length === 0) { toast.error('Seleccioná al menos un canal'); return false; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) { toast.error('La fecha de inicio no puede ser posterior a la fecha de fin'); return false; }
    return true;
  };

  const buildItemsPayload = (promoItems: PromoItemDraft[]) =>
    promoItems.map((i) => ({ item_carta_id: i.item_carta_id, precio_promo: i.precio_promo, preconfigExtras: i.preconfigExtras?.map((e) => ({ extra_item_carta_id: e.extra_item_carta_id, cantidad: e.cantidad })) }));

  const handleCreateSubmit = async () => {
    if (!validateForm(createForm)) return;
    try {
      await create.mutateAsync({ ...createForm, items: buildItemsPayload(createPromoItems) });
      setCreatingNew(false); setCreateForm(EMPTY_FORM); setCreatePromoItems([]); setCreateItemSearch('');
    } catch { /* handled by mutation toast */ }
  };

  const handleEditSubmit = async (promoId: string) => {
    const draft = promoDrafts[promoId];
    if (!draft || !validateForm(draft.form)) return;
    try { await update.mutateAsync({ id: promoId, data: draft.form, items: buildItemsPayload(draft.promoItems) }); closePromoNow(promoId); }
    catch { /* handled by mutation toast */ }
  };

  const makeDraftSetter = <T,>(promoId: string, field: keyof PromoEditDraft) =>
    ((next: SetStateAction<T>) => setPromoDrafts((prev) => {
      const d = prev[promoId];
      if (!d) return prev;
      return { ...prev, [promoId]: { ...d, [field]: typeof next === 'function' ? (next as (prev: T) => T)(d[field] as T) : next } };
    })) as Dispatch<SetStateAction<T>>;

  const renderInlineForm = (promo: Promocion) => {
    const draft = promoDrafts[promo.id];
    if (!draft || draft.loading) return <div className="text-sm text-muted-foreground">Cargando edición...</div>;
    return (
      <>
        <PromoFormFields
          form={draft.form}
          setForm={makeDraftSetter<PromocionFormData>(promo.id, 'form')}
          promoItems={draft.promoItems}
          setPromoItems={makeDraftSetter<PromoItemDraft[]>(promo.id, 'promoItems')}
          itemSearch={draft.itemSearch}
          setItemSearch={makeDraftSetter<string>(promo.id, 'itemSearch')}
          searchResults={getSearchResults(draft.itemSearch, draft.promoItems)}
          onAddItem={(item) => addItem(item, makeDraftSetter<PromoItemDraft[]>(promo.id, 'promoItems'), makeDraftSetter<string>(promo.id, 'itemSearch'))}
          onApplyPercentage={() => applyPercentageToAll(draft.form, makeDraftSetter<PromoItemDraft[]>(promo.id, 'promoItems'))}
        />
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => requestClosePromo(promo)} className="flex-1">Cerrar</Button>
          <Button onClick={() => handleEditSubmit(promo.id)} disabled={update.isPending} className="flex-1">Guardar cambios</Button>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Promociones" subtitle="Importá productos de la carta y crea promociones por canal"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nueva Promoción</Button>} />

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="h-20 animate-pulse" /></Card>))}</div>
      ) : !promos?.length ? (
        <EmptyState icon={Tag} title="Sin promociones" description="Creá tu primera promoción" />
      ) : (
        <PromosByDay promos={promos} openPromoIds={openPromoIds} renderInlineForm={renderInlineForm}
          onEdit={(promo) => { if (openPromoIds.includes(promo.id)) requestClosePromo(promo); else openEdit(promo); }}
          onDuplicate={openDuplicate} onDelete={setDeleting} onToggle={(id, activa) => toggleActive.mutate({ id, activa })} />
      )}

      <Dialog open={creatingNew} onOpenChange={setCreatingNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Promoción</DialogTitle></DialogHeader>
          <PromoFormFields form={createForm} setForm={setCreateForm} promoItems={createPromoItems} setPromoItems={setCreatePromoItems}
            itemSearch={createItemSearch} setItemSearch={setCreateItemSearch}
            searchResults={getSearchResults(createItemSearch, createPromoItems)}
            onAddItem={(item) => addItem(item, setCreatePromoItems, setCreateItemSearch)}
            onApplyPercentage={() => applyPercentageToAll(createForm, setCreatePromoItems)} />
          <Button className="w-full" onClick={handleCreateSubmit} disabled={create.isPending}>Crear promoción</Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={() => setDeleting(null)} title="Eliminar promoción"
        description={`¿Eliminar "${deleting?.nombre}"?`} confirmLabel="Eliminar" variant="destructive"
        onConfirm={async () => { if (deleting) await remove.mutateAsync(deleting.id); setDeleting(null); }} />
      <ConfirmDialog open={!!confirmClosePromo} onOpenChange={() => setConfirmClosePromo(null)} title="Descartar cambios"
        description={`"${confirmClosePromo?.nombre}" tiene cambios sin guardar. ¿Querés cerrarla igual?`} confirmLabel="Cerrar sin guardar"
        onConfirm={() => { if (confirmClosePromo) closePromoNow(confirmClosePromo.id); setConfirmClosePromo(null); }} />
    </div>
  );
}
