import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parsePublicListing} from './marketListings.ts';
import {listingMarketplace,isSpecificListingUrl,MARKETPLACE_OPTIONS} from '../src/utils/marketPlatforms.ts';
import {INITIAL_GATE_A_RESOURCES,mergeResourceDirectory} from '../src/utils/marketResourceDirectory.ts';
import {parseImportedObservations,applyManualReviewDecision,editManualObservationRecord,isObservationReviewStale} from '../src/utils/manualEvidenceReview.ts';
import {deriveSynchronizedCandidates,isCurrentMarketEvidence,isGateAQualifiedEvidence,compareCandidateEvidence,propagateTopicToDownstream} from '../src/utils/marketDiscoveryEngine.ts';
import {migrateProjectSchema} from '../src/utils/projectMigration.ts';
import {BLANK_PROJECT} from '../src/data/demoProject.ts';
import {approveGate,gateIssues} from '../src/utils/gatePolicy.ts';
import {buildLearningBundle} from '../src/utils/learningBundle.ts';
import {LocalStore} from './db/localStore.ts';
import {createApiRouter} from './apiRouter.ts';
import {loadConfig} from './config.ts';
import express from 'express';
import {parseAppleChart,APPLE_CANONICAL_FEED_URL} from './marketResearch.ts';
import {buildBriefSynthesisPrompt,parseBriefSynthesisResponse} from '../src/utils/stageSynthesis.ts';
import {buildUvzSynthesisPrompt} from '../src/utils/strategySynthesis.ts';

// Synthetic parser/contract fixtures only, kept separate from actual Whop results.
const url='https://whop.com/synthetic-test/budget-workbook/';
function html(product:Record<string,unknown>={}) {
  return `<title>Synthetic test listing</title><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Product',name:'Synthetic budget workbook',url,brand:{name:'Fixture studio'},offers:{'@type':'Offer',price:19,priceCurrency:'EUR'},...product}]})}</script>`;
}
const capture=()=>parsePublicListing(html(),url,'Personal Finance','Workbook (user-classified)');
const reviewed=(obs=capture())=>applyManualReviewDecision(obs,{status:'manually_reviewed',outcome:'qualified',inspectedConfirmed:true,rationale:'Synthetic review of advertised product identity and offer facts only; purchases and demand remain unknown.'}).observation!;

test('all existing resources remain and Whop is available consistently in source options and migration',()=>{
  const expected=['res-apple-books-top-paid','res-amazon-kindle-bestsellers','res-nyt-bestsellers','res-keepa','res-google-trends','res-etsy-digital-downloads','res-etsy-seller-handbook','res-gumroad-discover','res-payhip-marketplace','res-whop-marketplace'];
  assert.deepEqual(INITIAL_GATE_A_RESOURCES.map(r=>r.id).sort(),expected.sort());
  assert.equal(new Set(MARKETPLACE_OPTIONS).size,MARKETPLACE_OPTIONS.length);
  assert.ok(MARKETPLACE_OPTIONS.includes('Whop'));
  const legacy=INITIAL_GATE_A_RESOURCES.filter(r=>r.publisher!=='Whop').map(r=>({...r,accessStatus:'blocked' as const,lastCheckNote:'Retained original check failure'}));
  const merged=mergeResourceDirectory(legacy);
  assert.equal(merged.length,10);assert.equal(merged.find(r=>r.publisher==='Amazon')?.lastCheckNote,'Retained original check failure');
});

test('specific public product capture preserves actual listing type, currency, original material and unverified status without a ranking',()=>{
  const obs=capture();assert.equal(obs.marketplace,'Whop');assert.equal(obs.currentPrice,19);assert.equal(obs.currency,'EUR');assert.equal(obs.priceKnown,true);assert.equal(obs.evidenceType,'listing_details');assert.equal(obs.acquisitionMethod,'public_page_capture');assert.equal(obs.reviewStatus,'unverified');assert.equal(obs.observedRank,undefined);assert.equal(obs.collector,undefined);assert.equal(isCurrentMarketEvidence(obs),false);assert.equal(isGateAQualifiedEvidence(obs),false);
  assert.match(obs.pricingTerms!,/Billing period.*unknown/);assert.equal(createHash('sha256').update(obs.evidenceCapture!.content).digest('hex'),obs.evidenceCapture!.sha256);
});

