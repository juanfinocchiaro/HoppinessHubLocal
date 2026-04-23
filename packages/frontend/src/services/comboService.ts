import { apiGet, apiPut, apiPost } from './apiClient';

export interface ComboComponentRow {
  id: string;
  combo_id: string;
  component_id: string;
  quantity: number;
  sort_order: number | null;
  component: {
    id: string;
    name: string;
    base_price: number | null;
    total_cost: number | null;
    image_url: string | null;
  } | null;
}

export async function fetchComboComponents(comboId: string) {
  return apiGet<ComboComponentRow[]>(`/menu/items/${comboId}/combo-components`);
}

export async function replaceComboComponents(
  comboId: string,
  components: Array<{ component_id: string; quantity: number; sort_order?: number | null }>,
) {
  return apiPut(`/menu/items/${comboId}/combo-components`, { components });
}

export async function recalculateComboCost(comboId: string) {
  return apiPost(`/menu/items/${comboId}/recalculate-combo-cost`, {});
}
