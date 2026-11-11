import { load } from 'cheerio';
import { fetch as proxyFetch, EnvHttpProxyAgent } from 'undici';
import type { MarketplaceObservation } from '../src/types/project.ts';

export const MARKET_SOURCES = [
  { marketplace: 'Apple Books', url: 'https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json' },
  { marketplace: 'Amazon Kindle', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text' },
  { marketplace: 'Gumroad', url: 'https://gumroad.com/discover' },
  { marketplace: 'Etsy', url: 'https://www.etsy.com/market/digital_downloads' },
  { marketplace: 'Payhip', url: 'https://payhip.com/marketplace' },
] as const;
export type SourceReport = { marketplace: string; url: string; status: 'verified' | 'unavailable' | 'no_ranking'; message: string; checkedAt: string; count: number };
export interface MarketResearchResult { observations: MarketplaceObservation[]; sources: SourceReport[]; checkedAt: string }
const dispatcher = new EnvHttpProxyAgent();

export function parseAppleChart(body: string, observedAt: string): MarketplaceObservation[] {
  const data = JSON.parse(body);
  const updated = Date.parse(data.feed?.updated);
  const age = Date.parse(observedAt) - updated;
  if (!Number.isFinite(updated) || age < -5 * 60_000 || age > 48 * 60 * 60_000) throw new Error('Source feed update time is missing, stale or in the future.');
  if (!Array.isArray(data.feed?.results)) throw new Error('Chart response has no results array.');
  return data.feed.results.flatMap((item: any, i: number) => {
    if (!item.id || !item.name || !/^https:\/\/books\.apple\.com\//.test(item.url || '')) return [];
    return [{ id: `apple-${item.id}`, marketplace: 'Apple Books' as const, category: (item.genres || []).map((g: any) => g.name).join(' > ') || 'Books', productTitle: item.name, sellerOrAuthor: item.artistName || 'Not listed', productURL: item.url, currentPrice: 0, priceKnown: false, currency: 'USD', observedRank: i + 1, rankScope: 'US Apple Books · Top paid books · overall chart', productFormat: 'Ebook', observedAt, evidenceLevel: 'VERIFIED_RANKING' as const, sourceURL: MARKET_SOURCES[0].url, evidenceExcerpt: `Position ${i + 1} in Apple top-paid chart: ${item.name}`, isSample: false, collector: 'apple-chart-v1', dataLimitations: 'Chart position is a snapshot, not unit sales or revenue. Price and reviews are not supplied by this feed. A ranked title does not prove an adjacent new product will sell.' }];
  });
}
export function parseAmazonChart(body: string, observedAt: string): MarketplaceObservation[] {
  const $ = load(body);
  if (/captcha|robot check|enter the characters/i.test($('title').text())) throw new Error('Marketplace requires human verification.');
  const results: MarketplaceObservation[] = [];
  $('[data-asin]').each((_, element) => {
    const card = $(element), asin = card.attr('data-asin');
    const rankText = card.find('.zg-bdg-text').first().text().trim();
    const rank = Number(/^#([\d,]+)$/.exec(rankText)?.[1]?.replaceAll(',', ''));
    const anchor = card.find('a[href*="/dp/"]').first();
    const title = card.find('img[alt]').first().attr('alt')?.trim();
    if (!asin || !/^[A-Z0-9]{10}$/.test(asin) || !rank || rank > 100 || !title || !anchor.length) return;
    if (results.some(r => r.id === `amazon-${asin}`)) return;
    results.push({ id: `amazon-${asin}`, marketplace: 'Amazon Kindle', category: 'Kindle Store', productTitle: title, sellerOrAuthor: card.find('.a-size-small .a-link-child').first().text().trim() || 'Not listed', productURL: `https://www.amazon.com/dp/${asin}`, currentPrice: 0, priceKnown: false, currency: 'USD', observedRank: rank, rankScope: 'Amazon US · Kindle Store Best Sellers chart', productFormat: 'Kindle Ebook', observedAt, evidenceLevel: 'VERIFIED_RANKING', sourceURL: MARKET_SOURCES[1].url, evidenceExcerpt: `${rankText} ${title}`, isSample: false, collector: 'amazon-chart-v1', dataLimitations: 'Public chart position only; sales, revenue, reviews and price are not inferred.' });
  });
  return results;
}

async function readSource(url: string): Promise<string> {
  // Only the fixed public sources above; redirects are refused, never followed to private hosts.
  const response = await proxyFetch(url, { dispatcher, redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json,text/html', 'User-Agent': 'DigitalProductStudio/1.0 (public marketplace research)' } });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}. Access or network policy may require configuration.`);
  let body = ''; let bytes = 0;
  const decoder = new TextDecoder();
  for await (const chunk of response.body!) {
    bytes += chunk.length;
    if (bytes > 3_000_000) { await response.body?.cancel().catch(() => {}); throw new Error('Source response exceeded the research size limit.'); }
    body += decoder.decode(chunk, { stream: true });
  }
  return body + decoder.decode();
}
let cache: { expires: number; result: MarketResearchResult } | undefined;
let pending: Promise<MarketResearchResult> | undefined;
export async function collectMarketResearch(): Promise<MarketResearchResult> {
  if (cache && cache.expires > Date.now()) return cache.result;
  if (pending) return pending;
  pending = (async () => {
    const checkedAt = new Date().toISOString();
    const collected = await Promise.all(MARKET_SOURCES.map(async source => {
      try {
        const body = await readSource(source.url);
        const observations = source.marketplace === 'Apple Books' ? parseAppleChart(body, checkedAt) : source.marketplace === 'Amazon Kindle' ? parseAmazonChart(body, checkedAt) : [];
        return { observations, report: { ...source, checkedAt, count: observations.length, status: observations.length ? 'verified' : 'no_ranking', message: observations.length ? 'Source chart positions captured; inspect the linked source and timestamp.' : 'Page reached, but no supported public ranking feed was found. Listings and featured placement are not bestseller proof.' } as SourceReport };
      } catch (error) {
        return { observations: [], report: { ...source, checkedAt, count: 0, status: 'unavailable', message: error instanceof Error && error.message !== 'fetch failed' ? error.message : 'Could not reach the public source. Check the configured HTTPS proxy, marketplace access and allowed domains; no sample data was substituted.' } as SourceReport };
      }
    }));
    const result = { checkedAt, observations: collected.flatMap(r => r.observations), sources: collected.map(r => r.report) };
    cache = { expires: Date.now() + (result.observations.length ? 15 * 60_000 : 60_000), result };
    return result;
  })();
  try { return await pending; } finally { pending = undefined; }
}
