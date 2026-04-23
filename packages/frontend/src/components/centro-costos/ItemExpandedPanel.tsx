import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Layers,
  Link2,
  DollarSign,
  Clock,
  ChevronUp,
  Trash2,
  Store,
  Package,
  SlidersHorizontal,
} from 'lucide-react';
import { useItemCartaMutations } from '@/hooks/useItemsCarta';
import type { LucideIcon } from 'lucide-react';


import { ComposicionInline } from './ComposicionInline';
import { AsignadosInline } from './AsignadosSection';
import { EditarInline } from './EditarInline';
import { HistorialInline } from './HistorialInline';
import { ChannelPricesInline } from './ChannelPricesInline';
import { ComboInline } from './ComboInline';
import { ModifiersInline } from './ModifiersInline';

type PanelTab = 'composicion' | 'combo' | 'asignados' | 'editar' | 'historial' | 'canales' | 'modifiers';

interface Props {
  item: any;
  onClose: () => void;
  onDeleted: () => void;
}

export function ItemExpandedPanel({ item, onClose, onDeleted }: Props) {
  const isExtra = item.type === 'extra';
  const isCombo = item.type === 'combo';
  const [activeTab, setActiveTab] = useState<PanelTab>(
    isExtra ? 'asignados' : isCombo ? 'combo' : 'composicion',
  );
  const [showDelete, setShowDelete] = useState(false);
  const mutations = useItemCartaMutations();

  const isAutoExtra =
    isExtra && (item.composicion_ref_preparacion_id || item.composicion_ref_insumo_id);

  const tabs: { id: PanelTab; label: string; icon: LucideIcon }[] = isExtra
    ? [
        { id: 'asignados', label: 'Asignados', icon: Link2 },
        { id: 'canales', label: 'Canales', icon: Store },
        { id: 'editar', label: 'Editar', icon: DollarSign },
        { id: 'historial', label: 'Historial', icon: Clock },
      ]
    : isCombo
      ? [
          { id: 'combo', label: 'Combo', icon: Package },
          { id: 'canales', label: 'Canales', icon: Store },
          { id: 'editar', label: 'Editar', icon: DollarSign },
          { id: 'historial', label: 'Historial', icon: Clock },
        ]
      : [
          { id: 'composicion', label: 'Composición', icon: Layers },
          { id: 'modifiers', label: 'Modifiers', icon: SlidersHorizontal },
          { id: 'canales', label: 'Canales', icon: Store },
          { id: 'editar', label: 'Editar', icon: DollarSign },
          { id: 'historial', label: 'Historial', icon: Clock },
        ];

  return (
    <div className="bg-muted/30 border-x border-b rounded-b-lg">
      <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const I = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <I className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          {isAutoExtra ? (
            <span className="text-xs text-muted-foreground mr-2">Gestionado desde composición</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'composicion' && <ComposicionInline item={item} mutations={mutations} />}
        {activeTab === 'combo' && <ComboInline item={item} />}
        {activeTab === 'modifiers' && <ModifiersInline itemId={item.id} />}
        {activeTab === 'asignados' && <AsignadosInline item={item} />}
        {activeTab === 'canales' && <ChannelPricesInline item={item} />}
        {activeTab === 'editar' && (
          <EditarInline item={item} mutations={mutations} onSaved={onClose} />
        )}
        {activeTab === 'historial' && <HistorialInline item={item} />}
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Eliminar item"
        description={`¿Eliminar "${item.name}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          await mutations.softDelete.mutateAsync(item.id);
          setShowDelete(false);
          onDeleted();
        }}
      />
    </div>
  );
}
