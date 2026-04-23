import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRdoCategoryOptions } from '@/hooks/useRdoCategories';
import { RDO_SECTIONS } from '@/types/rdo';

interface Props {
  value?: string;
  onChange: (code: string) => void;
  itemType?: string;
  placeholder?: string;
}

export function RdoCategorySelector({
  value,
  onChange,
  itemType,
  placeholder = 'Seleccionar categoría RDO...',
}: Props) {
  const { data: categories, isLoading } = useRdoCategoryOptions(itemType);

  // Group by parent
  const grouped = (categories || []).reduce<Record<string, typeof categories>>((acc, cat) => {
    const parent = cat.parent_code || 'other';
    if (!acc[parent]) acc[parent] = [];
    acc[parent]!.push(cat);
    return acc;
  }, {});

  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Cargando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin categoría RDO</SelectItem>
        {Object.entries(grouped).map(([parentCode, cats]) => (
          <div key={parentCode}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {cats?.[0]?.rdo_section
                ? RDO_SECTIONS[cats[0].rdo_section as keyof typeof RDO_SECTIONS]
                : parentCode}
              {' › '}
              {parentCode}
            </div>
            {cats?.map((cat) => (
              <SelectItem key={cat.code} value={cat.code}>
                {cat.name}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
