/**
 * ChannelPricingPage — Precios por Canal de Venta (v2 – vista unificada)
 *
 * Una sola tabla comparativa con todos los canales como columnas.
 * Reglas globales de pricing por canal (%, fijo, mirror, manual).
 * Export PDF de lista de precios.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, Save, Search, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  usePriceLists,
  useMenuItemsForPricing,
  useAllPriceListItems,
  useUpdatePriceListConfig,
  useBulkUpdatePriceList,
  useInitializePriceLists,
  computeChannelPrice,
  resolveChannelMode,
  CHANNELS,
  APP_CHANNELS,
  PRICING_MODES,
  type Channel,
  type PricingMode,
  type PriceList,
} from '@/hooks/useChannelPricing';
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

// Only show app channels in the unified table
const TABLE_CHANNELS = CHANNELS.filter((ch) => APP_CHANNELS.includes(ch.value));

export default function ChannelPricingPage() {
  const { data: priceLists, isLoading: loadingLists } = usePriceLists();
  const { data: menuItems, isLoading: loadingMenu } = useMenuItemsForPricing();
  const initLists = useInitializePriceLists();

  useEffect(() => {
    if (!loadingLists && priceLists && priceLists.length < CHANNELS.length) {
      initLists.mutate();
    }
  }, [loadingLists, priceLists]);

  const priceListIds = useMemo(() => (priceLists || []).map((l) => l.id), [priceLists]);
  const { data: allOverrides, isLoading: loadingPrices } = useAllPriceListItems(priceListIds);

  const isLoading = loadingLists || loadingMenu || loadingPrices;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [editCell, setEditCell] = useState<{ itemId: string; channel: Channel } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [rulesOpen, setRulesOpen] = useState(true);

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
      const catA = (a as any).menu_categories?.orden ?? 999;
      const catB = (b as any).menu_categories?.orden ?? 999;
      if (catA !== catB) return catA - catB;
      return ((a as any).orden ?? 999) - ((b as any).orden ?? 999);
    });
  }, [menuItems, debouncedSearch]);

  const byCategory = useMemo(() => {
    const acc: Record<string, { items: typeof sortedItems; orden: number }> = {};
    for (const item of sortedItems) {
      const cat = (item as any).menu_categories?.name ?? 'Sin categoría';
      const orden = (item as any).menu_categories?.orden ?? 999;
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
    (
      itemId: string,
      basePrice: number,
      channel: Channel,
    ): { price: number; isOverride: boolean } => {
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
    const dateStr = now.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    doc.setFontSize(18);
    doc.text('Lista de Precios por Canal', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Actualizada al ${dateStr}`, 14, 27);
    doc.setTextColor(0);

    const headers = ['Producto', 'Base', ...TABLE_CHANNELS.map((ch) => ch.label)];
    const body: (string | number)[][] = [];

    for (const cat of cats) {
      body.push([
        {
          content: cat,
          colSpan: headers.length,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
        } as any,
      ]);
      for (const item of byCategory[cat].items) {
        const row: (string | number)[] = [item.name, fmtCurrency(item.base_price)];
        for (const ch of TABLE_CHANNELS) {
          const { price } = getChannelPrice(item.id, item.base_price, ch.value);
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
      columnStyles: {
        0: { cellWidth: 60 },
      },
      didDrawPage: (_data: any) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Lista de precios actualizada al ${dateStr}`,
          14,
          doc.internal.pageSize.height - 10,
        );
      },
    });

    doc.save(`lista-precios-${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success('PDF descargado');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Precios por Canal"
        subtitle="Gestioná los precios de venta por canal desde un solo lugar"
        breadcrumb={[{ label: 'Mi Marca', href: '/mimarca' }, { label: 'Precios por Canal' }]}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <ChannelRulesPanel
            priceLists={priceLists || []}
            open={rulesOpen}
            onToggle={() => setRulesOpen((v) => !v)}
          />

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
                      <TableHead className="sticky top-0 bg-background z-10 min-w-[200px]">
                        Producto
                      </TableHead>
                      <TableHead className="sticky top-0 bg-background z-10 text-right w-28">
                        Base
                      </TableHead>
                      {TABLE_CHANNELS.map((ch) => {
                        const list = priceLists?.find((l) => l.channel === ch.value);
                        const modeLabel = list
                          ? (PRICING_MODES.find((m) => m.value === list.pricing_mode)?.label ?? '')
                          : '';
                        return (
                          <TableHead
                            key={ch.value}
                            className="sticky top-0 bg-background z-10 text-right w-32"
                          >
                            <div className="flex flex-col items-end gap-0.5">
                              <span>{ch.label}</span>
                              {modeLabel && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {list?.pricing_mode === 'percentage'
                                    ? `+${list.pricing_value}%`
                                    : list?.pricing_mode === 'fixed_amount'
                                      ? `+${fmtCurrency(list.pricing_value)}`
                                      : list?.pricing_mode === 'mirror'
                                        ? `= ${CHANNELS.find((c) => c.value === list.mirror_channel)?.label ?? ''}`
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
                              colSpan={2 + TABLE_CHANNELS.length}
                              className="font-semibold text-xs py-1.5 bg-muted/60 uppercase tracking-wide"
                            >
                              {cat}
                            </TableCell>
                          </TableRow>
                          {catItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium pl-5 text-sm py-1.5">
                                {item.name}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm py-1.5 text-muted-foreground">
                                {fmtCurrency(item.base_price)}
                              </TableCell>
                              {TABLE_CHANNELS.map((ch) => {
                                const { price, isOverride } = getChannelPrice(
                                  item.id,
                                  item.base_price,
                                  ch.value,
                                );
                                const diffLabel = fmtPct(item.base_price, price);
                                const isEditing =
                                  editCell?.itemId === item.id && editCell?.channel === ch.value;

                                return (
                                  <TableCell key={ch.value} className="text-right py-1.5 pr-3">
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
                                            if (e.key === 'Enter')
                                              handleSaveOverride(item.id, ch.value);
                                            if (e.key === 'Escape') setEditCell(null);
                                          }}
                                        />
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7"
                                          onClick={() => handleSaveOverride(item.id, ch.value)}
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
                                                setEditCell({ itemId: item.id, channel: ch.value });
                                                setEditValue(String(price));
                                              }}
                                            >
                                              <span
                                                className={
                                                  isOverride ? 'font-semibold text-primary' : ''
                                                }
                                              >
                                                {fmtCurrency(price)}
                                              </span>
                                              {isOverride && (
                                                <span className="text-[9px] text-primary">●</span>
                                              )}
                                              {diffLabel && !isOverride && (
                                                <span className="text-[10px] text-muted-foreground ml-0.5">
                                                  {diffLabel}
                                                </span>
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
                          colSpan={2 + TABLE_CHANNELS.length}
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
                <span>
                  Los precios sin indicador se calculan automáticamente según la regla del canal
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ChannelRulesPanel({
  priceLists,
  open,
  onToggle,
}: {
  priceLists: PriceList[];
  open: boolean;
  onToggle: () => void;
}) {
  const updateConfig = useUpdatePriceListConfig();

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

  return (
    <Card>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div>
          <h3 className="font-semibold text-sm">Reglas de precio por canal</h3>
          <p className="text-xs text-muted-foreground">
            Definí cómo se calcula el precio de cada canal
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4">
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
                {CHANNELS.map((ch) => {
                  const list = priceLists.find((l) => l.channel === ch.value);
                  if (!list) return null;
                  const isBase = ch.value === 'mostrador' || ch.value === 'webapp';

                  return (
                    <TableRow key={ch.value}>
                      <TableCell className="font-medium text-sm">{ch.label}</TableCell>
                      <TableCell>
                        {isBase ? (
                          <Badge variant="secondary" className="text-xs">
                            Precio base
                          </Badge>
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
                                    <div className="text-[10px] text-muted-foreground">
                                      {m.description}
                                    </div>
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
                                (c) =>
                                  c.value !== ch.value &&
                                  c.value !== 'mostrador' &&
                                  c.value !== 'webapp',
                              ).map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">Editar en la tabla</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={list.is_active ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
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
      )}
    </Card>
  );
}
