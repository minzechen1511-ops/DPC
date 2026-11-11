import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { fetch as proxyFetch, EnvHttpProxyAgent, Agent } from 'undici';
import { lookup } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';
import type { ResearchResult, RetrievedResearchDocument, ReferenceVerificationReport } from '../src/types/research.ts';
import { isAllowedResearchUrl, normalizeEvidenceText, sourceFingerprint } from '../src/utils/sourceEvidence.ts';
export function isPrivateResearchAddress(address: string): boolean {
 const value=address.toLowerCase();
 if(value.startsWith('::ffff:'))return isPrivateResearchAddress(value.slice(7));
 if(isIP(value)===6)return value==='::'||value==='::1'||/^(fc|fd|ff|fe[89ab])/.test(value);
 if(isIP(value)!==4)return true;
 const [a,b]=value.split('.').map(Number);
 return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19));
}
const publicLookup: LookupFunction=(hostname,options,callback)=>{
 lookup(hostname,{all:true,verbatim:true},(error,addresses)=>{
  if(error)return callback(error,'',0);
  if(!addresses.length||addresses.some(item=>isPrivateResearchAddress(item.address)))return callback(new Error('Source resolves to a private or reserved address; retrieval refused.'),'',0);
  if(options.all)return callback(null,addresses);
  callback(null,addresses[0].address,addresses[0].family);
 });
};
// In managed cloud the inherited proxy enforces public destination policy. Direct local runs
// validate DNS answers at connection time, and redirects are refused on both routes.
const hasProxy=Boolean(process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy);
const dispatcher=hasProxy?new EnvHttpProxyAgent():new Agent({connect:{lookup:publicLookup}});
const hash = (body: string) => createHash('sha256').update(body).digest('hex');
const plain = (text: string) => normalizeEvidenceText(load(text).text());
const terms = (query: string) => [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0,25);
const relevance = (query: string, text: string) => ({ query, matchedTerms: terms(query).filter(term => text.toLowerCase().includes(term)) });
async function readPublicSource(url: string): Promise<{body:string;contentType:string}> {
 const response = await proxyFetch(url,{dispatcher,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json,application/xml,text/xml,text/html','User-Agent':'DigitalProductStudio/1.0 (author-directed public reference research)'}});
 if(!response.ok)throw new Error(`Source returned HTTP ${response.status}; no retrieved evidence is available.`);
 const contentType=response.headers.get('content-type') || '';
 if(!/json|xml|html|text\/plain/i.test(contentType)){await response.body?.cancel();throw new Error('This source is not accessible HTML/XML/JSON. PDF or paywalled text has not been validated.');}
 const decoder=new TextDecoder();let body='';let bytes=0;
 for await(const chunk of response.body!){bytes+=chunk.length;if(bytes>3_000_000)throw new Error('Source exceeds the 3 MB text retrieval limit.');body+=decoder.decode(chunk,{stream:true});}
 return {body:body+decoder.decode(),contentType};
}
export function parseCrossref(body: string, query: string): ResearchResult[] {
 const json=JSON.parse(body);if(!Array.isArray(json.message?.items))throw new Error('Crossref returned no works array.');
 return json.message.items.flatMap((work:any)=>{
  const title=plain(work.title?.[0] || '');const doi=work.DOI;
  if(!title||typeof doi!=='string'||!/^10\.\d{4,9}\/\S+$/i.test(doi))return [];
  const abstract=work.abstract?plain(work.abstract):undefined;
  const fullTextURL=(work.link || []).map((link:any)=>link.URL).find((url:unknown)=>typeof url==='string'&&isAllowedResearchUrl(url));
  const date=(work.published?.['date-parts']?.[0] || work['published-print']?.['date-parts']?.[0] || []).join('-');
  return [{id:`crossref:${doi}`,provider:'Crossref',title,authors:(work.author || []).map((a:any)=>[a.given,a.family].filter(Boolean).join(' ')).filter(Boolean),publisher:work.publisher || 'Not supplied',publicationDate:date || undefined,doi,sourceURL:`https://doi.org/${doi}`,abstract,fullTextURL,isRetracted:Boolean(work.relation?.['is-retracted-by']?.length || work['update-to']?.some((u:any)=>u.type==='retraction')),relevance:relevance(query,`${title} ${abstract || ''}`)}];
 });
}
export function parseEuropePmc(body: string, query: string): ResearchResult[] {
 const json=JSON.parse(body);if(!Array.isArray(json.resultList?.result))throw new Error('Europe PMC returned no result list.');
 return json.resultList.result.flatMap((work:any)=>{
  if(!work.id||!work.title)return [];
  const pmcid=/^PMC\d+$/.test(work.pmcid || '')?work.pmcid:undefined;
  const abstract=work.abstractText?plain(work.abstractText):undefined;
  return [{id:`epmc:${work.source}:${work.id}`,provider:'Europe PMC',title:plain(work.title),authors:(work.authorList?.author || []).map((a:any)=>a.fullName).filter(Boolean),publisher:work.journalInfo?.journal?.title || work.journalTitle || 'Not supplied',publicationDate:work.firstPublicationDate || work.pubYear,doi:work.doi,sourceURL:pmcid?`https://europepmc.org/articles/${pmcid}`:`https://europepmc.org/article/${encodeURIComponent(work.source)}/${encodeURIComponent(work.id)}`,pmcid,abstract,isRetracted:work.isRetracted==='Y'||(work.pubTypeList?.pubType || []).some((type:string)=>/retract/i.test(type)),relevance:relevance(query,`${plain(work.title)} ${abstract || ''}`)}];
 });
}
export function parsePmcFullText(body: string, pmcid: string, retrievedAt=new Date().toISOString()): RetrievedResearchDocument {
 if(!/^PMC\d+$/.test(pmcid))throw new Error('Invalid PMC identifier.');
 const $=load(body,{xml:true});const article=$('article').first();
 if(!article.length||!article.find('body p').length)throw new Error('Full article body is unavailable; metadata and abstracts do not count as full text.');
 const actualPmc=article.find('article-id[pub-id-type="pmc"]').first().text().trim();
 if(!actualPmc||actualPmc.replace(/^PMC/,'')!==pmcid.slice(3))throw new Error('Retrieved article identifier does not match the selected record.');
 if(/retracted|retraction/i.test(article.attr('article-type') || '')||article.find('related-article[related-article-type="retracted-article"]').length)throw new Error('Retraction notice detected; this cannot serve as validated support.');
 const paragraphs=article.find('body p').toArray().map((element,index)=>{
  const paragraph=$(element),section=paragraph.parents('sec').first();
  return {locator:`${section.children('title').first().text().trim() || 'Article body'} · ${paragraph.attr('id') || `extracted paragraph ${index+1}`}`,text:normalizeEvidenceText(paragraph.text())};
 }).filter(p=>p.text.length>=40).slice(0,250);
 const title=plain(article.find('article-title').first().text());
 if(!title||!paragraphs.length)throw new Error('No substantive article text could be extracted.');
 return {provider:'Europe PMC',documentId:pmcid,title,canonicalUrl:`https://europepmc.org/articles/${pmcid}`,authors:article.find('contrib[contrib-type="author"] name').toArray().map(el=>normalizeEvidenceText([$(el).find('given-names').text(),$(el).find('surname').text()].filter(Boolean).join(' '))),publisher:article.find('journal-title').first().text().trim()||'Not supplied',publicationDate:article.find('pub-date year').first().text().trim()||undefined,doi:article.find('article-id[pub-id-type="doi"]').first().text().trim()||undefined,retrievedAt,contentHash:hash(JSON.stringify([title,paragraphs])),kind:'full_text',paragraphs,license:normalizeEvidenceText(article.find('permissions license').text())||undefined};
}
export function parseTrustedPage(body: string, canonicalUrl: string, retrievedAt=new Date().toISOString()): RetrievedResearchDocument {
 if(!isAllowedResearchUrl(canonicalUrl))throw new Error('Only supported public research domains may be retrieved.');
 const $=load(body);const title=plain($('meta[property="og:title"]').attr('content')||$('h1').first().text()||$('title').text());
 if(!title||/access denied|robot check|captcha|sign in|page not found/i.test(title))throw new Error('Source requires access or did not return the requested page.');
 $('script,style,nav,header,footer,form,aside').remove();
 const root=$('article').first().length?$('article').first():$('main').first().length?$('main').first():$('body');
 const paragraphs=root.find('p').toArray().map((el,index)=>({locator:`${title} · extracted paragraph ${index+1}`,text:normalizeEvidenceText($(el).text())})).filter(p=>p.text.length>=40).slice(0,250);
 if(!paragraphs.length)throw new Error('No substantive page paragraphs could be retrieved.');
 return {provider:'Trusted public page',documentId:canonicalUrl,title,canonicalUrl,authors:[$('meta[name="author"]').attr('content')||''].filter(Boolean),publisher:new URL(canonicalUrl).hostname,publicationDate:$('meta[name="citation_publication_date"]').attr('content')||$('meta[property="article:published_time"]').attr('content')||undefined,retrievedAt,contentHash:hash(JSON.stringify([title,paragraphs])),kind:'page_text',paragraphs};
}
const cache=new Map<string,{until:number;value:any}>();
export async function searchReferences(query: string) {
 const q=normalizeEvidenceText(query);if(q.length<3||q.length>250)throw new Error('Use a focused research query between 3 and 250 characters.');
 const key=`search:${q}`;if(cache.has(key)&&cache.get(key)!.until>Date.now())return cache.get(key)!.value;
 const sources=[{name:'Crossref',url:`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(q)}&rows=8`,parse:parseCrossref},{name:'Europe PMC',url:`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&resultType=core&pageSize=8`,parse:parseEuropePmc}];
 const result=await Promise.all(sources.map(async source=>{try { const {body}=await readPublicSource(source.url);const results=source.parse(body,q);return {results,status:{provider:source.name,state:'searched',message:`${results.length} bibliographic records. Full text and claim support remain unverified.`}}; }catch(error){return {results:[],status:{provider:source.name,state:'unavailable',message:error instanceof Error&&error.message!=='fetch failed'?error.message:'Public research service could not be reached. Check network access; no sources were invented.'}};}}));
 const results=result.flatMap(r=>r.results).sort((a,b)=>b.relevance.matchedTerms.length-a.relevance.matchedTerms.length);
 const value={query:q,checkedAt:new Date().toISOString(),results,sources:result.map(r=>r.status)};
 if(cache.size>50)cache.clear();cache.set(key,{until:Date.now()+60_000,value});return value;
}
export async function retrieveReference(input: {pmcid?:string;url?:string}): Promise<RetrievedResearchDocument> {
 let url:string;let key:string;
 if(input.pmcid){if(!/^PMC\d+$/.test(input.pmcid))throw new Error('Invalid PMC identifier.');key=input.pmcid;url=`https://www.ebi.ac.uk/europepmc/webservices/rest/${input.pmcid}/fullTextXML`;}
 else {url=input.url||'';if(!isAllowedResearchUrl(url))throw new Error('Use a supported HTTPS government, university or public research page. Private, arbitrary and credential-bearing URLs are rejected.');key=url;}
 const cacheKey=`document:${key}`;if(cache.has(cacheKey)&&cache.get(cacheKey)!.until>Date.now())return cache.get(cacheKey)!.value;
 const {body}=await readPublicSource(url);
 const document=input.pmcid?parsePmcFullText(body,input.pmcid):parseTrustedPage(body,url);
 if(cache.size>50)cache.clear();cache.set(cacheKey,{until:Date.now()+10*60_000,value:document});return document;
}

/** Gate/export preflight checks the actual source again, rather than trusting imported client flags. */
export async function verifyReferenceRecords(cards: import('../src/types/project.ts').ReferenceCard[], loader=retrieveReference): Promise<ReferenceVerificationReport> {
 const {isRetrievedSource}=await import('../src/utils/sourceEvidence.ts');
 const documents=new Map<string,Promise<RetrievedResearchDocument>>();
 const checks:ReferenceVerificationReport['checks']=[];
 for(let index=0;index<cards.length;index+=3){
  checks.push(...await Promise.all(cards.slice(index,index+3).map(async card=>{
   if(!isRetrievedSource(card))return {id:card.id,sourceFingerprint:sourceFingerprint(card),valid:false,message:'Record lacks matching retrieved text, excerpt or bibliography.'};
   const evidence=card.retrieval!;
   const input=evidence.provider==='Europe PMC'?{pmcid:evidence.documentId}:{url:evidence.canonicalUrl};
   const key=JSON.stringify(input);
   try{
    if(!documents.has(key))documents.set(key,loader(input));
    const document=await documents.get(key)!;
    const paragraph=document.paragraphs.find(item=>item.locator===evidence.locator);
    const matches=document.contentHash===evidence.contentHash&&document.canonicalUrl===evidence.canonicalUrl&&normalizeEvidenceText(document.title)===normalizeEvidenceText(card.sourceTitle)&&normalizeEvidenceText(document.authors.join(', '))===normalizeEvidenceText(card.author || '')&&document.publisher===card.publisherOrOrg&&(document.publicationDate || '')===(card.publicationDate || '')&&(document.doi || '').toLowerCase()===(card.doi || '').toLowerCase()&&Boolean(paragraph)&&normalizeEvidenceText(paragraph!.text)===normalizeEvidenceText(evidence.excerpt)&&normalizeEvidenceText(paragraph!.text).includes(normalizeEvidenceText(card.verificationQuote || ''));
    return {id:card.id,sourceFingerprint:sourceFingerprint(card),valid:matches,message:matches?'Bibliography, document identity and exact excerpt match retrieved source text.':'Source text or bibliography changed or does not match. Retrieve and review the source again.'};
   }catch{return {id:card.id,sourceFingerprint:sourceFingerprint(card),valid:false,message:'Original source could not be checked. Restore source access and retry; source flags alone cannot validate it.'};}
  })));
 }
 return {valid:checks.length>0&&checks.every(check=>check.valid),checkedAt:new Date().toISOString(),checks};
}
