import type { MarketplaceObservation } from '../types/project.ts';

// Independent origin is stricter than a user-supplied report/chain label.
// Multiple dates, categories and third-party Amazon/Keepa reports still share
// one marketplace dataset. Explicit shared-chain labels also collapse reports
// across hosts, including syndication the reviewer has identified.
function originKey(obs: MarketplaceObservation): string {
  const host = (() => { try { return new URL(obs.sourceURL || obs.productURL).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; } })();
  if (obs.marketplace === 'Amazon Kindle' || obs.marketplace === 'Keepa' || /(^|\.)(amazon\.com|keepa\.com)$/.test(host)) return 'origin:amazon';
  if (obs.marketplace === 'Apple Books' || /(^|\.)apple\.com$/.test(host) || host === 'rss.applemarketingtools.com') return 'origin:apple-books';
  if (obs.marketplace === 'NYT Best Sellers' || /(^|\.)nytimes\.com$/.test(host)) return 'origin:nyt-lists';
  if (obs.marketplace === 'Google Trends' || host === 'trends.google.com') return 'origin:google-trends';
  if (obs.marketplace === 'Whop' || host === 'whop.com' || host === 'www.whop.com') return 'origin:whop';
  // Unknown origins are conservatively collapsed by publisher host. The
  // reviewer must retain the true underlying dataset in evidenceChainId.
  return `origin:${host || 'unknown'}`;
}

export function evidenceChainKeys(observations: MarketplaceObservation[]): Map<string,string> {
  const parents = new Map<string,string>();
  const root = (key:string):string => { const parent=parents.get(key); if(!parent){parents.set(key,key);return key;} return parent===key?key:root(parent); };
  const join = (a:string,b:string) => {
    const ra=root(a), rb=root(b);
    if (ra === rb) return;
    const representative = ra < rb ? ra : rb;
    parents.set(ra, representative);
    parents.set(rb, representative);
  };
  for(const obs of observations) {
    const origin=originKey(obs);
    root(origin);
    if(obs.evidenceChainId?.trim())join(origin,`declared:${obs.evidenceChainId.trim()}`);
  }
  // Stable, inspectable origin names, independent of record order.
  const groups=new Map<string,string[]>();
  for(const obs of observations) {const key=root(originKey(obs)); groups.set(key,[...(groups.get(key)||[]),originKey(obs)]);}
  return new Map(observations.map(obs=>[obs.id,[...new Set(groups.get(root(originKey(obs)))!)].sort().join('+')]));
}
