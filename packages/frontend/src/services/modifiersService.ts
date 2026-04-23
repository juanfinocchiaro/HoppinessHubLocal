import { apiGet } from './apiClient';

export type ModifierType = 'supply' | 'recipe' | 'menu_item' | 'text_only';

export interface UnifiedModifierOption {
  id: string;
  type: ModifierType;
  ref_id: string | null;
  display_name: string;
  price_delta: number;
  is_default_selected: boolean;
  sort_order: number | null;
}

export interface UnifiedModifierGroup {
  id: string;
  name: string;
  min_selected: number;
  max_selected: number | null;
  is_required: boolean;
  pricing_mode: 'individual' | 'group_average' | null;
  sort_order: number | null;
  options: UnifiedModifierOption[];
}

export async function fetchUnifiedModifiers(itemId: string) {
  return apiGet<UnifiedModifierGroup[]>(`/menu/items/${itemId}/modifiers`);
}
