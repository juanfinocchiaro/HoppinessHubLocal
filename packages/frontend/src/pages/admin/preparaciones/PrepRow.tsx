import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Shuffle, ChevronDown } from 'lucide-react';
import { ExpandablePanel } from './ExpandablePanel';
import { InlineNombre, InlineDescripcion, InlineCategoria } from './InlineFields';
import { FichaTecnicaTab } from './FichaTecnicaTab';
import { OpcionesTab } from './OpcionesTab';
import { formatCurrency } from './types';
import type { Preparacion, CategoriaPreparacion, PreparacionMutations } from './types';

export function PrepRow({
  prep,
  isExpanded,
  onToggle,
  mutations,
  onDelete,
  categorias,
}: {
  prep: Preparacion;
  isExpanded: boolean;
  onToggle: () => void;
  mutations: PreparacionMutations;
  onDelete: () => void;
  categorias: CategoriaPreparacion[] | undefined;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium">{prep.name}</p>
          {prep.description && (
            <p className="text-xs text-muted-foreground truncate">{prep.description}</p>
          )}
        </div>
        <Badge variant={prep.type === 'elaborado' ? 'default' : 'secondary'} className="shrink-0">
          {prep.type === 'elaborado' ? '🍳 Elaborado' : '📦 Componente'}
        </Badge>
        {prep.is_interchangeable && (
          <Badge variant="outline" className="text-xs shrink-0">
            <Shuffle className="w-3 h-3 mr-1" /> Intercambiable
          </Badge>
        )}
        <span className="font-mono text-sm shrink-0 w-24 text-right">
          {prep.calculated_cost > 0 ? formatCurrency(prep.calculated_cost) : '—'}
        </span>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>
      <ExpandablePanel open={isExpanded}>
        <div className="px-4 pb-4 pt-1 bg-muted/30 border-t">
          <InlineNombre prep={prep} mutations={mutations} />
          <InlineCategoria prep={prep} mutations={mutations} categorias={categorias} />
          <InlineDescripcion prep={prep} mutations={mutations} />

          {prep.type === 'elaborado' ? (
            <FichaTecnicaTab preparacionId={prep.id} mutations={mutations} onClose={onToggle} />
          ) : (
            <OpcionesTab preparacionId={prep.id} mutations={mutations} onClose={onToggle} />
          )}
        </div>
      </ExpandablePanel>
    </div>
  );
}
