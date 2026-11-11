import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCrossref, parseEuropePmc, parsePmcFullText, parseTrustedPage, retrieveReference } from './referenceResearch.ts';
import { isAllowedResearchUrl } from '../src/utils/sourceEvidence.ts';
const xml=`<article article-type="research-article"><front><journal-meta><journal-title>Fixture Journal</journal-title></journal-meta><article-meta><article-id pub-id-type="pmc">123</article-id><article-id pub-id-type="doi">10.9999/fixture</article-id><title-group><article-title>Synthetic fixture paper</article-title></title-group><contrib-group><contrib contrib-type="author"><name><surname>Author</surname><given-names>Test</given-names></name></contrib></contrib-group><pub-date><year>2026</year></pub-date></article-meta></front><body><sec><title>Results</title><p id="p1">This synthetic retrieved paragraph is long enough to exercise exact source text extraction. It is not real scientific evidence.</p></sec></body></article>`;
test('Crossref search preserves supplied bibliography and distinguishes abstract metadata from full text',()=>{
 const records=parseCrossref(JSON.stringify({message:{items:[{DOI:'10.9999/fixture',title:['A <i>realistic</i> fixture title'],author:[{given:'Test',family:'Author'}],publisher:'Fixture Journal',published:{'date-parts':[[2026,2,3]]},abstract:'<jats:p>Fixture abstract only.</jats:p>',link:[{URL:'http://127.0.0.1/private'}]}]}}),'fixture');
 assert.equal(records.length,1);assert.equal(records[0].publicationDate,'2026-2-3');assert.deepEqual(records[0].authors,['Test Author']);assert.equal(records[0].fullTextURL,undefined);assert.equal(records[0].abstract,'Fixture abstract only.');assert.equal(records[0].provider,'Crossref');
 assert.throws(()=>parseCrossref('{}','fixture'));
});
test('Europe PMC search retains the actual PMCID and marks retraction-related records',()=>{
 const records=parseEuropePmc(JSON.stringify({resultList:{result:[{id:'1',source:'MED',pmcid:'PMC123',title:'Fixture source',authorList:{author:[{fullName:'Test Author'}]},journalTitle:'Fixture Journal',firstPublicationDate:'2026-02-03',isRetracted:'Y'}]}}),'fixture');
 assert.equal(records[0].pmcid,'PMC123');assert.equal(records[0].isRetracted,true);assert.equal(records[0].sourceURL,'https://europepmc.org/articles/PMC123');
});
test('full text extraction verifies document identity and preserves original excerpts and locators',()=>{
 const document=parsePmcFullText(xml,'PMC123');
 assert.equal(document.title,'Synthetic fixture paper');assert.deepEqual(document.authors,['Test Author']);assert.equal(document.publicationDate,'2026');assert.equal(document.paragraphs[0].locator,'Results · p1');assert.match(document.contentHash,/^[a-f0-9]{64}$/);assert.ok(document.paragraphs[0].text.includes('synthetic retrieved paragraph'));
 assert.throws(()=>parsePmcFullText(xml,'PMC456'),/identifier/);
 assert.throws(()=>parsePmcFullText(xml.replace(/<body>[\s\S]*<\/body>/,'<abstract><p>Only an abstract.</p></abstract>'),'PMC123'),/body/);
 assert.throws(()=>parsePmcFullText(xml.replace('research-article','retraction'),'PMC123'),/Retraction/);
});
test('trusted page retrieval excludes navigation and refuses arbitrary URLs and access pages',async()=>{
 const document=parseTrustedPage('<title>Fixture government page</title><main><h1>Fixture guidance</h1><nav><p>Navigation that must not be retained as source text.</p></nav><p>A substantive source paragraph retained verbatim for this test fixture only.</p></main>','https://www.example.gov/guide');
 assert.equal(document.paragraphs.length,1);assert.equal(document.kind,'page_text');assert.equal(document.title,'Fixture guidance');
 for(const url of ['http://www.example.gov/a','https://127.0.0.1/a','https://metadata.google.internal/a','https://www.example.gov:123/a','https://user:pass@www.example.gov/a','https://example.gov.evil.test/','file:///etc/passwd']){assert.equal(isAllowedResearchUrl(url),false);await assert.rejects(retrieveReference({url}));}
 assert.throws(()=>parseTrustedPage('<title>Access denied</title>','https://www.example.gov/a'),/access/);
});

test('direct local research refuses private and link-local network destinations',async()=>{
 const {isPrivateResearchAddress}=await import('./referenceResearch.ts');
 for(const address of ['127.0.0.1','10.1.2.3','169.254.169.254','172.16.0.1','192.168.1.1','100.64.1.1','::1','::','fe80::1','fd00::1','::ffff:127.0.0.1'])assert.equal(isPrivateResearchAddress(address),true,address);
 assert.equal(isPrivateResearchAddress('8.8.8.8'),false);assert.equal(isPrivateResearchAddress('2606:4700:4700::1111'),false);
});

test('server preflight checks actual source text rather than trusting client verification flags',async()=>{
 const {retrievedCardFixture}=await import('../tests/evidenceFixtures.ts');const {verifyReferenceRecords}=await import('./referenceResearch.ts');
 const card=retrievedCardFixture();const evidence=card.retrieval!;
 const document={...evidence,paragraphs:[{locator:evidence.locator,text:evidence.excerpt}]};
 const loader=async()=>document;
 assert.equal((await verifyReferenceRecords([card],loader)).valid,true);
 const forged={...card,verificationQuote:'Fabricated but self-consistent source text that never appeared in this retrieved document.',retrieval:{...evidence,excerpt:'Fabricated but self-consistent source text that never appeared in this retrieved document.'}};
 assert.equal((await verifyReferenceRecords([forged],loader)).valid,false);
 assert.equal((await verifyReferenceRecords([{...card,retrieval:{...evidence,contentHash:'b'.repeat(64)}}],loader)).valid,false);
 assert.equal((await verifyReferenceRecords([card],async()=>{throw new Error('Source unavailable');})).valid,false);
});

test('research snapshot hashes ignore transport scripts but detect changed source paragraphs',()=>{
 const body='<title>Fixture page</title><main><p>A stable substantive paragraph used as synthetic source text in this test.</p></main>';
 const first=parseTrustedPage(body+'<script nonce="first">tracking()</script>','https://www.example.gov/guide');
 const same=parseTrustedPage(body+'<script nonce="second">differentTracking()</script>','https://www.example.gov/guide');
 const changed=parseTrustedPage(body.replace('stable substantive','changed substantive'),'https://www.example.gov/guide');
 assert.equal(first.contentHash,same.contentHash);assert.notEqual(first.contentHash,changed.contentHash);
});
