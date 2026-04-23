import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import {
  usePriceLists,
  useUpdatePriceListConfig,
  APP_CHANNELS,
  CHANNELS,
  type PriceList,
} from '@/hooks/useChannelPricing';

export function ChannelCommissionsPanel() {
  const [open, setOpen] = useState(false);
  const { data: priceLists, isLoading } = usePriceLists();
  const updateConfig = useUpdatePriceListConfig();
  const [edits, setEdits] = useState<Record<string, number>>({});

  const appLists = (priceLists || []).filter(
    (l) => APP_CHANNELS.includes(l.channel as any) && l.is_active,
  ) as PriceList[];

  const hasChanges = Object.keys(edits).length > 0;

  const handleSave = async () => {
    for (const [id, value] of Object.entries(edits)) {
      const list = appLists.find((l) => l.id === id);
      if (!list) continue;
      await updateConfig.mutateAsync({
        id,
        pricing_mode: 'percentage',
        pricing_value: value,
        mirror_channel: null,
      });
    }
    setEdits({});
  };

  const channelLabel = (ch: string) =>
    CHANNELS.find((c) => c.value === ch)?.label || ch;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Comisiones por Canal</span>
          {appLists.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {appLists.length} canales
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          ) : appLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay canales de apps configurados. Creálos desde Precios por Canal.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {appLists.map((list) => {
                  const current = edits[list.id] ?? list.pricing_value;
                  return (
                    <div key={list.id} className="flex items-center gap-2">
                      <label className="text-sm font-medium min-w-[100px]">
                        {channelLabel(list.channel)}
                      </label>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={current}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [list.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="pr-8 h-8 text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasChanges && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateConfig.isPending}
                  >
                    {updateConfig.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
