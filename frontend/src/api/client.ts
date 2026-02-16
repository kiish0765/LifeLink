const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('accessToken', data.accessToken);
        return api(path, options);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth:logout'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Request failed');
  return data as T;
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ user: AuthUser; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (body: { email: string; password: string; role: string; fullName: string; phone?: string }) =>
    api<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => api<{ user: AuthUser }>('/auth/me'),
};

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'donor' | 'receiver' | 'hospital';
  donorId?: string;
  hospitalId?: string;
}
