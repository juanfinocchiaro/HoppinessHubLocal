import { Badge } from '@/components/ui/badge';
import { useRdoCategories } from '@/hooks/useRdoCategories';
import { RDO_BEHAVIORS } from '@/types/rdo';

interface Props {
  code: string;
  showSection?: boolean;
}

export function RdoCategoryBadge({ code, showSection: _showSection }: Props) {
  const { data: categories } = useRdoCategories();
  const cat = categories?.find((c) => c.code === code);

  if (!cat) return <span className="text-xs text-muted-foreground">{code}</span>;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{cat.name}</span>
      <Badge
        variant={cat.behavior === 'variable' ? 'default' : 'secondary'}
        className="text-[10px] px-1.5 py-0"
      >
        {RDO_BEHAVIORS[cat.behavior as keyof typeof RDO_BEHAVIORS] || cat.behavior}
      </Badge>
    </div>
  );
}
