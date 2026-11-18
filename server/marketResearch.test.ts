import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAppleChart,
  parseAmazonChart,
  APPLE_LEGACY_FEED_URL,
  APPLE_CANONICAL_FEED_URL,
  checkUrlAccessibility,
} from './marketResearch.ts';
import { INITIAL_GATE_A_RESOURCES } from '../src/utils/marketResourceDirectory.ts';

const now = new Date().toISOString();

test('1. Apple chart accepts <48h feed, preserves feed dataAsOfDate separate from retrievedAt, and rejects >48h feeds', () => {
  const feedUpdated = new Date(Date.now() - 2 * 3600_000).toISOString();
  const input = JSON.stringify({
    feed: {
      updated: feedUpdated,
      results: [
        {
          id: '101',
          name: 'Solo Systems Playbook',
          artistName: 'J. Doe',
          url: 'https://books.apple.com/us/book/id101',
          genres: [{ name: 'Business' }],
        },
        { id: '102', name: 'Unsafe', url: 'javascript:alert(1)' },
      ],
    },
  });

  const result = parseAppleChart(input, now, APPLE_CANONICAL_FEED_URL);
  assert.equal(result.length, 1);
  assert.equal(result[0].observedRank, 1);
  assert.equal(result[0].dataAsOfDate, feedUpdated);
  assert.equal(result[0].retrievedAt, now);
  assert.equal(result[0].observedAt, feedUpdated);
  assert.notEqual(result[0].dataAsOfDate, result[0].retrievedAt);
  assert.equal(result[0].priceKnown, false);
  assert.equal(result[0].reviewCount, undefined);
  assert.equal(result[0].collector, 'apple-chart-v1');
  assert.equal(result[0].acquisitionMethod, 'live_collector');
  assert.equal(result[0].sourceURL, APPLE_CANONICAL_FEED_URL);

  const staleDate = new Date(Date.now() - 49 * 3600_000).toISOString();
  assert.throws(
    () => parseAppleChart(JSON.stringify({ feed: { updated: staleDate, results: [] } }), now),
    /stale/
  );
  assert.throws(() => parseAppleChart('{}', now));
  assert.notEqual(String(APPLE_LEGACY_FEED_URL), String(APPLE_CANONICAL_FEED_URL));
});

test('2. Amazon collector requires explicit numbered badges, valid ASIN anchors, and rejects challenge pages or unexpected DOM', () => {
  const html =
    '<title>Amazon Best Sellers</title>' +
    '<div data-asin="B000000001"><span class="zg-bdg-text">#2</span><a href="/dp/B000000001"><img alt="Budget Planner Guide"></a></div>' +
    '<div data-asin="B000000002"><a href="/dp/B000000002"><img alt="Unranked search result"></a></div>';
  const result = parseAmazonChart(html, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].observedRank, 2);
  assert.equal(result[0].productURL, 'https://www.amazon.com/dp/B000000001');
  assert.equal(result[0].acquisitionMethod, 'live_collector');

  // Challenge / CAPTCHA rejected cleanly
  assert.throws(() => parseAmazonChart('<title>Robot Check</title>', now), /human verification/);
  // Sign-in returns empty without throwing fake observations
  assert.deepEqual(parseAmazonChart('<title>Sign in</title>', now), []);
  // Unexpected layout with ASIN cards but zero numbered badges throws cleanly rather than inferring rank from DOM order
  assert.throws(
    () => parseAmazonChart('<title>Amazon</title><div data-asin="B000000009"><a href="/dp/B000000009"><img alt="No badge"></a></div>', now),
    /numbered rank badges/
  );
});

test('3. Seed resource directory preserves all 9 resources with honest scope & checkUrlAccessibility refuses unsafe protocols', async () => {
  assert.equal(INITIAL_GATE_A_RESOURCES.length, 9);
  for (const res of INITIAL_GATE_A_RESOURCES) {
    assert.ok(res.publisher && res.resourceName && res.originalURL);
    assert.ok(res.whatItSupports && res.importantLimitations);
  }
  const gumroadSeed = INITIAL_GATE_A_RESOURCES.find((r) => r.id === 'res-gumroad-discover')!;
  const etsySeed = INITIAL_GATE_A_RESOURCES.find((r) => r.id === 'res-etsy-digital-downloads')!;
  const payhipSeed = INITIAL_GATE_A_RESOURCES.find((r) => r.id === 'res-payhip-marketplace')!;
  assert.notEqual(gumroadSeed.collectionMethod, 'supported_collector');
  assert.notEqual(etsySeed.collectionMethod, 'supported_collector');
  assert.notEqual(payhipSeed.collectionMethod, 'supported_collector');

  const blockedCheck = await checkUrlAccessibility('http://127.0.0.1:8080/secret', 'local-ssrf');
  assert.equal(blockedCheck.accessStatus, 'blocked');
});
