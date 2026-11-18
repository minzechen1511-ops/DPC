import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createManualObservationRecord, applyManualReviewDecision, parseImportedObservations, isObservationReviewStale, SAMPLE_IMPORT_CSV_TEMPLATE } from './manualEvidenceReview.ts';
import { compareCandidateEvidence, deriveSynchronizedCandidates, isGateAQualifiedEvidence, propagateTopicToDownstream } from './marketDiscoveryEngine.ts';
import { approveGate, gateIssues } from './gatePolicy.ts';
import { migrateObservationRecord } from './projectMigration.ts';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import { LocalStore } from '../../server/db/localStore.ts';
import { parseAmazonChart, parseAppleChart, matchesCollectedObservation } from '../../server/marketResearch.ts';
import { calculateProfitability } from './commercialMath.ts';
import { compactMarketResearch, hydrateMarketResearch } from './marketPersistence.ts';

// These invented inputs are regression fixtures, never actual research.
function manual(id:string, marketplace:'Apple Books'|'Amazon Kindle'|'Google Trends'|'Keepa'='Apple Books') {
  const domains={'Apple Books':'books.apple.com','Amazon Kindle':'www.amazon.com','Google Trends':'trends.google.com','Keepa':'keepa.com'};
  const made=createManualObservationRecord({id,marketplace,productTitle:'Synthetic budget workflow fixture',category:'Personal Finance',productFormat:'Synthetic report',sourceURL:`https://${domains[marketplace]}/reports/${id}`,sourceClass:'supporting_context',evidenceType:marketplace==='Google Trends'?'interest_signal':marketplace==='Keepa'?'estimate':'official_ranking',rankScope:'Synthetic US chart scope',dataAsOfDate:new Date().toISOString().slice(0,10),evidenceExcerpt:'Synthetic original evidence text for budget workflow regression checks.',excerptLocator:'Synthetic test paragraph',collectionMethodology:'Synthetic regression input',dataLimitations:'Not real research. Does not establish product demand.',keepaProvenance:marketplace==='Keepa'?'historical':'not_applicable',evidenceChainId:id});
  assert.deepEqual(made.errors,[]);
  return applyManualReviewDecision(made.observation!,{status:'manually_reviewed',inspectedConfirmed:true,rationale:'Synthetic reviewer decision for contract testing only, not live research.'}).observation!;
}

test('different chain labels, chart categories, and Amazon/Keepa reports cannot inflate independent origin count',()=>{
  const apple=[manual('a'),manual('b')];
  assert.equal(compareCandidateEvidence(apple,'personal_finance').multiSourceStatus,'SINGLE_SOURCE');
  assert.equal(deriveSynchronizedCandidates(apple)[0].evidenceStrength?.independentChainCount,1);
  const amazon=[manual('c','Amazon Kindle'),manual('d','Keepa')];
  assert.equal(compareCandidateEvidence(amazon,'personal_finance').qualifiedChainIds.length,1);
  assert.equal(compareCandidateEvidence([...apple,manual('e','Google Trends')],'personal_finance').multiSourceStatus,'REVIEWED_MULTI_SOURCE');
  const declaredShared=[...apple,{...manual('f','Google Trends'),evidenceChainId:'a'}];
  // Editing a dataset label also stales its previous review.
  assert.equal(isGateAQualifiedEvidence(declaredShared[2]),false);
});

test('import preserves actual research type and retrieval date, rejects unknown types, and contains no fabricated template row',()=>{
  const obs=manual('import');
  const raw={...obs,evidenceType:'published_research',retrievedAt:new Date(Date.now()-3600_000).toISOString(),dataAsOfDate:'2025-10'};
  const result=parseImportedObservations(JSON.stringify([raw]),'report.json');
  assert.equal(result.imported.length,1);
  assert.equal(result.imported[0].evidenceType,'published_research');
  assert.equal(result.imported[0].retrievedAt,raw.retrievedAt);
  assert.equal(result.imported[0].reviewStatus,'unverified');
  assert.equal(result.imported[0].acquisitionMethod,'file_import');
  assert.equal(parseImportedObservations(JSON.stringify([{...raw,evidenceType:'invented_type'}]),'bad.json').rejected.length,1);
  assert.equal(SAMPLE_IMPORT_CSV_TEMPLATE.split('\n').length,1);
});

test('missing review fingerprint, changed retrieval date and explicit scope mismatch cannot qualify',()=>{
  const obs=manual('review');
  assert.equal(isGateAQualifiedEvidence({...obs,reviewedEvidenceHash:undefined}),false);
  const migrated=migrateObservationRecord({...obs,reviewedEvidenceHash:undefined});
  assert.equal(migrated.reviewStatus,'unverified');
  assert.equal(migrated.reviewedAt,obs.reviewedAt);
  assert.equal(isObservationReviewStale({...obs,retrievedAt:'2000-01-01'}),true);
  assert.equal(isGateAQualifiedEvidence({...obs,reviewAssessment:{...obs.reviewAssessment!,dateScopeProductMatch:'mismatch'}}),false);
});

