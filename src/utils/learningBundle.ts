import type { ReferenceVerificationReport } from '../types/research.ts';
import { isRetrievedSource, sourceFingerprint } from './sourceEvidence.ts';
import { evidencePassages, assessPassage, resourceEvidenceDocument } from './citationEvidence.ts';
import JSZip from 'jszip';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { DigitalProductProject } from '../types/project.ts';
import { sanitizeProjectForExport } from './projectSanitizer.ts';
import {
  compileStyledHtml,
  compileManuscriptMarkdown,
  compileReferenceLibraryMarkdown,
  compileCompanionResourcesMarkdown,
  compileLaunchAssetsMarkdown,
  compileExecutiveSummaryMarkdown,
} from './markdownCompiler.ts';
import { escapeHtml, auditChapter } from './styledBook.ts';
import { gateIssues } from './gatePolicy.ts';
import { calculateProfitability, PLATFORM_FEE_PRESETS } from './commercialMath.ts';

const parser = new Marked({ gfm: true, renderer: { html: ({text}) => escapeHtml(text) } });
const render = (md: string) => sanitizeHtml(parser.parse(md, {async:false}));
const csv = (rows: string[][]) => rows.map(row => row.map(cell => `"${(/^[=+\-@\t\r]/.test(cell) ? "'" + cell : cell).replaceAll('"','""')}"`).join(',')).join('\r\n');
const safeBrandHex = (value: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value ?? '')) ? String(value) : fallback;
const ALLOWED_DOC_DISPLAY = new Set(['Fraunces', 'Playfair Display', 'Plus Jakarta Sans', 'Space Grotesk', 'Merriweather']);
const ALLOWED_DOC_BODY = new Set(['Plus Jakarta Sans', 'Source Sans 3', 'Merriweather', 'JetBrains Mono']);
export function learningDocument(title: string, body: string, brand?: DigitalProductProject['brand']): string {
  const primary = safeBrandHex(brand?.primaryHex, '#146b5d');
  const secondary = safeBrandHex(brand?.secondaryHex, '#0f766e');
  const highlight = safeBrandHex(brand?.accentHex, '#d97706');
  const surface = safeBrandHex(brand?.neutralBgHex, '#f2f6f5');
  const displayFont = brand?.fontDisplay && ALLOWED_DOC_DISPLAY.has(brand.fontDisplay) ? brand.fontDisplay : 'Fraunces';
  const bodyFont = brand?.fontBody && ALLOWED_DOC_BODY.has(brand.fontBody) ? brand.fontBody : 'Plus Jakarta Sans';
  const fontQuery = [...new Set([displayFont, bodyFont])].map(f => `family=${f.replaceAll(' ', '+')}:wght@400;600;700`).join('&');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet"><style>:root{--accent:${primary};--secondary:${secondary};--highlight:${highlight};--surface:${surface};--line:#c8d6d9;--ink:#13272f;--muted:#4d626b}*{box-sizing:border-box}body{margin:0;background:#e6ecef;color:var(--ink);font:16.5px/1.75 "${bodyFont}",system-ui,sans-serif}main{max-width:1020px;background:#fff;margin:32px auto;border-radius:14px;border:1px solid var(--line);border-top:8px solid var(--accent);box-shadow:0 16px 40px -22px rgba(15,38,48,0.2);padding:clamp(22px,5vw,58px)}h1,h2{line-height:1.25;text-wrap:balance;color:var(--ink)}h1{font:700 clamp(28px,4.2vw,44px)/1.18 "${displayFont}",Georgia,serif;margin-top:0}h2{margin-top:38px;color:var(--accent);font-family:"${displayFont}",Georgia,serif}a{color:var(--secondary);text-underline-offset:3px;font-weight:600}a:focus-visible{outline:3px solid var(--highlight)}p{max-width:72ch}li{margin-bottom:10px}table{border-collapse:collapse;width:100%;display:block;overflow:auto;font-variant-numeric:tabular-nums}td,th{padding:12px 14px;border:1px solid var(--line);text-align:left}th{background:var(--surface);color:var(--accent)}blockquote{background:var(--surface);border:1px solid var(--line);border-radius:8px;margin:20px 0;padding:18px 22px}code,pre{white-space:pre-wrap;overflow-wrap:anywhere}.hero-band{background:linear-gradient(135deg,var(--surface) 0%,#ffffff 70%);border:1px solid var(--line);border-radius:12px;padding:26px 28px;margin-bottom:24px}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--secondary);margin-bottom:8px}.notice{padding:14px 18px;background:#fff7e6;border:1px solid #e6c687;border-radius:8px;color:#754314;font-weight:600;font-size:14.5px}.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:20px 0}.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:18px}.card h3{margin-top:0;font-size:15px;color:var(--accent)}.tier-highlight{border-top:4px solid var(--highlight);background:#fff}.path{padding:0;list-style:none}.path li{border-bottom:1px solid var(--line);padding:16px 0}small{color:var(--muted)}.toolbar{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-bottom:22px;padding-bottom:14px;border-bottom:1px solid var(--line)}.print-btn{border:0;background:var(--accent);color:#fff;padding:10px 16px;border-radius:8px;font:600 13px "${bodyFont}",system-ui,sans-serif;cursor:pointer}.print-btn:hover{background:var(--secondary)}@media print{body{background:#fff}main{margin:0;padding:0;box-shadow:none;border:0}.print-btn{display:none}a{color:inherit}}</style></head><body><main>${body}<footer><hr><small>${escapeHtml(brand?.profileName || 'Digital Product Studio')} · Author-created learning materials. Follow source attribution and image rights.</small></footer></main></body></html>`;
}
export async function buildLearningBundle(rawProject: DigitalProductProject, sourceCheck?: ReferenceVerificationReport): Promise<{ zip: JSZip; manifest: { path: string; bytes: number; sha256: string }[] }> {
  const project = sanitizeProjectForExport(rawProject);
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
  const executiveSummaryMd = compileExecutiveSummaryMarkdown(project);
  add('resources/executive-summary.md', executiveSummaryMd);
  add('resources/executive-summary.html', learningDocument(`${title} — Executive Summary & Action Playbook`, render(executiveSummaryMd), project.brand));
  add('research/reference-library.md',compileReferenceLibraryMarkdown(project));
  add('research/source-records.json',JSON.stringify(project.referenceLibrary.cards,null,2));
  add('research/marketplace-evidence.json',JSON.stringify(project.marketResearch,null,2));
  add('resources/companion-toolkits.md',compileCompanionResourcesMarkdown(project));
  const launchMd = compileLaunchAssetsMarkdown(project);
  add('publisher/sales-assets.md', launchMd);
  const pricing = project.pricingReport;
  const channelModels = PLATFORM_FEE_PRESETS.slice(0, 4).map((preset) => {
    const model = calculateProfitability({
      introductoryPrice: pricing.introductoryPrice || 15,
      regularPrice: pricing.regularPrice || 29,
      bundlePrice: pricing.bundlePrice || 49,
      monthlyVisitors: 1200,
      conversionRatePercent: 2.5,
      bundleSharePercent: 25,
      introSharePercent: 20,
      platformFeePercent: preset.feePercent,
      fixedFeePerSale: preset.fixedFeePerSale,
      monthlyOverheadUsd: 25,
    });
    return { preset, model };
  });
  const launchSummaryHtml = `<div class="hero-band"><div class="eyebrow">Creator Commercialization Kit · ${escapeHtml(project.brand?.profileName || 'Digital Product Studio')}</div><h1>${escapeHtml(title)} — Commercial Launch &amp; Margin Kit</h1><p>Creator-facing commercialization package with channel net-margin comparison, pricing ladder, sales page positioning, and 30-day execution checklist.</p></div>
    <div class="summary-grid">
      <div class="card"><h3>Introductory Test Tier</h3><p><strong>$${escapeHtml(pricing.introductoryPrice)} ${escapeHtml(pricing.currency)}</strong></p></div>
      <div class="card"><h3>Standard Core Tier</h3><p><strong>$${escapeHtml(pricing.regularPrice)} ${escapeHtml(pricing.currency)}</strong></p></div>
      <div class="card tier-highlight"><h3>Complete Toolkit Bundle</h3><p><strong>$${escapeHtml(pricing.bundlePrice)} ${escapeHtml(pricing.currency)}</strong></p></div>
    </div>
    <h2>Channel Margin Scenarios (Assumes 1,200 visits/mo @ 2.5% conversion, $25/mo overhead)</h2>
    <table><thead><tr><th>Platform</th><th>Blended AOV</th><th>Net / Sale</th><th>Monthly Net Profit</th><th>Margin %</th></tr></thead><tbody>
    ${channelModels.map(({ preset, model }) => `<tr><td><strong>${escapeHtml(preset.name)}</strong><br><small>${escapeHtml(preset.notes)}</small></td><td>$${model.blendedAverageOrderValue}</td><td>$${model.netPerSale}</td><td>$${model.netMonthlyProfit}</td><td>${model.profitMarginPercent}%</td></tr>`).join('')}
    </tbody></table>
    ${render(launchMd)}`;
  add('publisher/launch-summary.html', learningDocument(`${title} — Commercial Launch & Margin Kit`, launchSummaryHtml, project.brand));

  const sales = project.salesAssets;
  const storefrontHtml = `<div class="hero-band"><div class="eyebrow">Storefront Listing Kit · Copy-Ready Sales Page Assets</div><h1>${escapeHtml(sales.salesPageHeadline || title)}</h1><p><strong>${escapeHtml(sales.salesPageSubheadline || project.charter.subtitle || '')}</strong></p><p>${escapeHtml(sales.heroPitch || project.charter.centralPromise || '')}</p></div>
    <h2>What Buyers Receive Inside This Bundle</h2>
    <div class="summary-grid">
      <div class="card"><h3>1. Executive E-Book (${project.outline.length} Chapters)</h3><p>Publication-formatted chapters with action takeaways, conceptual process figures, and cited source notes.</p></div>
      <div class="card"><h3>2. Quick-Start Summary &amp; Worksheets</h3><p>${project.outline.length} chapter practice sheets plus ${project.resources.length} companion toolkit resource(s) and progress CSV.</p></div>
      <div class="card"><h3>3. Grounded Evidence Index</h3><p>${project.referenceLibrary.cards.length} curated reference card(s) with reading room summaries and source links.</p></div>
    </div>
    <h2>Key Transformation &amp; Benefit Bullets (Paste into Gumroad / Etsy / Payhip)</h2>
    <ul>${(sales.productDescriptionBullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('') || `<li>${escapeHtml(project.charter.centralPromise || 'Step-by-step commercial playbook')}</li>`}</ul>
    <h2>3-Tier Commercial Pricing Table</h2>
    <div class="summary-grid">
      <div class="card"><h3>Starter Test · $${escapeHtml(pricing.introductoryPrice)} ${escapeHtml(pricing.currency)}</h3><p>Core Executive E-Book &amp; Executive Summary Playbook.</p></div>
      <div class="card"><h3>Standard Edition · $${escapeHtml(pricing.regularPrice)} ${escapeHtml(pricing.currency)}</h3><p>Full E-Book + Chapter Worksheets + Progress Tracker CSV.</p></div>
      <div class="card tier-highlight"><h3>Complete Pro Bundle · $${escapeHtml(pricing.bundlePrice)} ${escapeHtml(pricing.currency)}</h3><p>Everything in Standard + Companion Workbooks, Checklists &amp; Reference Reading Room.</p></div>
    </div>
    <div class="summary-grid">
      <div class="card"><h3>Ideal For</h3><p>${escapeHtml(sales.targetBuyerNotice || project.charter.targetAudience || '')}</p></div>
      <div class="card"><h3>Not Designed For</h3><p>${escapeHtml(sales.notForBuyerNotice || 'Readers looking for overnight shortcuts without executing the worksheets.')}</p></div>
    </div>
    <h2>Frequently Asked Questions</h2>
    ${(sales.faqList || []).map(faq => `<div class="card" style="margin-bottom:12px"><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></div>`).join('') || '<p>No FAQ items configured yet.</p>'}
    <h2>Bonus Lead Magnet Opt-In Concept</h2>
    <div class="card"><h3>${escapeHtml(sales.leadMagnetConcept?.title || `${title} Starter Sample`)}</h3><p><strong>Hook:</strong> ${escapeHtml(sales.leadMagnetConcept?.hook || '')}</p><p><strong>Format:</strong> ${escapeHtml(sales.leadMagnetConcept?.format || 'PDF Guide')} · <strong>Deliverable:</strong> ${escapeHtml(sales.leadMagnetConcept?.deliverable || '')}</p></div>`;
  add('publisher/storefront-listing.html', learningDocument(`${title} — Storefront Listing Kit`, storefrontHtml, project.brand));

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
    const chapterAudit = auditChapter(chapter, project.referenceLibrary.cards);
    const mappedTitles = (chapter.mappedReferenceIds || [])
      .map(id => {
        const card = project.referenceLibrary.cards.find(c => c.id === id);
        return card ? `[${card.id}] ${card.sourceTitle}` : id;
      });
    roadmap += `<li><a href="${chapterPath}"><strong>Chapter ${chapter.order}: ${escapeHtml(chapter.title)}</strong></a><p>${escapeHtml(chapter.objective || 'Apply chapter framework.')}</p><small>Practice deliverable: ${escapeHtml(chapter.practicalDeliverable || 'Chapter worksheet')} · Milestone: ${escapeHtml(chapter.completionMilestone || 'Review objective')} · Reviewed citations: ${chapterAudit.cited}/${chapterAudit.passages} · <a href="resources/worksheet-${index+1}.html">Open worksheet</a></small></li>`;
    const subtopicsSection = chapter.subtopics?.length
      ? `## Key topics covered\n${chapter.subtopics.map(st => `- [ ] ${st}`).join('\n')}\n\n`
      : '';
    const scenariosSection = chapter.exampleScenarios?.length
      ? `## Worked scenarios to compare\n${chapter.exampleScenarios.map(sc => `- ${sc}`).join('\n')}\n\n`
      : '';
    const sourcesSection = mappedTitles.length
      ? `## Supporting sources mapped to this chapter\n${mappedTitles.map(src => `- ${src}`).join('\n')}\n\n`
      : '';
    const worksheet=`# ${chapter.title} — Practice Worksheet\n\n## Learning objective\n${chapter.objective}\n\n${subtopicsSection}${scenariosSection}## Before reading\n- What baseline metric or current constraint am I bringing to this chapter?\n- What concrete decision do I need to make after completing it?\n\n## Evidence & application notebook\n| Key insight / method from chapter | Reference ID & locator | How it applies to my situation | Next concrete action |\n|---|---|---|---|\n| | | | |\n| | | | |\n\n## Apply the method: ${chapter.practicalDeliverable}\n1. Describe the real situation or dataset where you will apply this chapter.\n2. Record your starting baseline and constraints before making changes.\n3. Execute the step-by-step framework from the chapter and capture your outputs.\n4. Compare your output against the completion standard below.\n\n## Completion check\n${chapter.completionMilestone}\n\n${sourcesSection}## Reflection\n- What worked reliably, and what evidence or result confirms it?\n- What friction or edge case came up?\n- Which step should I carry into next week's routine?\n`;
    add(`resources/worksheet-${index+1}.md`,worksheet);
    add(`resources/worksheet-${index+1}.html`,learningDocument(`${chapter.title} — Practice`, `<div class="toolbar"><span class="eyebrow">Printable Chapter Practice Sheet</span><button class="print-btn" onclick="window.print()">Print Worksheet</button></div>${render(worksheet)}`, project.brand));
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
  add('resources/learning-progress.csv',csv([['Chapter','Learning objective','Practice deliverable','Completion milestone','Started','Completed','Evidence checked','Reflection'],...project.outline.map(ch=>[ch.title,ch.objective,ch.practicalDeliverable,ch.completionMilestone,'','','',''])]));
  add('research/reading-room.html',learningDocument('Source reading room',`<h1>Source reading room</h1><p>Research summaries and source links for this topic. Linked publications are not bundled or relicensed. Verification status records the author’s review; inspect the original source.</p>${project.referenceLibrary.cards.map(card=>`<section id="${escapeHtml(card.id)}"><h2>${escapeHtml(card.sourceTitle)}</h2><p>${escapeHtml(card.researchSummary)}</p>${/^https?:\/\//.test(card.sourceURL) ? `<p><a href="${escapeHtml(card.sourceURL)}">Read original source</a></p>`:''}<p>${escapeHtml(card.author || card.publisherOrOrg)} · ${escapeHtml(card.publicationDate || 'Date not supplied')} · ${escapeHtml(card.doi || 'DOI not supplied')} · ${escapeHtml(card.retrieval?.kind || 'Text not retrieved')} · ${escapeHtml(card.status)}</p>${card.verificationQuote ? `<blockquote>${escapeHtml(card.verificationQuote)}</blockquote><p>${escapeHtml(card.verificationLocator)}</p>`:''}</section>`).join('')}`, project.brand));
  const overviewCards = `<div class="summary-grid">
    <div class="card"><h3>Who This Is For</h3><p>${escapeHtml(project.charter.targetAudience || project.intake.targetAudience || 'Readers looking for a structured, practical system.')}</p></div>
    <div class="card"><h3>Problem Solved</h3><p>${escapeHtml(project.charter.primaryProblemSolved || project.intake.problemsSolved || 'Eliminate guesswork with step-by-step frameworks and worksheets.')}</p></div>
    <div class="card"><h3>Target Outcome</h3><p>${escapeHtml(project.charter.centralPromise || project.intake.desiredTransformation || 'Deliver measurable progress across each milestone.')}</p></div>
  </div>`;
  const bundleShowcaseCards = `<div class="summary-grid">
    <div class="card tier-highlight"><h3>1. Executive E-Book</h3><p>${project.outline.length} complete chapter(s) with visual process diagrams and linked citations.</p><p><a href="book/executive-ebook.html">Open Complete E-Book →</a></p></div>
    <div class="card"><h3>2. Quick-Start Playbook</h3><p>Before → Bridge → After transformation map and chapter action table.</p><p><a href="resources/executive-summary.html">Open Executive Summary →</a></p></div>
    <div class="card"><h3>3. Companion Workbooks</h3><p>${project.outline.length} chapter worksheet(s), ${project.resources.length} companion toolkit(s) &amp; progress CSV.</p><p><a href="resources/learning-progress.csv">Open Progress Tracker →</a></p></div>
  </div>`;
  add('START-HERE.html',learningDocument(title,`<div class="hero-band"><div class="eyebrow">Buyer Welcome Portal · ${escapeHtml(project.brand?.profileName || 'Digital Product Studio')}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(project.charter.subtitle)}</p><p class="notice">${reviewed ? 'Publication review passed in Digital Product Studio. Read the author’s usage notices and source limitations.' : 'AUTHOR REVIEW EDITION — not approved for buyer delivery. Resolve the publication-review report before distribution.'}</p></div>${bundleShowcaseCards}${overviewCards}<h2>Quick-Start 3-Step Usage Guide</h2><ol><li><strong>Start with the <a href="resources/executive-summary.html">Executive Summary &amp; Action Playbook</a></strong> to grasp the overall transformation path and key takeaways in 5 minutes.</li><li><strong>Read one chapter at a time</strong> inside the <a href="book/executive-ebook.html">Complete Executive E-Book</a> or individual chapter readers below, and complete its companion worksheet immediately after.</li><li><strong>Inspect cited evidence and track results</strong> in the <a href="research/reading-room.html">Source Reading Room</a> and <a href="resources/learning-progress.csv">Learning Progress Spreadsheet</a>.</li></ol><h2>Your learning route</h2><p>Read one chapter, complete its worksheet, check the cited evidence, and record your results before proceeding.</p><ol class="path">${roadmap || '<li>No chapters written yet.</li>'}</ol><h2>Complete collection</h2><ul><li><a href="resources/executive-summary.html">Executive Summary &amp; Quick-Start Action Playbook</a> (<a href="resources/executive-summary.md">Markdown</a>)</li><li><a href="book/executive-ebook.html">Executive e-book with figures and linked citations</a></li><li><a href="research/reading-room.html">Topic research and further reading</a></li><li><a href="research/claim-evidence-matrix.html">Passage-by-passage evidence and support reviews</a></li><li><a href="resources/learning-progress.csv">Learning progress spreadsheet</a></li><li><a href="resources/companion-toolkits.md">Complete companion toolkit</a></li><li><a href="publisher/storefront-listing.html">Storefront Listing Kit (Copy-Ready Sales Page &amp; Pricing Tiers)</a></li><li><a href="publisher/launch-summary.html">Creator Commercial Launch &amp; Margin Kit</a></li><li><a href="review/publication-review.json">Publication review and evidence gaps</a></li></ul>`, project.brand));
  add('README.txt',`Digital Product Studio — ${title}\nUnzip the complete folder and open START-HERE.html. Keep the folder structure intact.\nStart with resources/executive-summary.html for a quick-start overview, then open book/executive-ebook.html.\nThe e-book, chapter readers, worksheets, companion HTML and source reading room work offline. External source links require internet access. Print HTML files from your browser to save PDFs.\nStatus: ${reviewed ? 'Publication review passed' : 'Author review required; do not distribute as a completed buyer product.'}\nImages are embedded in the book and provided separately when rights metadata is present.\nNo paid source books, videos, external spreadsheets or licensed source documents are implied unless actually supplied.\n`);
  const manifest = await Promise.all([...files].map(async ([path,data])=>({path,bytes:data.byteLength,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(data)))).map(b=>b.toString(16).padStart(2,'0')).join('')})));
  for (const [path,data] of files) zip.file(path,data);
  zip.file('manifest.json',JSON.stringify({title,createdAt:new Date().toISOString(),reviewed,files:manifest},null,2));
  return {zip,manifest};
}
