import type { ReferenceVerificationReport } from '../types/research.ts';
import { isRetrievedSource, sourceFingerprint } from './sourceEvidence.ts';
import { evidencePassages, assessPassage, resourceEvidenceDocument } from './citationEvidence.ts';
import JSZip from 'jszip';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { DigitalProductProject } from '../types/project.ts';
import { compileStyledHtml, compileManuscriptMarkdown, compileReferenceLibraryMarkdown, compileCompanionResourcesMarkdown, compileLaunchAssetsMarkdown } from './markdownCompiler.ts';
import { escapeHtml, auditChapter } from './styledBook.ts';
import { gateIssues } from './gatePolicy.ts';

const parser = new Marked({ gfm: true, renderer: { html: ({text}) => escapeHtml(text) } });
const render = (md: string) => sanitizeHtml(parser.parse(md, {async:false}));
const csv = (rows: string[][]) => rows.map(row => row.map(cell => `"${(/^[=+\-@\t\r]/.test(cell) ? "'" + cell : cell).replaceAll('"','""')}"`).join(',')).join('\r\n');
export function learningDocument(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;background:#edf2f0;color:#173039;font:17px/1.75 system-ui,sans-serif}main{max-width:980px;background:white;margin:32px auto;padding:clamp(20px,5vw,56px)}h1,h2{line-height:1.25;text-wrap:balance}h1{font:700 clamp(28px,4vw,44px)/1.2 Georgia,serif}h2{margin-top:40px}a{color:#146b5d;text-underline-offset:3px}a:focus-visible{outline:3px solid #b45a20}p{max-width:72ch}li{margin-bottom:12px}table{border-collapse:collapse;display:block;overflow:auto}td,th{padding:12px;border:1px solid #bdcdca;text-align:left}blockquote{background:#edf5f1;margin:20px 0;padding:20px}code,pre{white-space:pre-wrap;overflow-wrap:anywhere}.notice{padding:16px;background:#fff3db;color:#754314}.path{padding:0;list-style:none}.path li{border-bottom:1px solid #ccd8d3;padding:16px 0}small{color:#50636c}@media print{body{background:#fff}main{margin:0;padding:0}a{color:inherit}}</style></head><body><main>${body}<footer><hr><small>Digital Product Studio · Author-created learning materials. Follow source attribution and image rights.</small></footer></main></body></html>`;
}
export async function buildLearningBundle(project: DigitalProductProject, sourceCheck?: ReferenceVerificationReport): Promise<{ zip: JSZip; manifest: { path: string; bytes: number; sha256: string }[] }> {
  const zip = new JSZip();
  const encoder = new TextEncoder();
  const files = new Map<string, Uint8Array>();
  const add = (path: string, data: string | Uint8Array) => files.set(path, typeof data === 'string' ? encoder.encode(data) : data);
  const title = project.charter.productTitle || project.intake.projectName || 'Learning package';
  const issues = gateIssues(project,'gateC');
  const requiredIds = new Set([...project.outline.flatMap(ch=>[...ch.mappedReferenceIds,...evidencePassages(ch).flatMap(p=>p.referenceIds)]),...project.resources.flatMap(resource=>evidencePassages(resourceEvidenceDocument(resource)).flatMap(p=>p.referenceIds))]);
  const requiredSources = project.referenceLibrary.cards.filter(card=>requiredIds.has(card.id)&&isRetrievedSource(card));
  const currentSourceCheck = Boolean(sourceCheck?.valid && Date.now()-Date.parse(sourceCheck.checkedAt)>=0 && Date.now()-Date.parse(sourceCheck.checkedAt)<5*60_000 && requiredSources.length && requiredSources.every(card=>sourceCheck.checks.some(check=>check.id===card.id&&check.valid&&check.sourceFingerprint===sourceFingerprint(card))));
  if(!currentSourceCheck)issues.push('A current original-source verification report matching the required records is missing or failed.');
  if(!project.workflow.gates.gateC.isApproved)issues.push('Explicit Gate C approval is required.');
  const reviewed = !issues.length;
  add('book/executive-ebook.html',compileStyledHtml(project));
  add('book/manuscript.md',compileManuscriptMarkdown(project));
  add('research/reference-library.md',compileReferenceLibraryMarkdown(project));
  add('research/source-records.json',JSON.stringify(project.referenceLibrary.cards,null,2));
  add('research/marketplace-evidence.json',JSON.stringify(project.marketResearch,null,2));
  add('resources/companion-toolkits.md',compileCompanionResourcesMarkdown(project));
  add('publisher/sales-assets.md',compileLaunchAssetsMarkdown(project));
  add('publisher/project-backup.json',JSON.stringify(project,null,2));
  add('review/publication-review.json',JSON.stringify({ reviewed, issues, sourceCheck:sourceCheck || null, gates:project.workflow.gates, chapters:project.outline.map(ch=>({id:ch.id,title:ch.title,...auditChapter(ch,project.referenceLibrary.cards)})), resources:project.resources.map(resource=>({id:resource.id,title:resource.title,...auditChapter(resourceEvidenceDocument(resource),project.referenceLibrary.cards)})) },null,2));
  const evidenceDocuments = [...project.outline.map(ch => ({ title: ch.title, document: ch })), ...project.resources.map(resource => ({ title: resource.title, document: resourceEvidenceDocument(resource) }))];
  const claimMatrix = evidenceDocuments.flatMap(item => evidencePassages(item.document).map(passage => ({ document: item.title, passage: passage.text, heading: passage.heading, referenceIds: passage.referenceIds, ...assessPassage(passage,item.document,project.referenceLibrary.cards), reviews: (item.document.citationReviews || []).filter(review => review.passageKey === passage.key), sources: passage.referenceIds.map(id => { const card=project.referenceLibrary.cards.find(card=>card.id===id); return { id, title:card?.sourceTitle, author:card?.author, date:card?.publicationDate, doi:card?.doi, url:card?.sourceURL, excerpt:card?.verificationQuote, locator:card?.verificationLocator, retrieval:card?.retrieval }; }) })));
  add('research/claim-evidence-matrix.json',JSON.stringify(claimMatrix,null,2));
  add('research/claim-evidence-matrix.html',learningDocument('Claim-to-source evidence matrix',`<h1>Claim-to-source evidence matrix</h1><p>Inspect the precise relationship between each passage, source excerpt and author review. Retrieval proves text availability, not scientific validity. Unsupported and stale reviews remain visible.</p>${claimMatrix.map(item=>`<section><h2>${escapeHtml(item.document)} — ${escapeHtml(item.heading || 'Introduction')}</h2><p>${escapeHtml(item.passage)}</p><p class="notice">${item.valid?(item.editorial?'Original editorial instruction / example reviewed':'Citation support reviewed by the author'):'Evidence review unresolved'}</p>${item.sources.map(source=>`<h3>[${escapeHtml(source.id)}] ${escapeHtml(source.title || 'Unknown source')}</h3><p>${escapeHtml(source.author || '')} · ${escapeHtml(source.date || 'Date not supplied')} · ${escapeHtml(source.doi || '')}</p><blockquote>${escapeHtml(source.excerpt || 'No retrieved excerpt')}</blockquote><p>Locator: ${escapeHtml(source.locator || 'not supplied')}</p><p>${escapeHtml(source.url)}</p>`).join('')}${item.reviews.map(review=>`<p>Retained author decision (current validity is shown above): ${escapeHtml(review.relationship)}. ${escapeHtml(review.rationale)}</p>`).join('')}</section>`).join('')}`));
  let roadmap = '';
  project.outline.forEach((chapter,index) => {
    const chapterPath=`chapters/chapter-${index+1}.html`;
    add(chapterPath,compileStyledHtml({...project,outline:[chapter]}));
    roadmap += `<li><a href="${chapterPath}">${escapeHtml(chapter.title)}</a><p>${escapeHtml(chapter.objective)}</p><small>Practice: ${escapeHtml(chapter.practicalDeliverable)} · <a href="resources/worksheet-${index+1}.html">Open worksheet</a></small></li>`;
    const worksheet=`# ${chapter.title} — Practice Worksheet\n\n## Learning objective\n${chapter.objective}\n\n## Before reading\n- What do I already know about this topic?\n- What specific question do I need this chapter to answer?\n\n## Evidence notebook\n| Claim from the chapter | Reference ID and page/section | Why it applies to my situation | Remaining uncertainty |\n|---|---|---|---|\n| | | | |\n| | | | |\n\n## Apply the method\n${chapter.practicalDeliverable}\n\n1. Describe a real situation where you will apply this chapter.\n2. Record the inputs and constraints before you begin.\n3. Follow the chapter steps and record what you changed.\n4. Compare your result with the chapter objective and supporting sources.\n\n## Completion check\n${chapter.completionMilestone}\n\n## Reflection\n- What worked, and what evidence supports that conclusion?\n- What would I do differently next time?\n- Which question needs further research?\n`;
    add(`resources/worksheet-${index+1}.md`,worksheet);
    add(`resources/worksheet-${index+1}.html`,learningDocument(`${chapter.title} — Practice`,render(worksheet)));
    for (const [i,image] of (chapter.illustrations || []).entries()) {
      const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image.dataUri);
      if (match && image.license && image.credit) add(`figures/chapter-${index+1}-image-${i+1}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`,Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0)));
    }
  });
  project.resources.forEach((resource,index)=>{
    const document=resourceEvidenceDocument(resource);
    const content=compileStyledHtml({...project,charter:{...project.charter,productTitle:resource.title,subtitle:project.charter.productTitle},outline:[{id:resource.id,order:1,title:resource.title,objective:'',subtopics:[],targetWordCount:0,practicalDeliverable:'',mappedReferenceIds:[...new Set(evidencePassages(document).flatMap(p=>p.referenceIds))],exampleScenarios:[],completionMilestone:'',contentMarkdown:document.contentMarkdown,citationReviews:resource.citationReviews,isCompleted:true,isLocked:false}]});
    add(`resources/companion-${index+1}.html`,content);
  });
  add('resources/learning-progress.csv',csv([['Chapter','Learning objective','Practice deliverable','Started','Completed','Evidence checked','Reflection'],...project.outline.map(ch=>[ch.title,ch.objective,ch.practicalDeliverable,'','','',''])]));
  add('research/reading-room.html',learningDocument('Source reading room',`<h1>Source reading room</h1><p>Research summaries and source links for this topic. Linked publications are not bundled or relicensed. Verification status records the author’s review; inspect the original source.</p>${project.referenceLibrary.cards.map(card=>`<section id="${escapeHtml(card.id)}"><h2>${escapeHtml(card.sourceTitle)}</h2><p>${escapeHtml(card.researchSummary)}</p>${/^https?:\/\//.test(card.sourceURL) ? `<p><a href="${escapeHtml(card.sourceURL)}">Read original source</a></p>`:''}<p>${escapeHtml(card.author || card.publisherOrOrg)} · ${escapeHtml(card.publicationDate || 'Date not supplied')} · ${escapeHtml(card.doi || 'DOI not supplied')} · ${escapeHtml(card.retrieval?.kind || 'Text not retrieved')} · ${escapeHtml(card.status)}</p>${card.verificationQuote ? `<blockquote>${escapeHtml(card.verificationQuote)}</blockquote><p>${escapeHtml(card.verificationLocator)}</p>`:''}</section>`).join('')}`));
  add('START-HERE.html',learningDocument(title,`<h1>${escapeHtml(title)}</h1><p>${escapeHtml(project.charter.subtitle)}</p><p class="notice">${reviewed ? 'Publication review passed in Digital Product Studio. Read the author’s usage notices and source limitations.' : 'AUTHOR REVIEW EDITION — not approved for buyer delivery. Resolve the publication-review report before distribution.'}</p><h2>Your learning route</h2><p>Read one chapter, complete its worksheet, check the cited evidence, and record your results before proceeding.</p><ol class="path">${roadmap || '<li>No chapters written yet.</li>'}</ol><h2>Complete collection</h2><ul><li><a href="book/executive-ebook.html">Executive e-book with figures and linked citations</a></li><li><a href="research/reading-room.html">Topic research and further reading</a></li><li><a href="research/claim-evidence-matrix.html">Passage-by-passage evidence and support reviews</a></li><li><a href="resources/learning-progress.csv">Learning progress spreadsheet</a></li><li><a href="resources/companion-toolkits.md">Complete companion toolkit</a></li><li><a href="review/publication-review.json">Publication review and evidence gaps</a></li></ul>`));
  add('README.txt',`Digital Product Studio — ${title}\nUnzip the complete folder and open START-HERE.html. Keep the folder structure intact.\nThe e-book, chapter readers, worksheets, companion HTML and source reading room work offline. External source links require internet access. Print HTML files from your browser to save PDFs.\nStatus: ${reviewed ? 'Publication review passed' : 'Author review required; do not distribute as a completed buyer product.'}\nImages are embedded in the book and provided separately when rights metadata is present.\nNo paid source books, videos, external spreadsheets or licensed source documents are implied unless actually supplied.\n`);
  const manifest = await Promise.all([...files].map(async ([path,data])=>({path,bytes:data.byteLength,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(data)))).map(b=>b.toString(16).padStart(2,'0')).join('')})));
  for (const [path,data] of files) zip.file(path,data);
  zip.file('manifest.json',JSON.stringify({title,createdAt:new Date().toISOString(),reviewed,files:manifest},null,2));
  return {zip,manifest};
}
