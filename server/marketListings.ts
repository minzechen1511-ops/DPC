import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import type {MarketplaceObservation} from '../src/types/project.ts';
import {createManualObservationRecord,computeObservationEvidenceHash} from '../src/utils/manualEvidenceReview.ts';
import {isSpecificListingUrl,listingMarketplace} from '../src/utils/marketPlatforms.ts';
import {readPublicListingSource} from './marketResearch.ts';

function productNodes(value:unknown,depth=0):Record<string,any>[] {
  if(depth>8 || !value || typeof value!=='object')return [];
  if(Array.isArray(value))return value.flatMap(item=>productNodes(item,depth+1));
  const node=value as Record<string,any>;
  const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
  return types.includes('Product')?[node]:productNodes(node['@graph'],depth+1);
}
const normalizedUrl=(raw:string)=>{const u=new URL(raw);return `${u.origin}${u.pathname.replace(/\/+$/,'')}`;};

/** Public JSON-LD offer facts, never sales/rank or fulfilled seller promises. */
export function parsePublicListing(body:string,url:string,category:string,productFormat:string,retrievedAt=new Date().toISOString()):MarketplaceObservation {
  if(!isSpecificListingUrl(url))throw new Error('A specific supported product URL is required; homepages, discovery and search pages cannot become product evidence.');
  const marketplace=listingMarketplace(url)!;
  const $=load(body);
  if(/access denied|captcha|robot check|just a moment|sign in|page not found/i.test($('title').text()))throw new Error('Public source returned an access challenge, sign-in or missing page. No observation was created.');
  const products:Record<string,any>[]=[];
  $('script[type="application/ld+json"]').each((_,el)=>{try{products.push(...productNodes(JSON.parse($(el).text())));}catch{/* Keep malformed scripts from becoming invented product records. */}});
  const matching=products.filter(p=>{
    if(typeof p.name!=='string'||p.name.trim().length<3||typeof p.url!=='string')return false;
    try{return normalizedUrl(new URL(p.url,url).href)===normalizedUrl(url);}catch{return false;}
  });
  if(matching.length!==1)throw new Error('No single structured Product matching this exact public URL was found. Use manual evidence/import with retained material; no metadata was invented.');
  const product=matching[0];
  const offers=Array.isArray(product.offers)?product.offers:product.offers?[product.offers]:[];
  const validOffers=offers.filter(o=>o && o['@type']==='Offer' && (typeof o.price==='number'||typeof o.price==='string') && String(o.price).trim()!=='' && Number.isFinite(Number(o.price)) && Number(o.price)>=0 && /^[A-Za-z]{3}$/.test(o.priceCurrency));
  const offer=validOffers.length===1?validOffers[0]:undefined;
  const seller=typeof product.brand==='string'?product.brand:typeof product.brand?.name==='string'?product.brand.name:typeof product.seller?.name==='string'?product.seller.name:'Not supplied';
  // Keep only original offer facts, not lengthy seller marketing copy or
  // unrelated page analytics, scripts, private content or session tokens.
  const material={name:product.name,url:product.url,sku:product.sku,brand:product.brand,offers:product.offers};
  const content=JSON.stringify(material);
  if(Buffer.byteLength(content)>40_000)throw new Error('Structured product evidence is too large to retain safely; use a smaller explicit manual excerpt.');
  const pricingTerms=offer?'Advertised offer price only. Billing period, renewals, trials, fees and checkout total are unknown unless separately inspected.':'No unambiguous numeric Offer price/currency exposed; price remains unknown.';
  const created=createManualObservationRecord({id:`PAGE-${createHash('sha256').update(normalizedUrl(url)).digest('hex').slice(0,20)}`,marketplace,publisher:marketplace,sellerOrAuthor:seller,productTitle:product.name,productURL:url,sourceURL:url,country:'Unknown / listing-specific',category,productFormat,sourceClass:'supporting_context',evidenceType:'listing_details',currentPrice:offer?Number(offer.price):undefined,currency:offer?offer.priceCurrency.toUpperCase():'',pricingTerms,dataAsOfDate:retrievedAt,retrievedAt,evidenceExcerpt:`Structured Product name: ${product.name}; brand/seller: ${seller}; advertised offer: ${offer?`${offer.price} ${offer.priceCurrency}`:'price unknown'}.`,excerptLocator:'script[type="application/ld+json"] Product matching this product URL',collectionMethodology:'Backend extraction of original public JSON-LD Product/Offer facts; human relevance and scope review required.',evidenceChainId:`${marketplace.toLowerCase()}-public-listings`,dataLimitations:`Listing metadata only: no unit sales, buyer demand, sales rank, conversion, revenue, profitability, purchase verification or seller-result verification. Country/category/format require review; category and format are user-supplied investigation scope. ${pricingTerms}`},'public_page_capture');
  if(!created.observation)throw new Error(created.errors.join(' '));
  const observation={...created.observation,priceKnown:Boolean(offer),currency:offer?offer.priceCurrency.toUpperCase():'UNKNOWN',evidenceCapture:{content,mediaType:'application/json',sha256:createHash('sha256').update(content).digest('hex'),sourceURL:url,retrievedAt}};
  observation.evidenceVersionHash=computeObservationEvidenceHash(observation);
  return observation;
}

export async function retrievePublicListing(input:{url:string;category:string;productFormat:string}) {
  if(!isSpecificListingUrl(input.url))throw new Error('Provide a specific Whop, Gumroad, Etsy or Payhip product URL, not a discovery/search/home page.');
  const result=await readPublicListingSource(input.url);
  const retrievedAt=new Date().toISOString();
  return {requestedURL:input.url,resolvedURL:result.resolvedUrl,httpStatus:result.httpStatus,checkedAt:retrievedAt,responseSha256:createHash('sha256').update(result.body).digest('hex'),observation:parsePublicListing(result.body,result.resolvedUrl,input.category,input.productFormat,retrievedAt)};
}
