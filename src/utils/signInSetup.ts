export type DomainAccess = 'authorized' | 'unauthorized' | 'unknown';

// Match Firebase Auth's HTTP(S) hostname rules. Ports are not part of an
// authorized-domain entry; IP addresses require an exact match.
export function isAuthorizedSignInUrl(url: string, domains: string[]): boolean {
  const { protocol, hostname } = new URL(url);
  if (protocol !== 'http:' && protocol !== 'https:') return false;
  return domains.some((entry) => {
    const domain = entry.toLowerCase();
    if (/^[0-9.]+$/.test(domain)) return hostname === domain;
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });
}

export async function checkSignInDomain(
  apiKey: string,
  url: string,
  request: typeof fetch = fetch,
): Promise<DomainAccess> {
  try {
    // This is Firebase's public client configuration endpoint, also used by
    // the Auth SDK. It does not grant administrative access or change settings.
    const response = await request(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return 'unknown';
    const config = await response.json();
    if (!Array.isArray(config.authorizedDomains) ||
        !config.authorizedDomains.every((domain: unknown) => typeof domain === 'string')) {
      return 'unknown';
    }
    return isAuthorizedSignInUrl(url, config.authorizedDomains) ? 'authorized' : 'unauthorized';
  } catch {
    return 'unknown';
  }
}

export async function checkGeminiConfiguration(request: typeof fetch = fetch): Promise<boolean | null> {
  try {
    const response = await request('/api/health', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const health = await response.json();
    return typeof health.geminiConfigured === 'boolean' ? health.geminiConfigured : null;
  } catch {
    return null;
  }
}
