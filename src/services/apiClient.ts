import { auth } from '../firebase.ts';

// Centralized authenticated client API wrapper
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || {});

  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization') && auth.currentUser) {
    const token = await auth.currentUser.getIdToken().catch(() => '');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...init,
    method,
    credentials: 'same-origin',
    headers,
  });
}

export async function apiJson<T = any>(
  input: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await apiFetch(input, init);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, data };
}
