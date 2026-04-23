import { Tag } from 'lucide-react';
import { useActivePromos } from '@/hooks/usePromociones';

interface Props {
  branchId: string | undefined;
}

export function ActivePromosBanner({ branchId }: Props) {
  const { data: promos = [] } = useActivePromos(branchId, 'webapp');

  const visible = promos.filter(
    (p) =>
      ['descuento_porcentaje', 'descuento_fijo', 'precio_especial'].includes(p.tipo) &&
      p.descripcion,
  );

  if (visible.length === 0) return null;

  return (
    <div className="bg-accent/10 border-b border-accent/20">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-start gap-2">
        <Tag className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {visible.map((p) => (
            <p key={p.id} className="text-xs text-accent-foreground/80">
              <span className="font-semibold">{p.nombre}</span>
              {p.descripcion ? ` — ${p.descripcion}` : ''}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