test('JSON-LD offer facts work across supported digital marketplaces, while arbitrary and discovery URLs are refused',()=>{
  const urls=['https://whop.com/test/workbook/','https://creator.gumroad.com/l/workbook','https://payhip.com/b/Test99','https://www.etsy.com/listing/123456789/test-workbook'];
  for(const productUrl of urls){assert.equal(isSpecificListingUrl(productUrl),true);assert.equal(parsePublicListing(html({url:productUrl}),productUrl,'Productivity Systems','User-classified toolkit').marketplace,listingMarketplace(productUrl));}
  for(const bad of ['http://whop.com/test/workbook/','https://whop.com:444/test/workbook/','https://whop.com.evil.example/test/workbook/','https://127.0.0.1/test/workbook/','https://whop.com/discover/','https://whop.com/discover/search?q=budget','https://whop.com/','https://payhip.com/marketplace','https://gumroad.com/discover','https://www.etsy.com/market/digital_downloads'])assert.equal(isSpecificListingUrl(bad),false,bad);
});

test('free, missing and multiple advertised offers remain distinct; ratings and seller revenue claims never become sales evidence',()=>{
  const free=parsePublicListing(html({offers:{'@type':'Offer',price:0,priceCurrency:'USD'}}),url,'Finance','Workbook');assert.equal(free.priceKnown,true);assert.equal(free.currentPrice,0);
  for(const offers of [undefined,[{'@type':'Offer',price:9,priceCurrency:'USD'},{'@type':'Offer',price:29,priceCurrency:'USD'}],{'@type':'Offer',price:-1,priceCurrency:'USD'}]){
    const obs=parsePublicListing(html({offers,aggregateRating:{ratingValue:5,reviewCount:500},description:'Seller claims a million sales.'}),url,'Finance','Workbook');assert.equal(obs.priceKnown,false);assert.equal(obs.metricValue,undefined);assert.equal(obs.reviewCount,undefined);assert.equal(obs.currency,'UNKNOWN');
  }
});

test('challenge pages, malformed metadata and unrelated product schemas produce visible parser failures',()=>{
  for(const bad of ['<title>Just a moment</title>','<title>Sign in</title>',html({url:'https://whop.com/unrelated/product/'}),'<script type="application/ld+json">not json</script>'])assert.throws(()=>parsePublicListing(bad,url,'Finance','Workbook'));
  assert.throws(()=>parsePublicListing(html(),'https://whop.com/discover/','Finance','Workbook'),/specific/);
});

test('Whop CSV/JSON imports remain unverified and reviewed listing hypotheses score no measured demand',()=>{
  const obs=capture();const imported=parseImportedObservations(JSON.stringify([{...obs,reviewStatus:'manually_reviewed'}]),'whop.json');assert.equal(imported.imported[0].marketplace,'Whop');assert.equal(imported.imported[0].evidenceType,'listing_details');assert.equal(imported.imported[0].reviewStatus,'unverified');
  const accepted=reviewed();const candidate=deriveSynchronizedCandidates([accepted])[0];assert.equal(candidate.evidenceLabel,'OPPORTUNITY_HYPOTHESIS');assert.equal(candidate.confidenceRating,'LOW');assert.equal(candidate.scoreBreakdown.demandSignal,0);assert.equal(candidate.factorAssessments?.find(f=>f.key==='demandSignal')?.status,'UNMEASURED');assert.equal(candidate.badge,undefined);assert.match(candidate.productSuitability!.nextValidationStep,/Interview/);
  const duplicate=reviewed({...capture(),id:'another-whop-listing'});assert.equal(compareCandidateEvidence([accepted,duplicate],'personal_finance').multiSourceStatus,'SINGLE_SOURCE');
});

