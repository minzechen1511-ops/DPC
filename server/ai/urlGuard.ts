import dns from 'dns/promises';
import net from 'net';
import { AIProviderType } from '../../src/types/project.ts';

const ALLOWED_PROVIDER_HOSTS: Record<AIProviderType, string[]> = {
  openrouter: ['openrouter.ai', 'api.openrouter.ai'],
  openai: ['api.openai.com'],
  claude: ['api.anthropic.com'],
  gemini: ['generativelanguage.googleapis.com'],
};

const DEFAULT_BASE_URLS: Record<AIProviderType, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com',
};

function isPrivateOrBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // AWS/GCP/Azure link-local metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateOrBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (net.isIPv4(normalized)) return isPrivateOrBlockedIpv4(normalized);
  if (net.isIPv6(normalized)) {
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('::ffff:')) {
      return isPrivateOrBlockedIpv4(normalized.slice(7));
    }
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    return false;
  }
  return true;
}

function isAllowedHost(provider: AIProviderType, hostname: string): boolean {
  const host = hostname.toLowerCase();
  const allowed = ALLOWED_PROVIDER_HOSTS[provider] || [];
  return allowed.includes(host);
}

export async function validateAiBaseUrl(
  provider: AIProviderType,
  rawBaseUrl?: string | null,
  options?: { skipDnsLookup?: boolean }
): Promise<string> {
  const candidate = (rawBaseUrl || '').trim() || DEFAULT_BASE_URLS[provider];

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Invalid AI baseUrl format.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS endpoints are permitted for AI provider requests.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Credentials are not allowed inside AI baseUrl.');
  }

  if (parsed.port && parsed.port !== '443') {
    throw new Error('Non-standard ports are blocked on AI provider endpoints.');
  }

  if (net.isIP(parsed.hostname)) {
    throw new Error('Direct IP literals are not allowed for AI provider baseUrl.');
  }

  if (!isAllowedHost(provider, parsed.hostname)) {
    throw new Error(
      `Host "${parsed.hostname}" is not in the allowlist for provider "${provider}".`
    );
  }

  if (!options?.skipDnsLookup) {
    const records = await dns.lookup(parsed.hostname, { all: true });
    if (!records.length || records.some((r) => isPrivateOrBlockedIp(r.address))) {
      throw new Error('AI provider hostname resolved to a private or blocked network range.');
    }
  }

  return parsed.toString().replace(/\/$/, '');
}
