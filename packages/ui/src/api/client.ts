const API_BASE = '';

function getToken(): string | null {
  return localStorage.getItem('api_token');
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken() ?? ''}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
