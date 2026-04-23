import { apiGet } from './apiClient';

export async function fetchPublicBranches() {
  return apiGet<Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    opening_time: string;
    closing_time: string;
    public_status: string;
    public_hours: unknown;
    latitude: number;
    longitude: number;
  }>>('/branches/public');
}

export async function fetchPublicBranchNames() {
  return apiGet<Array<{ id: string; name: string; public_status: string }>>(
    '/branches/public/names',
  );
}

export async function fetchPublicBranchIdAndName() {
  return apiGet<Array<{ id: string; name: string }>>('/branches/public/ids');
}

export async function fetchActiveBranches() {
  return apiGet<Array<{ id: string; name: string }>>('/branches/active');
}

export async function fetchBranchesForPedir() {
  return apiGet<{
    branches: Array<Record<string, unknown>>;
    configMap: Record<string, Record<string, unknown>>;
  }>('/branches/public/pedir');
}