test('adding reviewed offer context cannot increase the demand score of an existing official chart',()=>{
  const now=new Date().toISOString();
  const chart=parseAppleChart(JSON.stringify({feed:{updated:now,results:[{id:'123',name:'Synthetic budget workbook',url:'https://books.apple.com/us/book/id123',genres:[{name:'Personal Finance'}]}]}}),now,APPLE_CANONICAL_FEED_URL);
  const before=deriveSynchronizedCandidates(chart)[0];const after=deriveSynchronizedCandidates([...chart,reviewed()])[0];
  assert.equal(after.scoreBreakdown.demandSignal,before.scoreBreakdown.demandSignal);
  assert.equal(after.evidenceStrength?.independentChainCount,2);
});

test('downstream brief and positioning prompts retain Whop provenance and cannot invent creator credentials',()=>{
  const obs=reviewed();let project=structuredClone(BLANK_PROJECT);project.marketResearch.platformEvidence=[obs];project.marketResearch.topicCandidates=deriveSynchronizedCandidates([obs]);project=propagateTopicToDownstream(project,project.marketResearch.topicCandidates[0].id);
  const brief=buildBriefSynthesisPrompt(project);const uvz=buildUvzSynthesisPrompt(project);
  for(const prompt of [brief.userPrompt,uvz.userPrompt]){assert.match(prompt,/Whop/);assert.ok(prompt.includes(obs.sourceURL!));assert.ok(prompt.includes(obs.id));assert.match(prompt,/listing_details/);assert.match(prompt,/pricingTerms/);assert.match(prompt,/not demand|cannot prove|do not prove/);}
  const parsed=parseBriefSynthesisResponse(JSON.stringify({expertise:'Invented specialist credentials',relevantExperience:'Invented decade of experience'}),project.intake);assert.equal(parsed.expertise,'');assert.equal(parsed.relevantExperience,'');
});

test('listing reviews retain public-page origin, original evidence and pricing terms through editing, migration, backup and author-review ZIP',async()=>{
  const obs=reviewed();assert.equal(obs.acquisitionMethod,'public_page_capture');
  assert.equal(isObservationReviewStale({...obs,evidenceCapture:{...obs.evidenceCapture!,content:'Tampered original supporting material'}}),true);
  const edited=editManualObservationRecord(obs,{...obs,sourceURL:obs.sourceURL!,sourceClass:obs.sourceClass!,evidenceType:'listing_details',dataAsOfDate:obs.dataAsOfDate!,evidenceExcerpt:obs.evidenceExcerpt!,excerptLocator:obs.excerptLocator!,collectionMethodology:obs.collectionMethodology!,currentPrice:25}).observation!;
  assert.equal(edited.reviewStatus,'unverified');assert.equal(edited.acquisitionMethod,'public_page_capture');assert.deepEqual(edited.evidenceCapture,obs.evidenceCapture);assert.equal(edited.pricingTerms,obs.pricingTerms);assert.equal(isObservationReviewStale({...obs,currentPrice:25}),true);
  let project=structuredClone(BLANK_PROJECT);project.marketResearch.platformEvidence=[obs];project.marketResearch.topicCandidates=deriveSynchronizedCandidates([obs]);project=approveGate(propagateTopicToDownstream(project,project.marketResearch.topicCandidates[0].id),'gateA');assert.deepEqual(gateIssues(project,'gateA'),[]);
  const migrated=migrateProjectSchema(JSON.parse(JSON.stringify(project)));assert.equal(migrated.marketResearch.platformEvidence[0].marketplace,'Whop');assert.equal(migrated.marketResearch.platformEvidence[0].pricingTerms,obs.pricingTerms);
  const {zip}=await buildLearningBundle(migrated);assert.match(await zip.file('research/marketplace-evidence.json')!.async('string'),/Whop/);assert.equal(JSON.parse(await zip.file('manifest.json')!.async('string')).reviewed,false);
});

test('listing endpoint refuses unsupported/private URLs and incomplete scope without any authorized external request',async()=>{
  const app=express();app.use(express.json());const store=new LocalStore(':memory:');await store.init();app.use('/api',createApiRouter({store,config:loadConfig({NODE_ENV:'test'})}));
  const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  try{
    const invalid=await fetch(`${base}/api/market/listings/retrieve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://127.0.0.1/private',category:'Finance',productFormat:'Workbook'})});assert.equal(invalid.status,422);
    const missing=await fetch(`${base}/api/market/listings/retrieve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});assert.equal(missing.status,400);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await store.close();}
});
