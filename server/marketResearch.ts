import { load } from 'cheerio';
import { fetch as proxyFetch, EnvHttpProxyAgent, Agent, type Dispatcher } from 'undici';
import { lookup } from 'node:dns';
import type { LookupFunction } from 'node:net';
import type { GateAResourceEntry, MarketplaceObservation } from '../src/types/project.ts';
import { INITIAL_GATE_A_RESOURCES } from '../src/utils/marketResourceDirectory.ts';
import { isPrivateResearchAddress } from './referenceResearch.ts';

export const APPLE_LEGACY_FEED_URL = 'https://rss.applemarketingtools.com/api/v2/us/books/top-paid/100/books.json';
export const APPLE_CANONICAL_FEED_URL = 'https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json';

export const MARKET_SOURCES = [
  { marketplace: 'Apple Books', url: APPLE_LEGACY_FEED_URL, categoryLabel: 'Apple Books · Top Paid Books', rankScope: 'US Apple Books · Top paid books · overall chart' },
  { marketplace: 'Amazon Kindle', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store/zgbs/digital-text', categoryLabel: 'Kindle Store', rankScope: 'Amazon US · Kindle Store Best Sellers chart' },
  { marketplace: 'Amazon Kindle · Business & Money', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store-Business-Investing/zgbs/digital-text/154821011', categoryLabel: 'Investing, Money & Personal Finance', rankScope: 'Amazon US · Business & Investing Best Sellers' },
  { marketplace: 'Amazon Kindle · Health & Wellness', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store-Health-Fitness-Dieting/zgbs/digital-text/156430011', categoryLabel: 'Health, Fitness & Habits', rankScope: 'Amazon US · Health, Fitness & Dieting Best Sellers' },
  { marketplace: 'Amazon Kindle · Self-Help', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store-Self-Help/zgbs/digital-text/156563011', categoryLabel: 'Self-Help, Habits & Mindset', rankScope: 'Amazon US · Self-Help Best Sellers' },
  { marketplace: 'Amazon Kindle · Cookbooks & Meals', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store-Cookbooks-Food-Wine/zgbs/digital-text/156154011', categoryLabel: 'Cookbooks, Food & Meal Planning', rankScope: 'Amazon US · Cookbooks, Food & Wine Best Sellers' },
  { marketplace: 'Amazon Kindle · Tech & Systems', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store-Computers-Technology/zgbs/digital-text/156116011', categoryLabel: 'Computers, AI Systems & Productivity', rankScope: 'Amazon US · Computers & Technology Best Sellers' },
  { marketplace: 'Amazon Kindle · Education & Career', url: 'https://www.amazon.com/Best-Sellers-Kindle-Store-Education-Teaching/zgbs/digital-text/158125011', categoryLabel: 'Education, Teaching & Career', rankScope: 'Amazon US · Education & Teaching Best Sellers' },
  { marketplace: 'Gumroad', url: 'https://gumroad.com/discover', categoryLabel: 'Gumroad Discover', rankScope: 'Gumroad Discover' },
  { marketplace: 'Etsy', url: 'https://www.etsy.com/market/digital_downloads', categoryLabel: 'Etsy Digital Downloads', rankScope: 'Etsy Digital Downloads' },
  { marketplace: 'Payhip', url: 'https://payhip.com/marketplace', categoryLabel: 'Payhip Marketplace', rankScope: 'Payhip Marketplace' },
] as const;

export type SourceReport = {
  marketplace: string;
  url: string;
  status: 'verified' | 'unavailable' | 'no_ranking';
  message: string;
  checkedAt: string;
  count: number;
};

export interface MarketResearchResult {
  observations: MarketplaceObservation[];
  sources: SourceReport[];
  checkedAt: string;
  resourceDirectory?: GateAResourceEntry[];
}

const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    if (!addresses.length || addresses.some((item) => isPrivateResearchAddress(item.address))) {
      return callback(new Error('Source resolves to a private or reserved address; check refused.'), '', 0);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

const hasProxy = Boolean(
  process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy
);

const dispatcher: Dispatcher = hasProxy
  ? new EnvHttpProxyAgent()
  : new Agent({ connect: { lookup: publicLookup } });

export function parseAppleChart(
  body: string,
  retrievedAt: string,
  sourceURL: string = APPLE_LEGACY_FEED_URL
): MarketplaceObservation[] {
  const data = JSON.parse(body);
  const feedUpdatedRaw = typeof data.feed?.updated === 'string' ? data.feed.updated.trim() : '';
  const updated = Date.parse(feedUpdatedRaw);
  const retrievedMs = Date.parse(retrievedAt);
  const age = retrievedMs - updated;
  if (!feedUpdatedRaw || !Number.isFinite(updated) || age < -5 * 60_000 || age > 48 * 60 * 60_000) {
    throw new Error('Source feed update time is missing, stale (>48h) or in the future.');
  }
  if (!Array.isArray(data.feed?.results)) {
    throw new Error('Chart response has no results array.');
  }

  return data.feed.results.flatMap((item: any, i: number) => {
    if (!item.id || !item.name || !/^https:\/\/books\.apple\.com\//.test(item.url || '')) return [];
    const dataAsOfIso = new Date(updated).toISOString();
    return [
      {
        id: `apple-${item.id}`,
        marketplace: 'Apple Books' as const,
        country: 'US',
        category: (item.genres || []).map((g: any) => g.name).join(' > ') || 'Books',
        productTitle: item.name,
        sellerOrAuthor: item.artistName || 'Not listed',
        productURL: item.url,
        currentPrice: 0,
        priceKnown: false,
        currency: 'USD',
        observedRank: i + 1,
        rankScope: 'US Apple Books · Top paid books · overall chart',
        metricName: 'Chart Position',
        metricValue: i + 1,
        metricUnit: 'ordinal rank',
        productFormat: 'Ebook',
        // Preserve feed update timestamp separately from HTTP retrieval time
        observedAt: dataAsOfIso,
        dataAsOfDate: dataAsOfIso,
        retrievedAt,
        sourceClass: 'primary_marketplace' as const,
        acquisitionMethod: 'live_collector' as const,
        evidenceType: 'official_ranking' as const,
        reviewStatus: 'retrieved_checked' as const,
        evidenceLevel: 'VERIFIED_RANKING' as const,
        sourceURL,
        evidenceExcerpt: `Position ${i + 1} in Apple US top-paid chart (feed updated ${dataAsOfIso}): ${item.name}`,
        excerptLocator: `feed.results[${i}] · feed.updated=${feedUpdatedRaw}`,
        collectionMethodology: 'Apple Books official RSS/JSON top-paid feed collector',
        evidenceChainId: `apple-us-top-paid-${dataAsOfIso.slice(0, 13)}`,
        isSample: false,
        collector: 'apple-chart-v1' as const,
        dataLimitations:
          'Chart position is a point-in-time snapshot, not unit sales, conversion, or revenue. Price and reviews are not supplied by this feed. A ranked book does not prove a separate product will sell.',
      },
    ];
  });
}

export function parseAmazonChart(
  body: string,
  observedAt: string,
  categoryLabel = 'Kindle Store',
  sourceURL: string = MARKET_SOURCES[1].url,
  rankScope = 'Amazon US · Kindle Store Best Sellers chart'
): MarketplaceObservation[] {
  const $ = load(body);
  const titleText = $('title').text().trim();
  if (/captcha|robot check|enter the characters|sorry!\s*something went wrong/i.test(titleText)) {
    throw new Error('Marketplace requires human verification or returned an access challenge.');
  }
  if (/sign[\s-]*in/i.test(titleText)) {
    return [];
  }

  const results: MarketplaceObservation[] = [];
  $('[data-asin]').each((_, element) => {
    const card = $(element);
    const asin = card.attr('data-asin');
    const rankText = card.find('.zg-bdg-text').first().text().trim();
    const rank = Number(/^#([\d,]+)$/.exec(rankText)?.[1]?.replaceAll(',', ''));
    const anchor = card.find('a[href*="/dp/"]').first();
    const title = card.find('img[alt]').first().attr('alt')?.trim();
    if (!asin || !/^[A-Z0-9]{10}$/.test(asin) || !rank || rank > 100 || !title || !anchor.length) return;
    if (results.some((r) => r.id === `amazon-${asin}`)) return;

    results.push({
      id: `amazon-${asin}`,
      marketplace: 'Amazon Kindle',
      country: 'US',
      category: categoryLabel,
      productTitle: title,
      sellerOrAuthor: card.find('.a-size-small .a-link-child').first().text().trim() || 'Not listed',
      productURL: `https://www.amazon.com/dp/${asin}`,
      currentPrice: 0,
      priceKnown: false,
      currency: 'USD',
      observedRank: rank,
      rankScope,
      metricName: 'Chart Position',
      metricValue: rank,
      metricUnit: 'numbered chart badge',
      productFormat: 'Kindle Ebook',
      observedAt,
      dataAsOfDate: observedAt,
      retrievedAt: observedAt,
      sourceClass: 'primary_marketplace',
      acquisitionMethod: 'live_collector',
      evidenceType: 'official_ranking',
      reviewStatus: 'retrieved_checked',
      evidenceLevel: 'VERIFIED_RANKING',
      sourceURL,
      evidenceExcerpt: `${rankText} ${title} (${categoryLabel})`,
      excerptLocator: `[data-asin="${asin}"] .zg-bdg-text`,
      collectionMethodology: 'Amazon Best Sellers public HTML collector (explicitly numbered .zg-bdg-text + ASIN only)',
      evidenceChainId: `amazon-zgbs-${categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${observedAt.slice(0, 13)}`,
      isSample: false,
      collector: 'amazon-chart-v1',
      dataLimitations:
        'Public chart position only; sales volume, revenue, conversion, reviews, and price are not inferred from rank or search order.',
    });
  });

  if (results.length === 0 && $('[data-asin]').length > 0) {
    throw new Error('Amazon page layout lacked explicitly numbered rank badges (.zg-bdg-text) or valid ASIN cards.');
  }

  return results;
}

async function readBoundedText(response: Awaited<ReturnType<typeof proxyFetch>>): Promise<string> {
  let body = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  for await (const chunk of response.body!) {
    bytes += chunk.length;
    if (bytes > 3_000_000) {
      await response.body?.cancel().catch(() => {});
      throw new Error('Source response exceeded the 3 MB research size limit.');
    }
    body += decoder.decode(chunk, { stream: true });
  }
  return body + decoder.decode();
}

async function readSource(url: string): Promise<{ body: string; resolvedUrl: string }> {
  // Only the fixed public sources above; redirects are rejected except the canonical Apple RSS relocation.
  const response = await proxyFetch(url, {
    dispatcher,
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: 'application/json,text/html',
      'User-Agent': 'DigitalProductStudio/1.0 (public marketplace research)',
    },
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') || '';
    await response.body?.cancel().catch(() => {});
    if (url === APPLE_LEGACY_FEED_URL && location === APPLE_CANONICAL_FEED_URL) {
      const redirected = await proxyFetch(location, {
        dispatcher,
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DigitalProductStudio/1.0 (public marketplace research)',
        },
      });
      if (!redirected.ok) {
        await redirected.body?.cancel().catch(() => {});
        throw new Error(`Apple feed redirect target returned HTTP ${redirected.status}.`);
      }
      return { body: await readBoundedText(redirected), resolvedUrl: location };
    }
    throw new Error(`Source attempted unallowlisted redirect (HTTP ${response.status}). Refused for safety.`);
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Source returned HTTP ${response.status}. Access or network policy may require configuration.`);
  }
  return { body: await readBoundedText(response), resolvedUrl: url };
}

/**
 * Checks public HTTP accessibility of a fixed directory resource (or safe public URL).
 * Establishes HTTP reachability ONLY — never validates page claims or bestseller status.
 */
export async function checkUrlAccessibility(
  rawUrl: string,
  resourceId = 'custom'
): Promise<Pick<GateAResourceEntry, 'id' | 'accessStatus' | 'httpStatus' | 'lastCheckedAt' | 'lastCheckNote' | 'resolvedURL'>> {
  const checkedAt = new Date().toISOString();
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      return {
        id: resourceId,
        accessStatus: 'blocked',
        httpStatus: null,
        lastCheckedAt: checkedAt,
        lastCheckNote: 'Blocked unsafe URL protocol, port, or credentials.',
      };
    }

    const response = await proxyFetch(rawUrl, {
      dispatcher,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: 'application/json,text/html,*/*;q=0.8',
        'User-Agent': 'DigitalProductStudio/1.0 (research directory check)',
      },
    });
    const status = response.status;
    const location = response.headers.get('location') || undefined;
    await response.body?.cancel().catch(() => {});

    if (status >= 200 && status < 300) {
      return {
        id: resourceId,
        accessStatus: 'accessible',
        httpStatus: status,
        lastCheckedAt: checkedAt,
        lastCheckNote: `HTTP ${status} reachable at check time. Reachability alone does not validate page claims or bestseller rank.`,
      };
    }
    if (status >= 300 && status < 400) {
      return {
        id: resourceId,
        accessStatus: 'redirected',
        httpStatus: status,
        resolvedURL: location,
        lastCheckedAt: checkedAt,
        lastCheckNote: `HTTP ${status} redirect${location ? ` → ${location}` : ''}. Follow manually or inspect target policy.`,
      };
    }
    if (status === 401 || status === 403 || status === 429) {
      return {
        id: resourceId,
        accessStatus: 'blocked',
        httpStatus: status,
        lastCheckedAt: checkedAt,
        lastCheckNote: `HTTP ${status} access restriction or anti-bot gate returned by host. Do not bypass; use manual review if needed.`,
      };
    }
    return {
      id: resourceId,
      accessStatus: 'unavailable',
      httpStatus: status,
      lastCheckedAt: checkedAt,
      lastCheckNote: `HTTP ${status} returned by destination.`,
    };
  } catch (err) {
    return {
      id: resourceId,
      accessStatus: 'unavailable',
      httpStatus: null,
      lastCheckedAt: checkedAt,
      lastCheckNote:
        err instanceof Error && err.message !== 'fetch failed'
          ? err.message
          : 'Could not connect to destination from server runtime.',
    };
  }
}

export async function checkResourceDirectory(): Promise<{
  checkedAt: string;
  resources: GateAResourceEntry[];
}> {
  const checkedAt = new Date().toISOString();
  const checks = await Promise.all(
    INITIAL_GATE_A_RESOURCES.map(async (entry) => {
      const result = await checkUrlAccessibility(entry.originalURL, entry.id);
      let collectionMethod = entry.collectionMethod;
      if (
        (result.accessStatus === 'blocked' || result.accessStatus === 'unavailable') &&
        entry.collectionMethod === 'supported_collector'
      ) {
        collectionMethod = 'unavailable';
      }
      return {
        ...entry,
        accessStatus: result.accessStatus,
        httpStatus: result.httpStatus,
        resolvedURL: result.resolvedURL || entry.resolvedURL,
        lastCheckedAt: result.lastCheckedAt,
        lastCheckNote: result.lastCheckNote,
        collectionMethod,
      };
    })
  );
  return { checkedAt, resources: checks };
}

let cache: { expires: number; result: MarketResearchResult } | undefined;
let pending: Promise<MarketResearchResult> | undefined;

export async function collectMarketResearch(): Promise<MarketResearchResult> {
  if (cache && cache.expires > Date.now()) return cache.result;
  if (pending) return pending;
  pending = (async () => {
    const checkedAt = new Date().toISOString();
    const collected = await Promise.all(
      MARKET_SOURCES.map(async (source) => {
        try {
          const { body, resolvedUrl } = await readSource(source.url);
          const observations =
            source.marketplace === 'Apple Books'
              ? parseAppleChart(body, checkedAt, resolvedUrl)
              : source.marketplace.startsWith('Amazon Kindle')
              ? parseAmazonChart(body, checkedAt, source.categoryLabel, source.url, source.rankScope)
              : [];
          return {
            observations,
            report: {
              marketplace: source.marketplace,
              url: source.url,
              checkedAt,
              count: observations.length,
              status: observations.length ? 'verified' : 'no_ranking',
              message: observations.length
                ? `Source chart positions captured (${resolvedUrl}); inspect source URL, feed timestamp, and limitations.`
                : 'Page reached, but no supported public ranking collector applies here. Discovery and featured listings are never bestseller proof.',
            } as SourceReport,
          };
        } catch (error) {
          return {
            observations: [],
            report: {
              marketplace: source.marketplace,
              url: source.url,
              checkedAt,
              count: 0,
              status: 'unavailable',
              message:
                error instanceof Error && error.message !== 'fetch failed'
                  ? error.message
                  : 'Could not reach the public source. Check HTTPS proxy, network policy, and allowed domains; no sample data was substituted.',
            } as SourceReport,
          };
        }
      })
    );

    const byId = new Map<string, MarketplaceObservation>();
    for (const obs of collected.flatMap((r) => r.observations)) {
      const existing = byId.get(obs.id);
      if (!existing || (existing.category === 'Kindle Store' && obs.category !== 'Kindle Store')) {
        byId.set(obs.id, obs);
      }
    }

    const reportByUrl = new Map(collected.map((c) => [c.report.url, c.report]));
    const resourceDirectory: GateAResourceEntry[] = INITIAL_GATE_A_RESOURCES.map((seed) => {
      const rpt = reportByUrl.get(seed.originalURL);
      if (!rpt) return { ...seed };
      return {
        ...seed,
        accessStatus:
          rpt.status === 'verified' || rpt.status === 'no_ranking'
            ? seed.originalURL === APPLE_LEGACY_FEED_URL
              ? 'redirected'
              : 'accessible'
            : /401|403|429|captcha|human verification/i.test(rpt.message)
            ? 'blocked'
            : 'unavailable',
        lastCheckedAt: rpt.checkedAt,
        lastCheckNote: rpt.message,
      };
    });

    const result: MarketResearchResult = {
      checkedAt,
      observations: [...byId.values()],
      sources: collected.map((r) => r.report),
      resourceDirectory,
    };
    cache = { expires: Date.now() + (result.observations.length ? 15 * 60_000 : 60_000), result };
    return result;
  })();
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}
