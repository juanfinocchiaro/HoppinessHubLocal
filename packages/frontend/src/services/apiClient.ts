const API_BASE = '/api';

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('hoppiness_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.accessToken || null;
    }
  } catch {
    // ignore
  }
  return null;
}

function getRefreshToken(): string | null {
  try {
    const stored = localStorage.getItem('hoppiness_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.refreshToken || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setAuthTokens(tokens: { accessToken: string; refreshToken: string } | null) {
  if (tokens) {
    localStorage.setItem('hoppiness_auth', JSON.stringify(tokens));
  } else {
    localStorage.removeItem('hoppiness_auth');
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      setAuthTokens(null);
      return null;
    }

    const json = await res.json();
    if (json.data?.tokens) {
      setAuthTokens(json.data.tokens);
      return json.data.tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...fetchOptions, headers });

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `API error: ${res.status}`);
  }

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export async function apiGet<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
  return api<T>(endpoint, { method: 'GET', params });
}

export async function apiPost<T = any>(endpoint: string, body?: any): Promise<T> {
  return api<T>(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export async function apiPut<T = any>(endpoint: string, body?: any): Promise<T> {
  return api<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T = any>(endpoint: string, body?: any): Promise<T> {
  return api<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T = any>(endpoint: string, body?: any): Promise<T> {
  return api<T>(endpoint, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiUpload<T = any>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);
  return api<T>(endpoint, { method: 'POST', body: formData });
}
