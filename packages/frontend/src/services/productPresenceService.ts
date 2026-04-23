import { apiGet, apiPut } from './apiClient';

export interface ProductPresenceException {
  location_id: string;
  is_present: boolean;
}

export interface ProductPresence {
  present_at_all_locations: boolean;
  exceptions: ProductPresenceException[];
}

export async function fetchProductPresence(productId: string): Promise<ProductPresence> {
  return apiGet<ProductPresence>(`/menu/items/${productId}/presence`);
}

export async function updateProductPresence(
  productId: string,
  data: ProductPresence,
): Promise<ProductPresence> {
  return apiPut<ProductPresence>(`/menu/items/${productId}/presence`, data);
}
