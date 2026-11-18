import type { MarketplaceObservation } from '../types/project.ts';

export const MARKETPLACE_OPTIONS: MarketplaceObservation['marketplace'][] = [
  'Amazon Kindle', 'Apple Books', 'Whop', 'Gumroad', 'Etsy', 'Payhip',
  'NYT Best Sellers', 'Keepa', 'Google Trends', 'Google Play Books', 'Kobo', 'Other Research Source',
];

export function listingMarketplace(raw: string): MarketplaceObservation['marketplace'] | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return;
    const host = url.hostname.toLowerCase();
    if (host === 'whop.com' || host === 'www.whop.com') return 'Whop';
    if (host === 'gumroad.com' || host.endsWith('.gumroad.com')) return 'Gumroad';
    if (host === 'payhip.com' || host === 'www.payhip.com') return 'Payhip';
    if (host === 'etsy.com' || host === 'www.etsy.com') return 'Etsy';
  } catch { /* Unsupported URLs are not requested. */ }
}

export function isSpecificListingUrl(raw: string): boolean {
  if (!listingMarketplace(raw)) return false;
  const {pathname} = new URL(raw);
  const parts = pathname.split('/').filter(Boolean);
  switch (listingMarketplace(raw)) {
    case 'Whop': return (parts[0] === 'discover' ? parts.slice(1) : parts).length === 2;
    case 'Gumroad': return /\/l\/[^/]+\/?$/.test(pathname);
    case 'Payhip': return /^\/b\/[^/]+\/?$/.test(pathname);
    case 'Etsy': return /^\/listing\/\d+(?:\/[^/]+)?\/?$/.test(pathname);
    default: return false;
  }
}
