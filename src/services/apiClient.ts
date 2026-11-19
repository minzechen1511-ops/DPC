import { auth } from '../firebase.ts';

const STARTUP_RETRY_DELAYS_MS = [1500, 2500, 4000];

export function isProxyStartingHtml(contentType: string, bodyText: string): boolean {
  const ct = (contentType || '').toLowerCase();
  const trimmed = (bodyText || '').trim();
  if (/starting server/i.test(trimmed)) {
    return true;
  }
  if (ct.includes('text/html') && (trimmed.startsWith('<') || trimmed.length > 0)) {
    return true;
  }
  return trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html');
}

function waitMs(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// Centralized authenticated client API wrapper
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const isApiRoute = input.startsWith('/api/') || input === '/api';

  const buildHeaders = async (forceRefresh = false): Promise<Headers> => {
    const headers = new Headers(init.headers || {});
    if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if ((!headers.has('Authorization') || forceRefresh) && auth.currentUser) {
      const token = await auth.currentUser.getIdToken(forceRefresh).catch(() => '');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  };

  let tokenRefreshed = false;

  for (let attempt = 0; attempt <= STARTUP_RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch(input, {
      ...init,
      method,
      credentials: 'same-origin',
      headers: await buildHeaders(tokenRefreshed),
    });

    // Retry once with a fresh Firebase ID token if a signed-in user received 401
    if (response.status === 401 && !tokenRefreshed && auth.currentUser) {
      tokenRefreshed = true;
      continue;
    }

    // If an AI Studio Cloud Run edge proxy returns an HTML "Starting Server..." page
    // while the container finishes waking up or restarting, wait briefly and retry cleanly.
    if (isApiRoute && attempt < STARTUP_RETRY_DELAYS_MS.length) {
      const ct = response.headers.get('content-type') || '';
      const isHtmlContentType = ct.toLowerCase().includes('text/html');
      const isEdgeWarmupStatus = response.status === 502 || response.status === 503 || response.status === 504;

      if (isHtmlContentType) {
        await waitMs(STARTUP_RETRY_DELAYS_MS[attempt], init.signal);
        continue;
      }

      if (isEdgeWarmupStatus && !ct.toLowerCase().includes('application/json')) {
        const cloneText = await response.clone().text().catch(() => '');
        if (!cloneText.trim() || isProxyStartingHtml(ct, cloneText)) {
          await waitMs(STARTUP_RETRY_DELAYS_MS[attempt], init.signal);
          continue;
        }
      }
    }

    return response;
  }

  return fetch(input, {
    ...init,
    method,
    credentials: 'same-origin',
    headers: await buildHeaders(tokenRefreshed),
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
