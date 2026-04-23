/**
 * CanalesVentaPage — Gestión unificada de Canales de Venta + Precios por Canal
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Store,
  FileText,
  Search,
  Pencil,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  usePriceLists,
  useUpdatePriceListConfig,
  useMenuItemsForPricing,
  useAllPriceListItems,
  useBulkUpdatePriceList,
  useInitializePriceLists,
  computeChannelPrice,
  resolveChannelMode,
  CHANNELS,
  
  PRICING_MODES,
  type Channel,
  type PricingMode,
  type PriceList,
} from '@/hooks/useChannelPricing';
import { insertPriceLists, deletePriceList } from '@/services/promoService';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(v);

const fmtPct = (base: number, final: number) => {
  if (base === 0) return '';
  const pct = ((final - base) / base) * 100;
  if (Math.abs(pct) < 0.5) return '';
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;
};

const TABLE_CHANNELS_FILTER = (channels: PriceList[]) =>
  channels.filter((c) => c.channel !== 'mostrador' && c.channel !== 'webapp' && c.is_active);

export default function CanalesVentaPage() {
  const { data: priceLists, isLoading: loadingLists } = usePriceLists();
  const updateConfig = useUpdatePriceListConfig();
  const qc = useQueryClient();
  const initLists = useInitializePriceLists();

  // Initialize missing default channels
  useEffect(() => {
    if (!loadingLists && priceLists && priceLists.length < CHANNELS.length) {
      initLists.mutate();
    }
  }, [loadingLists, priceLists]);

  // ── Channel management state ──
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKey, setNewChannelKey] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PriceList | null>(null);
  const [edits, setEdits] = useState<Record<string, { commission?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const channels = useMemo(() => (priceLists || []) as PriceList[], [priceLists]);

  const channelLabel = (ch: string) =>
    CHANNELS.find((c) => c.value === ch)?.label || ch;

  const isAppChannel = (ch: string) => ch !== 'mostrador' && ch !== 'webapp';

  // ── Pricing table state ──
  const { data: menuItems, isLoading: loadingMenu } = useMenuItemsForPricing();
  const priceListIds = useMemo(() => channels.map((l) => l.id), [channels]);
  const { data: allOverrides, isLoading: loadingPrices } = useAllPriceListItems(priceListIds);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [editCell, setEditCell] = useState<{ itemId: string; channel: Channel } | null>(null);
  const [editValue, setEditValue] = useState('');

  const isLoading = loadingLists || loadingMenu || loadingPrices;

  const tableChannels = useMemo(() => TABLE_CHANNELS_FILTER(channels), [channels]);

  const sortedItems = useMemo(() => {
    if (!menuItems) return [];
    const q = debouncedSearch.toLowerCase();
    const items = !debouncedSearch
      ? menuItems
      : menuItems.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i as any).menu_categories?.name?.toLowerCase().includes(q),
        );
    return [...items].sort((a, b) => {
      const catA = (a as any).menu_categories?.sort_order ?? 999;
      const catB = (b as any).menu_categories?.sort_order ?? 999;
      if (catA !== catB) return catA - catB;
      return ((a as any).sort_order ?? 999) - ((b as any).sort_order ?? 999);
    });
  }, [menuItems, debouncedSearch]);

  const byCategory = useMemo(() => {
    const acc: Record<string, { items: typeof sortedItems; orden: number }> = {};
    for (const item of sortedItems) {
      const cat = (item as any).menu_categories?.name ?? 'Sin categoría';
      const orden = (item as any).menu_categories?.sort_order ?? 999;
      if (!acc[cat]) acc[cat] = { items: [], orden };
      acc[cat].items.push(item);
    }
    return acc;
  }, [sortedItems]);

  const cats = useMemo(
    () => Object.keys(byCategory).sort((a, b) => byCategory[a].orden - byCategory[b].orden),
    [byCategory],
  );

  const getChannelPrice = useCallback(
    (itemId: string, basePrice: number, channel: Channel): { price: number; isOverride: boolean } => {
      if (!priceLists) return { price: basePrice, isOverride: false };
      const { mode, value } = resolveChannelMode(channel, priceLists);
      const list = priceLists.find((l) => l.channel === channel);
      const override = list && allOverrides?.[list.id]?.[itemId];
      const price = computeChannelPrice(basePrice, mode, value, override);
      return { price, isOverride: override !== undefined };
    },
    [priceLists, allOverrides],
  );

  const bulkUpdate = useBulkUpdatePriceList();

  // ── Channel management handlers ──
  const handleAddChannel = async () => {
    if (!newChannelName.trim()) {
      toast.error('Ingresá un nombre para el canal');
      return;
    }
    const key = newChannelKey.trim() || newChannelName.trim().toLowerCase().replace(/\s+/g, '_');
    if (channels.some((c) => c.channel === key)) {
      toast.error('Ya existe un canal con esa clave');
      return;
    }
    setAddingChannel(true);
    try {
      await insertPriceLists([
        {
          name: `Lista ${newChannelName.trim()}`,
          channel: key,
          is_default: false,
          pricing_mode: 'percentage',
          pricing_value: 0,
          is_active: true,
        },
      ]);
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      setNewChannelName('');
      setNewChannelKey('');
      setShowAddForm(false);
      toast.success(`Canal "${newChannelName.trim()}" creado`);
    } catch {
      toast.error('Error al crear canal');
    } finally {
      setAddingChannel(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePriceList(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['price-lists'] });
      toast.success(`Canal "${channelLabel(deleteTarget.channel)}" eliminado`);
      setDeleteTarget(null);
    } catch {
      toast.error('Error al eliminar canal');
    }
  };

  const handleSaveChannel = async (list: PriceList) => {
    const edit = edits[list.id];
    if (!edit) return;
    setSaving(list.id);
    try {
      const commission =
        edit.commission !== undefined ? parseFloat(edit.commission) || 0 : list.pricing_value;
      await updateConfig.mutateAsync({
        id: list.id,
        pricing_mode: isAppChannel(list.channel) ? 'percentage' : 'base',
        pricing_value: commission,
        mirror_channel: null,
      });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[list.id];
        return next;
      });
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  // ── Pricing handlers ──
  const handleModeChange = (list: PriceList, mode: PricingMode) => {
    updateConfig.mutate({
      id: list.id,
      pricing_mode: mode,
      pricing_value: mode === 'base' ? 0 : list.pricing_value,
      mirror_channel: mode === 'mirror' ? (list.mirror_channel ?? 'rappi') : null,
    });
  };

  const handleValueChange = (list: PriceList, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateConfig.mutate({
      id: list.id,
      pricing_mode: list.pricing_mode,
      pricing_value: num,
      mirror_channel: list.mirror_channel,
    });
  };

  const handleMirrorChange = (list: PriceList, mirrorChannel: Channel) => {
    updateConfig.mutate({
      id: list.id,
      pricing_mode: 'mirror',
      pricing_value: 0,
      mirror_channel: mirrorChannel,
    });
  };

  const handleSaveOverride = (itemId: string, channel: Channel) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      toast.error('Precio inválido');
      return;
    }
    const list = priceLists?.find((l) => l.channel === channel);
    if (!list) return;
    bulkUpdate.mutate(
      { price_list_id: list.id, items: [{ item_carta_id: itemId, precio: num }] },
      { onSuccess: () => setEditCell(null) },
    );
  };

  const handleExportPDF = () => {
    if (!menuItems || !priceLists) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    doc.setFontSize(18);
    doc.text('Lista de Precios por Canal', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Actualizada al ${dateStr}`, 14, 27);
    doc.setTextColor(0);

    const chHeaders = tableChannels.map((c) => channelLabel(c.channel));
    const headers = ['Producto', 'Base', ...chHeaders];
    const body: (string | number)[][] = [];

    for (const cat of cats) {
      body.push([
        { content: cat, colSpan: headers.length, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
      ]);
      for (const item of byCategory[cat].items) {
        const row: (string | number)[] = [item.name, fmtCurrency(item.base_price)];
        for (const ch of tableChannels) {
          const { price } = getChannelPrice(item.id, item.base_price, ch.channel as Channel);
          row.push(fmtCurrency(price));
        }
        body.push(row);
      }
    }

    autoTable(doc, {
      startY: 33,
      head: [headers],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 59, 59] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 0: { cellWidth: 60 } },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Lista de precios actualizada al ${dateStr}`, 14, doc.internal.pageSize.height - 10);
      },
    });

    doc.save(`lista-precios-${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success('PDF descargado');
  };

  if (loadingLists) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando canales...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canales de Venta"
        subtitle="Gestioná canales, comisiones y precios desde un solo lugar"
        breadcrumb={[{ label: 'Mi Marca', href: '/mimarca' }, { label: 'Canales de Venta' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(true)} disabled={showAddForm}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Canal
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="canales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="canales">Canales y Comisiones</TabsTrigger>
          <TabsTrigger value="reglas">Reglas de Precio</TabsTrigger>
          <TabsTrigger value="precios">Precios por Producto</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Canales y Comisiones ── */}
        <TabsContent value="canales" className="space-y-4">
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <h3 className="text-sm font-semibold">Agregar Canal de Venta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre visible</label>
                  <Input
                    placeholder="Ej: Rappi"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Clave interna (opcional)</label>
                  <Input
                    placeholder="Ej: rappi"
                    value={newChannelKey}
                    onChange={(e) => setNewChannelKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se genera automáticamente si no lo completás
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddChannel} disabled={addingChannel}>
                    {addingChannel ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    Crear
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAddForm(false); setNewChannelName(''); setNewChannelKey(''); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {channels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay canales configurados</p>
              <p className="text-xs mt-1">Creá tu primer canal de venta</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-3 px-4 text-left font-medium">Canal</th>
                    <th className="py-3 px-4 text-left font-medium">Tipo</th>
                    <th className="py-3 px-4 text-right font-medium w-[140px]">Comisión %</th>
                    <th className="py-3 px-4 text-center font-medium w-[80px]">Activo</th>
                    <th className="py-3 px-4 text-right font-medium w-[100px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((list) => {
                    const edit = edits[list.id];
                    const hasEdit = !!edit;
                    const isBase = !isAppChannel(list.channel);
                    const currentCommission =
                      edit?.commission !== undefined ? edit.commission : String(list.pricing_value || 0);

                    return (
                      <tr key={list.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{channelLabel(list.channel)}</td>
                        <td className="py-3 px-4">
                          {isBase ? (
                            <Badge variant="outline" className="text-xs">Directo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">App / Plataforma</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isBase ? (
                            <span className="text-muted-foreground text-xs">Sin comisión</span>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={currentCommission}
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [list.id]: { ...prev[list.id], commission: e.target.value },
                                  }))
                                }
                                className="h-8 w-[80px] text-right text-sm tabular-nums"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Switch checked={list.is_active} disabled className="mx-auto" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {hasEdit && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={() => handleSaveChannel(list)}
                                disabled={saving === list.id}
                              >
                                {saving === list.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              </Button>
                            )}
                            {!isBase && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(list)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Directo:</strong> Mostrador y WebApp usan el precio de carta sin comisión.</p>
            <p><strong>App / Plataforma:</strong> Canales con comisión (Rappi, PedidosYa, etc.). El precio se calcula como Precio Base + Comisión%.</p>
          </div>
        </TabsContent>

        {/* ── Tab 2: Reglas de Precio ── */}
        <TabsContent value="reglas">
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold text-sm mb-1">Reglas de precio por canal</h3>
              <p className="text-xs text-muted-foreground mb-3">Definí cómo se calcula el precio de cada canal</p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Canal</TableHead>
                      <TableHead className="w-44">Modo</TableHead>
                      <TableHead className="w-40">Valor</TableHead>
                      <TableHead className="w-24">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map((list) => {
                      const isBase = list.channel === 'mostrador' || list.channel === 'webapp';
                      return (
                        <TableRow key={list.id}>
                          <TableCell className="font-medium text-sm">{channelLabel(list.channel)}</TableCell>
                          <TableCell>
                            {isBase ? (
                              <Badge variant="secondary" className="text-xs">Precio base</Badge>
                            ) : (
                              <Select
                                value={list.pricing_mode}
                                onValueChange={(v) => handleModeChange(list, v as PricingMode)}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRICING_MODES.filter((m) => m.value !== 'base').map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                      <div>
                                        <div className="font-medium">{m.label}</div>
                                        <div className="text-[10px] text-muted-foreground">{m.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {isBase ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : list.pricing_mode === 'percentage' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs">+</span>
                                <Input
                                  type="number"
                                  value={list.pricing_value}
                                  onChange={(e) => handleValueChange(list, e.target.value)}
                                  className="h-8 w-20 text-sm text-right"
                                  min={0}
                                  step={1}
                                />
                                <span className="text-xs">%</span>
                              </div>
                            ) : list.pricing_mode === 'fixed_amount' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs">+$</span>
                                <Input
                                  type="number"
                                  value={list.pricing_value}
                                  onChange={(e) => handleValueChange(list, e.target.value)}
                                  className="h-8 w-24 text-sm text-right"
                                  min={0}
                                  step={100}
                                />
                              </div>
                            ) : list.pricing_mode === 'mirror' ? (
                              <Select
                                value={list.mirror_channel ?? ''}
                                onValueChange={(v) => handleMirrorChange(list, v as Channel)}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue placeholder="Seleccioná canal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CHANNELS.filter(
                                    (c) => c.value !== list.channel && c.value !== 'mostrador' && c.value !== 'webapp',
                                  ).map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">Editar en la tabla</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={list.is_active ? 'default' : 'secondary'} className="text-[10px]">
                              {list.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Precios por Producto ── */}
        <TabsContent value="precios">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar producto o categoría..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 max-w-sm"
                    />
                  </div>
                </div>

                <div className="border rounded-lg max-h-[65vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background z-10 min-w-[200px]">Producto</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10 text-right w-28">Base</TableHead>
                        {tableChannels.map((ch) => {
                          const modeLabel = PRICING_MODES.find((m) => m.value === ch.pricing_mode)?.label ?? '';
                          return (
                            <TableHead key={ch.id} className="sticky top-0 bg-background z-10 text-right w-32">
                              <div className="flex flex-col items-end gap-0.5">
                                <span>{channelLabel(ch.channel)}</span>
                                {modeLabel && (
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {ch.pricing_mode === 'percentage'
                                      ? `+${ch.pricing_value}%`
                                      : ch.pricing_mode === 'fixed_amount'
                                        ? `+${fmtCurrency(ch.pricing_value)}`
                                        : ch.pricing_mode === 'mirror'
                                          ? `= ${channelLabel(ch.mirror_channel ?? '')}`
                                          : modeLabel}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cats.map((cat) => {
                        const catItems = byCategory[cat]?.items ?? [];
                        return (
                          <React.Fragment key={cat}>
                            <TableRow className="hover:bg-muted/50">
                              <TableCell
                                colSpan={2 + tableChannels.length}
                                className="font-semibold text-xs py-1.5 bg-muted/60 uppercase tracking-wide"
                              >
                                {cat}
                              </TableCell>
                            </TableRow>
                            {catItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium pl-5 text-sm py-1.5">{item.name}</TableCell>
                                <TableCell className="text-right tabular-nums text-sm py-1.5 text-muted-foreground">
                                  {fmtCurrency(item.base_price)}
                                </TableCell>
                                {tableChannels.map((ch) => {
                                  const { price, isOverride } = getChannelPrice(
                                    item.id,
                                    item.base_price,
                                    ch.channel as Channel,
                                  );
                                  const diffLabel = fmtPct(item.base_price, price);
                                  const isEditing =
                                    editCell?.itemId === item.id && editCell?.channel === ch.channel;

                                  return (
                                    <TableCell key={ch.id} className="text-right py-1.5 pr-3">
                                      {isEditing ? (
                                        <div className="flex items-center gap-1 justify-end">
                                          <Input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-24 h-7 text-right text-sm tabular-nums"
                                            min={0}
                                            step={10}
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveOverride(item.id, ch.channel as Channel);
                                              if (e.key === 'Escape') setEditCell(null);
                                            }}
                                          />
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => handleSaveOverride(item.id, ch.channel as Channel)}
                                          >
                                            <Save className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <TooltipProvider delayDuration={300}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                className="inline-flex items-center gap-1 tabular-nums text-sm hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors group"
                                                onClick={() => {
                                                  setEditCell({ itemId: item.id, channel: ch.channel as Channel });
                                                  setEditValue(String(price));
                                                }}
                                              >
                                                <span className={isOverride ? 'font-semibold text-primary' : ''}>
                                                  {fmtCurrency(price)}
                                                </span>
                                                {isOverride && <span className="text-[9px] text-primary">●</span>}
                                                {diffLabel && !isOverride && (
                                                  <span className="text-[10px] text-muted-foreground ml-0.5">{diffLabel}</span>
                                                )}
                                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                              {isOverride
                                                ? 'Precio manual (override). Click para editar.'
                                                : 'Click para poner un precio manual'}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                      {sortedItems.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2 + tableChannels.length}
                            className="text-center text-muted-foreground py-8"
                          >
                            No se encontraron productos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="text-primary">●</span> Precio con override manual
                  </span>
                  <span>Los precios sin indicador se calculan automáticamente según la regla del canal</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Eliminar canal"
        description={`¿Eliminar el canal "${deleteTarget ? channelLabel(deleteTarget.channel) : ''}"? Se eliminarán también todos los precios asociados.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