test('explicit contradiction requires rationale and rejection alone is not contrary demand evidence',()=>{
  const obs=manual('relation','Google Trends');
  assert.ok(applyManualReviewDecision(obs,{status:'manually_reviewed',inspectedConfirmed:true,rationale:'Synthetic rationale with adequate detail.',assessment:{relationship:'contradicts'}}).error);
  const contrary=applyManualReviewDecision(obs,{status:'manually_reviewed',inspectedConfirmed:true,rationale:'Synthetic rationale with adequate detail.',assessment:{relationship:'contradicts',relationshipRationale:'A synthetic decline contradicts the proposed growth assumption.'}}).observation!;
  assert.equal(compareCandidateEvidence([manual('primary'),contrary],'personal_finance').evidenceComparison.find(r=>r.observationId===contrary.id)?.relationship,'contradicts');
  const rejected={...contrary,reviewStatus:'rejected' as const};
  assert.equal(compareCandidateEvidence([rejected],'personal_finance').evidenceComparison[0].relationship,'excluded');
});

test('direct persisted evidence edits revoke approvals and restart retains the new evidence; corrupt stores never reset silently',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dpc-release-regression-'));
  const file=path.join(dir,'store.json');
  try {
    let project=structuredClone(BLANK_PROJECT);
    project.marketResearch.platformEvidence=[manual('persist')];
    project.marketResearch.topicCandidates=deriveSynchronizedCandidates(project.marketResearch.platformEvidence);
    project=approveGate(propagateTopicToDownstream(project,project.marketResearch.topicCandidates[0].id),'gateA');
    assert.equal(project.workflow.gates.gateA.isApproved,true);
    const store=new LocalStore(file);await store.init();
    const row=await store.createProject({ownerUserId:'audit-only',project});
    const changed=structuredClone(row.data);
    changed.marketResearch.platformEvidence[0].evidenceExcerpt+=' Changed after approval.';
    assert.ok(gateIssues(changed,'gateA').length);
    const saved=await store.updateProject({ownerUserId:'audit-only',projectId:row.id,expectedRevision:1,project:changed});
    assert.equal(saved.data.workflow.gates.gateA.isApproved,false);
    await store.close();
    const restarted=new LocalStore(file);await restarted.init();
    assert.equal((await restarted.getProject('audit-only',row.id))?.data.marketResearch.platformEvidence[0].evidenceExcerpt,changed.marketResearch.platformEvidence[0].evidenceExcerpt);
    await restarted.close();
    await fs.writeFile(file,'{corrupted');
    await assert.rejects(new LocalStore(file).init(),/Original data was preserved/);
    assert.equal(await fs.readFile(file,'utf8'),'{corrupted');
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('collector material retains original fields and hashes; mismatched ASIN links and invalid retrieval clocks are rejected',()=>{
  const now=new Date().toISOString();
  const raw='<title>Amazon</title><div data-asin="B000000001"><span class="zg-bdg-text">#2</span><a href="/dp/B000000001"><img alt="Synthetic finance book"></a></div>';
  const obs=parseAmazonChart(raw,now)[0];
  assert.equal(JSON.parse(obs.evidenceCapture!.content).rankBadge,'#2');
  assert.equal(createHash('sha256').update(obs.evidenceCapture!.content).digest('hex'),obs.evidenceCapture!.sha256);
  assert.equal(matchesCollectedObservation(obs,obs),true);
  assert.equal(matchesCollectedObservation({...obs,evidenceExcerpt:'Forged claim that chart rank proves workbook sales.'},obs),false);
  assert.equal(matchesCollectedObservation({...obs,evidenceCapture:undefined},obs),false);
  const tracked=JSON.stringify({...JSON.parse(obs.evidenceCapture!.content),href:'/title/dp/B000000001/ref=another-session?psc=1'});
  assert.equal(matchesCollectedObservation({...obs,evidenceCapture:{...obs.evidenceCapture!,content:tracked,sha256:createHash('sha256').update(tracked).digest('hex')}},obs),true);
  assert.throws(()=>parseAmazonChart(raw.replace('/dp/B000000001','/dp/B000000002'),now),/valid ASIN/);
  assert.throws(()=>parseAppleChart(JSON.stringify({feed:{updated:now,results:[]}}),'invalid'),/update time/);
});

test('unprofitable unit costs retain losses and cannot report zero-unit break-even',()=>{
  const result=calculateProfitability({introductoryPrice:1,regularPrice:1,bundlePrice:1,monthlyVisitors:100,conversionRatePercent:10,bundleSharePercent:0,introSharePercent:0,platformFeePercent:10,fixedFeePerSale:2,monthlyOverheadUsd:5});
  assert.equal(result.netPerSale,-1.1);assert.equal(result.breakEvenUnits,null);assert.equal(result.netMonthlyProfit,-16);
});

test('cloud compaction preserves original evidence, reviews, source IDs and audience selection while reconstructing comparison rows',()=>{
  const evidence=[manual('compact-a'),manual('compact-b','Google Trends')];
  const project=structuredClone(BLANK_PROJECT);
  project.marketResearch.platformEvidence=evidence;
  project.marketResearch.topicCandidates=deriveSynchronizedCandidates(evidence);
  project.marketResearch.topicCandidates[0].selectedAudienceHypothesisId='explicit-test-selection';
  const compact=compactMarketResearch(project.marketResearch);
  assert.deepEqual(compact.platformEvidence,evidence);
  assert.equal(compact.topicCandidates[0].evidenceComparison,undefined);
  const hydrated=hydrateMarketResearch(compact);
  assert.deepEqual(hydrated.topicCandidates[0].evidenceComparison,project.marketResearch.topicCandidates[0].evidenceComparison);
  assert.deepEqual(hydrated.topicCandidates[0].sourceObservationIds,project.marketResearch.topicCandidates[0].sourceObservationIds);
  assert.equal(hydrated.topicCandidates[0].selectedAudienceHypothesisId,'explicit-test-selection');
});
