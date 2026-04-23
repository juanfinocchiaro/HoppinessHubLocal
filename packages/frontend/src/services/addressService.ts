import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export interface ClienteAddress {
  id: string;
  label: string;
  address: string;
  floor: string | null;
  reference: string | null;
  city: string | null;
  is_primary: boolean;
}

export async function listAddresses(userId: string) {
  return apiGet<ClienteAddress[]>('/webapp/addresses', { user_id: userId });
}

export async function saveAddress(
  userId: string,
  payload: {
    label: string;
    address: string;
    floor: string | null;
    reference: string | null;
    city: string | null;
  },
  editId?: string | null,
) {
  if (editId) {
    return apiPut(`/webapp/addresses/${editId}`, { ...payload, user_id: userId });
  }
  return apiPost('/webapp/addresses', { ...payload, user_id: userId });
}

export async function deleteAddress(id: string) {
  return apiDelete(`/webapp/addresses/${id}`);
}
