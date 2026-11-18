/** Isolated API/domain acceptance exercise. No production auth bypass or cloud writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import express from 'express';
import JSZip from 'jszip';
import {BLANK_PROJECT} from '../src/data/demoProject.ts';
import type {DigitalProductProject, ReferenceCard, MarketplaceObservation} from '../src/types/project.ts';
import {deriveSynchronizedCandidates,observationCategory,compareCandidateEvidence,propagateTopicToDownstream,isCurrentMarketEvidence} from '../src/utils/marketDiscoveryEngine.ts';
import {createManualObservationRecord,parseImportedObservations,applyManualReviewDecision} from '../src/utils/manualEvidenceReview.ts';
import {approveGate,gateIssues} from '../src/utils/gatePolicy.ts';
import {sourceFingerprint,chapterResearchFingerprint} from '../src/utils/sourceEvidence.ts';
import {evidencePassages,makeSupportReview,resourceEvidenceDocument,auditChapter} from '../src/utils/citationEvidence.ts';
import {createApiRouter} from '../server/apiRouter.ts';
import {LocalStore} from '../server/db/localStore.ts';
import {loadConfig} from '../server/config.ts';
import {compactMarketResearch} from '../src/utils/marketPersistence.ts';
import {calculateProfitability} from '../src/utils/commercialMath.ts';

const out='audit/results';
const save=async(name:string,data:unknown)=>fs.writeFile(`${out}/${name}`,typeof data==='string'?data:JSON.stringify(data,null,2));
const log:Record<string,unknown>={checkedAt:new Date().toISOString(),scope:'Isolated local API/domain exercise with genuine captured material. UI, production Firebase authentication and Firestore were not exercised.',stages:[]};
const stage=(id:string,detail:unknown)=>(log.stages as unknown[]).push({id,detail});
const market=JSON.parse(await fs.readFile(`${out}/local-market.json`,'utf8')).response;
const observations:MarketplaceObservation[]=market.observations;
assert.ok(observations.length>0,'Actual source observations required; never substitute fixtures');
for(const obs of observations){
  assert.ok(obs.evidenceCapture,'Retain original collector fields');
  const capture=obs.evidenceCapture!;
  assert.equal(createHash('sha256').update(capture.content).digest('hex'),capture.sha256);
  const raw=JSON.parse(capture.content);
  if(obs.collector==='apple-chart-v1'){
    assert.equal(raw.item.name,obs.productTitle);assert.equal(raw.item.url,obs.productURL);assert.equal(raw.index+1,obs.observedRank);
    assert.equal(new Date(raw.updated).toISOString(),obs.dataAsOfDate);assert.ok(isCurrentMarketEvidence(obs));
  }else{assert.equal(raw.title,obs.productTitle);assert.equal(Number(raw.rankBadge.slice(1)),obs.observedRank);assert.equal(`https://www.amazon.com/dp/${raw.asin}`,obs.productURL);assert.ok(raw.href.includes(`/dp/${raw.asin}`));}
}
log.originalMaterialChecks={count:observations.length,method:'Every retained original JSON item / numbered Amazon badge + title + ASIN link checked against extracted fields; SHA-256 verified. Captured subsets are not full page archives.'};
const candidates=deriveSynchronizedCandidates(observations);
await save('actual-recommendations.json',candidates);
const capturedMarket={...BLANK_PROJECT.marketResearch,platformEvidence:observations,topicCandidates:candidates};
const fullBytes=Buffer.byteLength(JSON.stringify(capturedMarket));const compactBytes=Buffer.byteLength(JSON.stringify(compactMarketResearch(capturedMarket)));
assert.ok(compactBytes<950_000,'Actual collected market state must fit the existing Firestore payload guard');
log.marketPersistenceBytes={beforeCompaction:fullBytes,afterCompaction:compactBytes,allOriginalObservationsPreserved:true,cloudWriteNotTested:true};
for(const c of candidates){assert.ok(c.sourceObservationIds.every(id=>observations.some(o=>o.id===id)));assert.equal(c.productSuitability?.creatorFitStatus,'UNMEASURED');}
const preferred=deriveSynchronizedCandidates(observations,{prioritizedObservationId:observations.at(-1)!.id});
for(const c of candidates)assert.deepEqual(preferred.find(p=>p.id===c.id)?.scoreBreakdown,c.scoreBreakdown);
const actual=observations.find(o=>o.marketplace==='Amazon Kindle'&&observationCategory(o)==='personal_finance')!;
assert.ok(actual,'A real financial-category marketplace capture is required for this exercise');
const manual=createManualObservationRecord({id:'AUDIT-MANUAL-AMAZON',productTitle:actual.productTitle,publisher:'Amazon',sellerOrAuthor:actual.sellerOrAuthor,marketplace:actual.marketplace,country:actual.country,category:actual.category,productFormat:actual.productFormat,productURL:actual.productURL,sourceURL:actual.sourceURL!,sourceClass:'primary_marketplace',evidenceType:'official_ranking',observedRank:actual.observedRank,rankScope:actual.rankScope,dataAsOfDate:actual.dataAsOfDate!,retrievedAt:actual.retrievedAt,evidenceExcerpt:actual.evidenceExcerpt!,excerptLocator:actual.excerptLocator!,evidenceAttachmentRef:'audit/results/local-market.json',collectionMethodology:'Explicit inspection of original numbered Amazon badge, title, ASIN and link retained by the actual backend request.',dataLimitations:actual.dataLimitations,evidenceChainId:'audit-amazon-marketplace'}).observation!;
assert.equal(manual.reviewStatus,'unverified');
const referenceRequest=JSON.parse(await fs.readFile(`${out}/real-reference-request.json`,'utf8'));
assert.equal(referenceRequest.status,200);
const doc=referenceRequest.response;
const paragraph=doc.paragraphs.find((p:{text:string})=>p.text.includes('63 percent'));
assert.ok(paragraph);
const input={id:'AUDIT-FED-SHED',productTitle:doc.title,publisher:'Federal Reserve Board',marketplace:'Other Research Source',country:'US',category:'Household Personal Finance',productFormat:'Published household survey report',productURL:doc.canonicalUrl,sourceURL:doc.canonicalUrl,sourceClass:'supporting_context',evidenceType:'published_research',dataAsOfDate:'2025-10',publicationDate:'2026-05-13',retrievedAt:doc.retrievedAt,evidenceExcerpt:paragraph.text,excerptLocator:paragraph.locator,collectionMethodology:'Official report announcement; independent SHED survey fielded in October 2025, not a buyer-conversion study.',dataLimitations:'Historical US adult self-report survey, not marketplace purchases or willingness to pay for a budgeting worksheet. Fieldwork month only; exact respondent dates unknown.',evidenceChainId:'shed-2025'};
const file=JSON.stringify([input],null,2);await save('real-evidence-import.json',file);
const imported=parseImportedObservations(file,'real-evidence-import.json',createHash('sha256').update(file).digest('hex'));
assert.equal(imported.imported.length,1);assert.equal(imported.imported[0].reviewStatus,'unverified');assert.equal(imported.imported[0].evidenceType,'published_research');
assert.equal(compareCandidateEvidence([manual,imported.imported[0]],'personal_finance').multiSourceStatus,'NEEDS_EVIDENCE');
const reviewed=[manual,imported.imported[0]].map(obs=>{
  const result=applyManualReviewDecision(obs,{status:'manually_reviewed',outcome:'qualified',inspectedConfirmed:true,requireStructuredChecklist:true,rationale:obs.id===manual.id?'Compared the original numbered badge, title, ASIN and product URL. It shows current visibility for a book only, without worksheet sales evidence.':'Compared the exact retained Federal Reserve paragraph with the retrieved official report. It contextualizes household finance; it does not establish workbook demand.',assessment:{establishes:obs.id===manual.id?'Ordinal position within the stated Amazon Kindle chart.':'Historical US household survey context for emergency-expense planning.',dateScopeProductMatch:'partial_scope_match',metricNature:obs.id===manual.id?'observed':'reported',limitationsSummary:obs.dataLimitations,liveRetrievalUnavailableDisclosed:true,relationship:'complements',relationshipRationale:'Marketplace book visibility and an independently originated household survey offer different contextual signals; neither validates this proposed worksheet.'}});
  assert.ok(result.observation,result.error);assert.equal(result.observation!.collector,undefined);assert.equal(result.observation!.reviewStatus,'manually_reviewed');return result.observation!;
});
assert.equal(compareCandidateEvidence([reviewed[0]],'personal_finance').multiSourceStatus,'SINGLE_SOURCE');
assert.equal(compareCandidateEvidence(reviewed,'personal_finance').multiSourceStatus,'REVIEWED_MULTI_SOURCE');
const duplicate=applyManualReviewDecision({...imported.imported[0],id:'AUDIT-FED-DUPLICATE',evidenceChainId:'another-report-label'},{status:'manually_reviewed',inspectedConfirmed:true,rationale:'Same Federal Reserve SHED paragraph republished as another report; it remains one underlying survey dataset.'}).observation!;
assert.equal(compareCandidateEvidence([...reviewed,duplicate],'personal_finance').qualifiedChainIds.length,2);
stage('market_research',{liveObservationCount:observations.length,manualEntry:reviewed[0].id,fileImport:reviewed[1].id,unverifiedBeforeReview:true,originalEvidenceRetained:true,twoIndependentOrigins:true,duplicateReportCollapsed:true});
let project=structuredClone(BLANK_PROJECT);
project.projectId=`release_audit_${Date.now()}`;project.marketResearch.platformEvidence=reviewed;project.marketResearch.topicCandidates=deriveSynchronizedCandidates(reviewed);
project=propagateTopicToDownstream(project,project.marketResearch.topicCandidates[0].id);
assert.equal(project.intake.expertise,'');assert.equal(project.intake.creatorName,'');assert.equal(project.workflow.gates.gateA.isApproved,false);
project=approveGate(project,'gateA');assert.equal(project.workflow.gates.gateA.isApproved,true);
stage('topic_selection',{gateA:'Explicit domain-function approval in isolated test',candidate:project.marketResearch.selectedTopicId,qualifiedHypothesis:true,expertiseAndIdentityUnknown:true});
project.name='RELEASE AUDIT ONLY — Emergency Expense Planning';project.isBlankProject=false;
project.intake={...project.intake,projectName:project.name,targetAudience:'Unvalidated hypothesis: US adults who want a personal emergency-expense ledger.',problemsSolved:'Organize known expense dates and available funds without treating population statistics as individual advice.',desiredTransformation:'Complete a dated planning worksheet and record unresolved inputs.'};
stage('project_brief',{targetAudience:project.intake.targetAudience,creatorExpertise:project.intake.expertise||'unknown'});
project.uvz={...project.uvz,commercialFeasibility:'Unknown: interview five prospective readers and test comprehension and willingness to pay before building a commercial product.',creatorExpertiseFit:'Unknown; no credentials or customer outcomes were supplied.'};stage('uvz',project.uvz.commercialFeasibility);
project.transformationMap.beforeState.currentPains=['Expense dates scattered across documents'];project.transformationMap.bridgeProcess.keyMilestones=['Record baseline','List due dates','Document unknowns','Review outputs'];project.transformationMap.afterState.tangibleOutcomes=['A completed exercise, with no promised savings or income'];stage('transformation_map','Original conceptual workflow; not measured intervention results.');
const card:ReferenceCard={id:'REF-FED-SHED-2025',title:doc.title,sourceTitle:doc.title,description:'Official report announcement describing the 2025 SHED survey.',researchSummary:'Household financial circumstances provide context; no product sales or workbook efficacy were measured.',contentOutline:['Survey context','Emergency expense response'],practicalFramework:{name:'Original expense ledger exercise',editorialOrigin:'Original author exercise; not a tested method from SHED',actionSteps:['Record dates','Record amounts','List uncertainties']},author:doc.authors.join(', '),publisherOrOrg:doc.publisher,sourceURL:doc.canonicalUrl,publicationDate:doc.publicationDate,doi:doc.doi,retrievedAt:doc.retrievedAt,verificationQuote:paragraph.text,verificationLocator:paragraph.locator,qualityScore:0,pillars:['Household finance context'],supportedClaims:['63 percent would cover a hypothetical $400 emergency expense using cash or its equivalent.'],rightsNotes:'US Federal Reserve announcement; cite the original page. Source page text is not product efficacy evidence.',status:'VERIFIED_FULL_TEXT',verifiedAt:new Date().toISOString(),retrieval:{provider:doc.provider,documentId:doc.documentId,title:doc.title,canonicalUrl:doc.canonicalUrl,authors:doc.authors,publisher:doc.publisher,publicationDate:doc.publicationDate,doi:doc.doi,retrievedAt:doc.retrievedAt,contentHash:doc.contentHash,kind:doc.kind,excerpt:paragraph.text,locator:paragraph.locator},editorialNotes:{targetChapters:['audit_ch1'],exerciseSuggestions:['Complete an original planning ledger'],worksheetIntegration:'Keep the survey statistic separate from your individual budget.',verificationNotes:'Exact paragraph inspected; publication date not extracted by this parser remains unknown in card metadata.'},brandGuidelines:{toneApplication:'Measured and clear',visualDirection:'Conceptual process and source-backed table',audienceFraming:'Unvalidated audience hypothesis'},chapterRelevance:[]};
project.referenceLibrary.cards=[card];stage('reference_library',{sourceURL:card.sourceURL,sourceFingerprint:sourceFingerprint(card),retrievedParagraph:paragraph.locator,missingMetadata:['author not supplied','publication date not extracted']});
project.charter={...project.charter,productTitle:project.name,subtitle:'Isolated acceptance exercise; not offered for sale',targetAudience:project.intake.targetAudience,primaryProblemSolved:project.intake.problemsSolved,centralPromise:project.intake.desiredTransformation,learningObjectives:['Distinguish survey context from personal planning inputs','Create a dated ledger and mark unknowns'],explicitDisclaimers:['Educational planning exercise only. No individualized financial, legal or tax advice. No promised savings, earnings or profitability. Audience and willingness to pay remain unvalidated.']};
const content=`## Read the evidence within its scope

The Federal Reserve reported that 63 percent of US adults would cover a hypothetical $400 emergency expense using cash or its equivalent. This describes the survey response, rather than a claim about the reader or the effectiveness of this exercise [REF-FED-SHED-2025].

| Survey year | Adults reporting cash or equivalent | Source |
|---|---|---|
| 2024 | 63% | [REF-FED-SHED-2025] |
| 2025 | 63% | [REF-FED-SHED-2025] |

## Step 1: Define your planning boundary

Choose one household and one planning period, such as the next calendar month. Write the start and end dates at the top of your worksheet. Keep unknown amounts blank and label them unknown. Do not borrow a survey average to fill a missing personal number. The purpose of this original exercise is to organize your own information, not to compare yourself with a population statistic or promise a financial result.

## Step 2: Build a dated ledger

Collect your own bills and notes. For each expense you choose to include, write the amount, expected due date, whether the amount is confirmed, and the document you used. If you are uncomfortable storing a document, record a private local reference rather than copying account numbers into this project. Separate money available now from money you expect later. Treat expected income as uncertain until you decide how to record it for this exercise.

## Step 3: Work through an original example

Imagine a fictional household with an illustrative $120 repair due on the tenth and $50 already set aside for that specific item. Enter those two values in separate cells and calculate an illustrative gap of $70. This is invented arithmetic for practicing the worksheet, not a typical repair price, a suggested emergency-fund target, or an estimate of a buyer's circumstances. Try replacing the amounts with your own confirmed inputs and leave any unresolved figure visibly unresolved.

## Step 4: Review the output

Read each row aloud and identify the next information-gathering action. You might confirm a due date, check whether a planned payment is already included elsewhere, or ask a qualified professional a question outside your knowledge. Finish by writing one action you can personally verify and a date for checking it. Keep a copy of the worksheet before updating it so you can explain what changed. Do not interpret completion as proof that a product, strategy or spending decision will succeed.

## Completion check

The exercise is complete when every included row has a date, an amount or an explicit unknown, a source note, and a next review action. Explain in your own words why the SHED statistic cannot establish sales, conversion, willingness to pay, or the suitability of a workbook for a specific person. If that distinction remains unclear, revisit the source paragraph before sharing the exercise. The diagram accompanying these steps is a conceptual summary of the instructions, not measured data.`;
project.outline=[{id:'audit_ch1',order:1,title:'Build an emergency-expense planning ledger',objective:'Create and review a dated ledger while separating reported survey context from original instructions.',subtopics:['Evidence boundary','Dated ledger','Original worked example','Review'],targetWordCount:600,practicalDeliverable:'Completed expense ledger',mappedReferenceIds:[card.id],exampleScenarios:['Clearly fictional $120 repair with $50 set aside'],completionMilestone:'Every row contains confirmed inputs or explicit unknowns.',contentMarkdown:content,isCompleted:true,isLocked:false,citationReviews:[]}];
card.chapterRelevance=[{chapterId:'audit_ch1',chapterFingerprint:chapterResearchFingerprint(project.outline[0]),rationale:'The survey establishes contextual emergency-expense responses; it does not validate this original exercise or buyer demand.',reviewedAt:new Date().toISOString()}];
assert.deepEqual(gateIssues(project,'gateB'),[]);project=approveGate(project,'gateB');assert.equal(project.workflow.gates.gateB.isApproved,true);stage('product_charter',{gateB:'Explicit approval after exact real-source retrieval and chapter relevance review'});stage('outline_builder',{chapters:project.outline.length,targetWords:600});
project.outline[0].citationReviews=evidencePassages(project.outline[0]).map(p=>p.referenceIds.length?makeSupportReview(p,card,'qualifies','The exact report paragraph states 63 percent and unchanged from 2024. This supports population survey context only, not an individual outcome.'):{passageKey:p.key,relationship:'editorial',rationale:'Original planning instructions or clearly labeled fictional arithmetic, without an empirical efficacy or demand claim.',reviewedAt:new Date().toISOString()});
stage('content_studio',{audit:auditChapter(project.outline[0],[card]),substantiveOriginalManuscript:true});
const resource={id:'audit_resource',title:'Emergency-expense ledger',category:'WORKSHEET' as const,purpose:'Organize a single planning period with confirmed information and explicit unknowns.',instructions:'Write period dates, enter your own amounts, label uncertain inputs and record a next check. Do not include account credentials.',fieldsOrColumns:['Item','Due date','Amount','Confirmed or unknown','Source note','Next action'],sampleEntries:['FICTIONAL EXAMPLE: Repair | day 10 | $120 | invented for arithmetic practice | exercise | replace with own data'],completionCriteria:'All included rows contain a confirmed amount or an unknown plus a next review action.',contentMarkdown:'## Your ledger\n\n| Item | Due date | Amount | Status | Source note | Next action |\n|---|---|---|---|---|---|\n| Write your own item | Record a date | Confirm or leave unknown | Confirmed / unknown | Private reference | Verify next input |\n\nRecord one unresolved question below the table. Keep survey context separate from personal data. This original worksheet is a planning aid, not a validated intervention or individualized financial advice.',citationReviews:[] as any[]};
resource.citationReviews=evidencePassages(resourceEvidenceDocument(resource)).map(p=>({passageKey:p.key,relationship:'editorial',rationale:'Original blank worksheet instructions, with an explicitly fictional example and no empirical success claim.',reviewedAt:new Date().toISOString()}));project.resources=[resource];stage('workbook_studio',{resource:resource.id,audit:auditChapter(resourceEvidenceDocument(resource),[card])});
assert.deepEqual(gateIssues(project,'gateC'),[]);project=approveGate(project,'gateC');stage('quality_assurance',{gateC:'Explicit approval after reviewing every manuscript/table/resource passage'});
project.brand={...project.brand,profileName:'Digital Product Studio — Isolated Audit',primaryHex:'#146b5d'};project.pricingReport={introductoryPrice:9,regularPrice:15,bundlePrice:19,currency:'USD',rationale:'Unvalidated price assumptions for acceptance testing. No buyer interviews or price tests completed.',marketComparisonSummary:'No systematically verified competitor pricing dataset; unknown.'};
stage('brand_design','Original Digital Product Studio identity retained; export quality must be reapproved after this edit.');
stage('pricing_launch',{scenario:calculateProfitability({introductoryPrice:9,regularPrice:15,bundlePrice:19,monthlyVisitors:100,conversionRatePercent:1,introSharePercent:0,bundleSharePercent:0,platformFeePercent:10,fixedFeePerSale:.5,monthlyOverheadUsd:10,monthlyAcquisitionCostUsd:50}),assumptions:'100 visits, 1% conversion, $15 sale, 10% + $0.50 fee, $10 overhead, $50 acquisition; refunds, taxes, labor and actual demand unknown.'});
assert.ok(gateIssues(project,'gateC').length);project=approveGate(project,'gateC');assert.deepEqual(gateIssues(project,'gateC'),[]);
const storePath=path.resolve('.local-data',`${project.projectId}-store.json`);
let store=new LocalStore(storePath);await store.init();
const app=express();app.use(express.json({limit:'10mb'}));app.use('/api',createApiRouter({store,config:loadConfig({NODE_ENV:'test',DPC_DATA_DIR:path.dirname(storePath)}),verifyToken:async token=>{if(token!=='isolated-acceptance-only')throw new Error('Unauthorized');return {uid:'isolated-release-audit',email:'audit@example.invalid',emailVerified:true};}}));
const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
const base=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/api`;
const headers={'Content-Type':'application/json',Authorization:'Bearer isolated-acceptance-only'};
try{
 const created=await fetch(`${base}/projects`,{method:'POST',headers,body:JSON.stringify({project})});assert.equal(created.status,201);const createdBody=await created.json();
 const backup=await fetch(`${base}/projects/${createdBody.project.projectId}/export-backup`,{headers});assert.equal(backup.status,200);const backupBody=await backup.text();await save('real-project-backup.json',backupBody);
 const invalid=structuredClone(project);invalid.outline[0].contentMarkdown+='\n\nAn unsupported empirical claim.';
 const invalidResponse=await fetch(`${base}/projects/export-bundle`,{method:'POST',headers,body:JSON.stringify({project:invalid,mode:'buyer_bundle'})});assert.equal(invalidResponse.status,422);
 const draft=await fetch(`${base}/projects/export-bundle`,{method:'POST',headers,body:JSON.stringify({project:invalid,mode:'author_review'})});assert.equal(draft.status,200);await fs.writeFile(`${out}/real-author-review.zip`,Buffer.from(await draft.arrayBuffer()));
 const draftZip=await JSZip.loadAsync(await fs.readFile(`${out}/real-author-review.zip`));assert.equal(JSON.parse(await draftZip.file('manifest.json')!.async('string')).reviewed,false);
 const buyer=await fetch(`${base}/projects/export-bundle`,{method:'POST',headers,body:JSON.stringify({project,mode:'buyer_bundle'})});
 if(buyer.status!==200){log.buyerExport={status:buyer.status,response:await buyer.json()};}else{
  await fs.writeFile(`${out}/real-reviewed-test-bundle.zip`,Buffer.from(await buyer.arrayBuffer()));const zip=await JSZip.loadAsync(await fs.readFile(`${out}/real-reviewed-test-bundle.zip`));const manifest=JSON.parse(await zip.file('manifest.json')!.async('string'));assert.equal(manifest.reviewed,true);
  for(const entry of manifest.files){const data=await zip.file(entry.path)!.async('uint8array');assert.equal(data.length,entry.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);}
  const html=await zip.file('book/executive-ebook.html')!.async('string');assert.match(html,/class="data-figure"/);assert.match(html,/conceptual summary/);
  await save('real-bundle-manifest.json',manifest);log.buyerExport={status:200,reviewed:manifest.reviewed,files:manifest.files.length,allFileHashesVerified:true,warning:'An isolated acceptance exercise, not an approved commercial launch.'};
 }
 // Also exercise the server's collector reconciliation, separate from the
 // manual fallback route. A client label alone cannot make fabricated material live.
 let liveProject=structuredClone(project);liveProject.marketResearch.platformEvidence=[actual,reviewed[1]];liveProject.marketResearch.topicCandidates=deriveSynchronizedCandidates(liveProject.marketResearch.platformEvidence);
 for(const gate of ['gateA','gateB','gateC'] as const)liveProject=approveGate(liveProject,gate);
 assert.deepEqual(gateIssues(liveProject,'gateC'),[]);
 const liveResponse=await fetch(`${base}/projects/export-bundle`,{method:'POST',headers,body:JSON.stringify({project:liveProject,mode:'buyer_bundle'})});
 if(liveResponse.status===200){await fs.writeFile(`${out}/live-reconciled-test-bundle.zip`,Buffer.from(await liveResponse.arrayBuffer()));log.liveCollectorExport={status:200,actualBackendReconciliation:true};}
 else log.liveCollectorExport={status:liveResponse.status,response:await liveResponse.json()};
 const forged=structuredClone(liveProject);forged.marketResearch.platformEvidence[0].productTitle='FORGED RELEASE AUDIT TITLE — not present in original evidence';
 for(const gate of ['gateA','gateB','gateC'] as const){forged.workflow.gates[gate].isApproved=false;forged.workflow.gates[gate].approvedFingerprint=undefined;}
 for(const gate of ['gateA','gateB','gateC'] as const){const next=approveGate(forged,gate);Object.assign(forged,next);}
 const forgedResponse=await fetch(`${base}/projects/export-bundle`,{method:'POST',headers,body:JSON.stringify({project:forged,mode:'buyer_bundle'})});const forgedBody=await forgedResponse.json();assert.equal(forgedResponse.status,422);assert.equal(forgedBody.code,'MARKET_SOURCE_CHECK_FAILED');log.forgedCollectorExport={status:forgedResponse.status,code:forgedBody.code};
 const importedBackup=await fetch(`${base}/projects/import`,{method:'POST',headers,body:JSON.stringify({project:JSON.parse(backupBody)})});assert.equal(importedBackup.status,200);const restored=await importedBackup.json();assert.equal(restored.importedCount,1);assert.equal(restored.imported[0].data.workflow.gates.gateA.isApproved,false);
 const refreshed=await fetch(`${base}/projects/${createdBody.project.projectId}`,{headers});assert.equal(refreshed.status,200);assert.equal((await refreshed.json()).project.outline[0].contentMarkdown,content);
 await store.close();store=new LocalStore(storePath);await store.init();assert.equal((await store.getProject('isolated-release-audit',project.projectId))?.data.outline[0].contentMarkdown,content);
 stage('export_center',{incompleteBuyerRejected:invalidResponse.status,authorReviewDownloaded:draft.status,backupDownloaded:backup.status,backupImported:restored.importedCount,restoredApprovalsRevoked:true,apiRefreshAndStoreRestartPersisted:true});
 log.result='Completed local API/domain exercise. Deployment, browser interactions and cloud persistence remain untested.';
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await store.close();await save('real-workflow-exercise.json',log);}
console.log(JSON.stringify(log,null,2));
