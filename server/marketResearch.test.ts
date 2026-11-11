import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAppleChart, parseAmazonChart } from './marketResearch.ts';
const now = new Date().toISOString();
test('Apple chart preserves original ordinal rank and provenance without inferring sales or price',()=>{
 const input=JSON.stringify({feed:{updated:now,results:[{id:'1',name:'Fixture text',artistName:'Author',url:'https://books.apple.com/us/book/id1',genres:[{name:'Business'}]},{id:'2',name:'Unsafe',url:'javascript:alert(1)'}]}});
 const result=parseAppleChart(input,now);assert.equal(result.length,1);assert.equal(result[0].observedRank,1);assert.equal(result[0].priceKnown,false);assert.equal(result[0].reviewCount,undefined);assert.equal(result[0].collector,'apple-chart-v1');
 assert.throws(()=>parseAppleChart(JSON.stringify({feed:{updated:'2000-01-01',results:[]}}),now),/stale/);
 assert.throws(()=>parseAppleChart('{}',now));
});
test('Amazon requires explicit rank, ASIN, title and product anchor; featured placement is insufficient',()=>{
 const html='<title>Kindle Best Sellers</title><div data-asin="B000000001"><span class="zg-bdg-text">#2</span><a href="/dp/B000000001"><img alt="Fixture book"></a></div><div data-asin="B000000002"><a href="/dp/B000000002"><img alt="Featured only"></a></div>';
 const result=parseAmazonChart(html,now);assert.equal(result.length,1);assert.equal(result[0].observedRank,2);assert.equal(result[0].productURL,'https://www.amazon.com/dp/B000000001');
 assert.throws(()=>parseAmazonChart('<title>Robot Check</title>',now),/human verification/);
 assert.deepEqual(parseAmazonChart('<title>Sign in</title>',now),[]);
});
