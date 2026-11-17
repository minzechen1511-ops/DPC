import { auditChapter, assessPassage, evidencePassage, evidencePassages } from './citationEvidence.ts';
import { isRetrievedSource, bibliographicKey, referenceYear } from './sourceEvidence.ts';
import { Marked, type Tokens } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { ChapterOutlineItem, DigitalProductProject, ReferenceCard, ChapterIllustration } from '../types/project.ts';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const safeUrl = (value: string) => /^https?:\/\//i.test(value) ? escapeHtml(value) : '';
const citationPattern = /\[(REF-[\w-]+(?:\s*[,;]\s*REF-[\w-]+)*)\]/g;
const idsIn = (text: string) => [...text.replace(/`+[^`]*`+/g, '').replace(/<!--[\s\S]*?-->/g, '').matchAll(citationPattern)].flatMap(m => m[1].split(/\s*[,;]\s*/));
const isVerified = isRetrievedSource;

export { auditChapter } from './citationEvidence.ts';

export function compileStyledHtml(project: DigitalProductProject): string {
  const { charter, brand, intake, outline } = project;
  const cards = project.referenceLibrary.cards;
  const used = new Set<string>();
  const numbers = new Map<string, number>();
  const bibliographyNumbers = new Map<string, number>();
  const cite = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return `<span class="source-needed">Unknown source: ${escapeHtml(id)}</span>`;
    const identity = bibliographicKey(card);
    if (!bibliographyNumbers.has(identity)) bibliographyNumbers.set(identity, bibliographyNumbers.size + 1);
    numbers.set(id, bibliographyNumbers.get(identity)!);
    used.add(id);
    return `<a class="citation" href="#reference-${numbers.get(id)}" aria-label="Reference ${numbers.get(id)}: ${escapeHtml(card.sourceTitle)}">[${numbers.get(id)}]</a>${isVerified(card) ? '' : '<span class="source-needed">Source review needed</span>'}`;
  };
  let activeChapter: ChapterOutlineItem;
  let activeHeading = '';
  let pendingPassages: ReturnType<typeof evidencePassages> = [];
  let inListItem = 0;
  const review = (raw: string, kind = 'paragraph', explicitIds?: string[]) => {
    const candidate = evidencePassage(raw, kind, activeHeading, explicitIds);
    const index = pendingPassages.findIndex(item => item.kind === kind && item.text === candidate.text && JSON.stringify(item.referenceIds) === JSON.stringify(candidate.referenceIds));
    const passage = index >= 0 ? pendingPassages.splice(index,1)[0] : candidate;
    const state = assessPassage(passage, activeChapter, cards);
    return state.valid ? (state.editorial ? '<small class="editorial-note">Author-reviewed original instruction / example; not empirical evidence.</small>' : '') : `<small class="source-needed">${passage.referenceIds.length ? 'Claim-to-source review needed' : 'Citation needed or explicit editorial review required'}</small>`;
  };
  const parser = new Marked({ gfm: true, breaks: false });
  parser.use({
    extensions: [{
      name: 'sourceCitation', level: 'inline',
      start: src => src.indexOf('[REF-'),
      tokenizer(src) {
        const match = /^\[(REF-[\w-]+(?:\s*[,;]\s*REF-[\w-]+)*)\]/.exec(src);
        if (match) return { type: 'sourceCitation', raw: match[0], ids: match[1].split(/\s*[,;]\s*/) };
      },
      renderer: token => `<sup>${(token.ids as string[]).map(cite).join(' ')}</sup>`,
    }],
    renderer: {
      html: ({ text }) => escapeHtml(text) + review(text, 'html'),
      paragraph({ tokens, raw }) { return `<p>${this.parser.parseInline(tokens)}${inListItem ? '' : review(raw)}</p>\n`; },
      listitem({ tokens }) { inListItem++; const body=this.parser.parse(tokens); inListItem--; return `<li>${body}${review(tokens.filter(t => t.type !== 'list').map(t => t.raw).join(''), 'list-item')}</li>\n`; },
      table({ header, rows }) {
        const headerText = header.map(cell => cell.text).join(' | ');
        return `<table><thead><tr>${header.map(cell => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('')}<th>Evidence review</th></tr></thead><tbody>${rows.map(row => { const raw = row.map(cell => cell.text).join(' | '); return `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}<td>${review(`${headerText}\n${raw}`, 'table-row', idsIn(raw)) || 'Author-reviewed against cited excerpt'}</td></tr>`; }).join('')}</tbody></table>`;
      },
      heading({ depth, tokens, text }) { activeHeading = text; return `<h${Math.min(depth + 1, 6)}>${this.parser.parseInline(tokens)}</h${Math.min(depth + 1, 6)}>\n`; },
    },
  });
  const renderTokens = (tokens: ReturnType<typeof parser.lexer>) => sanitizeHtml(parser.parser(tokens), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'sup', 'small', 'span'],
    allowedAttributes: { a: ['href', 'title', 'class', 'aria-label'], span: ['class'], small: ['class'], th: ['align'], td: ['align'] },
    allowedSchemes: ['https', 'http', 'mailto'],
  });
  const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#]/g, '').trim();
  const diagram = (steps: string[], caption: string, label: string) => `<figure class="process-figure" aria-label="${escapeHtml(label)}"><ol class="process">${steps.filter(Boolean).map(step => `<li>${escapeHtml(plain(step))}</li>`).join('')}</ol><figcaption>${caption}</figcaption></figure>`;
  const illustration = (image: ChapterIllustration, label: string) => {
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image.dataUri) || !image.license || !image.credit || !image.alt) return '';
    return `<figure class="supporting-image"><img src="${image.dataUri}" alt="${escapeHtml(image.alt)}" loading="lazy"><figcaption>${label}. ${escapeHtml(image.caption)} ${image.sourceReferenceIds.map(cite).join(' ')}${assessPassage(evidencePassage(image.caption, 'figure-caption', image.id, image.sourceReferenceIds), activeChapter, cards).valid ? '' : '<small class="source-needed">Figure-caption support review needed</small>'}<small>Credit: ${escapeHtml(image.credit)} · Rights: ${escapeHtml(image.license)}</small></figcaption></figure>`;
  };
  const sections = (chapter: ChapterOutlineItem) => {
    activeChapter = chapter; activeHeading = ''; pendingPassages = evidencePassages(chapter); inListItem = 0;
    let figure = 0;
    const placedImages = new Set<string>();
    const groups: ReturnType<typeof parser.lexer>[] = [];
    const chapterTokens = parser.lexer(chapter.contentMarkdown || '');
    for (const token of chapterTokens) {
      if (!groups.length || token.type === 'heading') groups.push(Object.assign([], { links: chapterTokens.links }));
      groups[groups.length - 1].push(token);
    }
    const renderedSections = groups.map(tokens => {
      const heading = tokens.find(t => t.type === 'heading') as Tokens.Heading | undefined;
      const list = tokens.find(t => t.type === 'list') as Tokens.List | undefined;
      const points = list?.items.map(t => plain(t.text.replace(citationPattern, '')).slice(0, 220)).filter(Boolean).slice(0, 5);
      const rendered = renderTokens(tokens);
      const charts = tokens.filter(t => t.type === 'table').map(token => {
        const table = token as Tokens.Table;
        // Chart only explicitly cited numeric data. Keep the original accessible table alongside it.
        const ids = [...new Set(idsIn(table.raw))];
        if (!ids.length || !ids.every(id => isVerified(cards.find(c => c.id === id))) || table.rows.length < 2 || table.rows.length > 12) return '';
        if (!table.rows.every(row => { const raw = row.map(cell => cell.text).join(' | '); return assessPassage(evidencePassage(`${table.header.map(cell => cell.text).join(' | ')}\n${raw}`, 'table-row', heading?.text || activeHeading, idsIn(raw)), chapter, cards).valid; })) return '';
        return table.header.slice(1).map((header, offset) => {
          const values = table.rows.map(row => {
            const clean = row[offset + 1]?.text.replace(citationPattern, '').trim() || '';
            const match = /^([$€£]?)(-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(%|[a-zA-Z°]+)?$/.exec(clean);
            return match ? { value: Number(match[2].replace(/,/g, '')), unit: match[1] + (match[3] || ''), label: plain(row[0].text.replace(citationPattern, '')), display: clean } : null;
          });
          if (values.some(v => !v || v.value < 0 || !Number.isFinite(v.value)) || new Set(values.map(v => v?.unit)).size !== 1) return '';
          const data = values.filter(v => v !== null);
          const max = Math.max(...data.map(v => v.value));
          if (!max) return '';
          const height = data.length * 48 + 44;
          return `<figure class="data-figure"><svg viewBox="0 0 700 ${height}" role="img" aria-label="${escapeHtml(plain(header.text))} — cited table values"><title>${escapeHtml(plain(header.text))}</title>${data.map((v, i) => `<text x="0" y="${i * 48 + 25}" font-size="13" fill="#173039">${escapeHtml(v.label.slice(0, 24))}</text><rect x="210" y="${i * 48 + 8}" width="${v.value / max * 350}" height="26" fill="#146b5d"/><text x="${220 + v.value / max * 350}" y="${i * 48 + 26}" font-size="13" fill="#173039">${escapeHtml(v.display)}</text>`).join('')}<text x="210" y="${height - 4}" font-size="12" fill="#50636c">0 · Common zero baseline · ${escapeHtml(plain(header.text))}</text></svg><figcaption>Figure ${chapter.order}.${++figure}. ${escapeHtml(plain(header.text))}. Values transcribed from the adjacent manuscript table ${ids.map(cite).join(' ')}. Check values and comparability against the original source before publication.</figcaption></figure>`;
        }).join('');
      }).join('');
      const images = (chapter.illustrations || []).filter(image => !placedImages.has(image.id) && image.paragraphAnchor && tokens.some(t => t.raw.includes(image.paragraphAnchor))).map(image => { placedImages.add(image.id); return illustration(image, `Figure ${chapter.order}.${++figure}`); }).join('');
      const concept = heading && points && points.length > 1 ? diagram(points, `Figure ${chapter.order}.${++figure}. ${escapeHtml(plain(heading.text))} — conceptual summary of this section; not measured data. ${[...new Set(idsIn(list?.raw || ''))].map(cite).join(' ')}`, plain(heading.text)) : '';
      const visuals = charts + images + concept;
      return visuals ? `<div class="reading-section"><div>${rendered}</div><aside class="section-figures" aria-label="Supporting chapter figures">${visuals}</aside></div>` : rendered;
    }).join('');
    const unplaced = (chapter.illustrations || []).filter(image => !placedImages.has(image.id));
    return renderedSections + (unplaced.length ? `<section><h3>Additional chapter illustrations</h3>${unplaced.map(image => illustration(image, `Figure ${chapter.order}.${++figure}`)).join('')}</section>` : '');
  };

  const chapterHtml = outline.map((ch, index) => {
    const audit = auditChapter(ch, cards);
    const mapped = cards.filter(c => ch.mappedReferenceIds.includes(c.id));
    const unknownMapped = ch.mappedReferenceIds.filter(id => !cards.some(card => card.id === id));
    const content = sections(ch);
    return `<section class="chapter" id="chapter-${index + 1}"><div class="chapter-label">Chapter ${escapeHtml(ch.order)}</div><h2>${escapeHtml(ch.title)}</h2>
      ${ch.objective ? `<p class="objective">${escapeHtml(ch.objective)}</p>` : ''}
      <details class="evidence-note" ${audit.needsReview || unknownMapped.length ? 'open' : ''}><summary>Evidence review: ${audit.cited} supported citation reviews · ${audit.editorial} editorial reviews · ${audit.needsReview} unresolved passages</summary><p>Support decisions are author-reviewed against retrieved excerpts, not independent scientific certification. Bibliography, excerpt or passage edits invalidate the corresponding decision. ${audit.needsReview} passages need citation or source review. ${audit.unresolvedIds.length || unknownMapped.length ? `Unresolved IDs: ${escapeHtml([...audit.unresolvedIds, ...unknownMapped].join(', '))}.` : ''}</p></details>
      <div class="chapter-content">${content || '<p>Manuscript not yet written.</p>'}</div>
      ${diagram([ch.objective, ...ch.subtopics, ch.practicalDeliverable].filter(Boolean), `Figure ${escapeHtml(ch.order)}. Overview — chapter plan and intended outcome. Editorial concept diagram; not evidence of effectiveness.`, `Chapter ${ch.order} overview`)}
      ${mapped.length ? `<details class="evidence-note"><summary>Research mapped to this chapter (not automatically cited evidence)</summary><ul>${mapped.map(card => `<li>${escapeHtml(card.sourceTitle)} — ${escapeHtml(card.id)}. ${isRetrievedSource(card) ? 'Text retrieved; individual claims still require review.' : 'Retrieval or bibliographic review needed.'}</li>`).join('')}</ul></details>` : audit.passages > 0 && audit.editorial === audit.passages ? '<p class="editorial-note">Original author-reviewed instructions; no empirical source claims.</p>' : '<p class="source-needed">No research sources mapped to this chapter.</p>'}

      ${ch.practicalDeliverable ? `<aside class="action"><h3>Apply this chapter</h3><p>${escapeHtml(ch.practicalDeliverable)}</p><p>Completion goal: ${escapeHtml(ch.completionMilestone || 'Review the result against the chapter objective.')}</p></aside>` : ''}
      <a class="back-link" href="#contents">Back to contents ↑</a></section>`;
  }).join('');
  const citedRecords = cards.filter(c => used.has(c.id)).sort((a,b)=>numbers.get(a.id)!-numbers.get(b.id)!);
  const refs = citedRecords.filter((card,index)=>citedRecords.findIndex(other=>bibliographicKey(other)===bibliographicKey(card))===index);
  const color = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const ALLOWED_DISPLAY_FONTS: Record<string, string> = {
    Fraunces: 'Fraunces',
    'Playfair Display': 'Playfair Display',
    'Plus Jakarta Sans': 'Plus Jakarta Sans',
    'Space Grotesk': 'Space Grotesk',
    Merriweather: 'Merriweather',
  };
  const ALLOWED_BODY_FONTS: Record<string, string> = {
    'Plus Jakarta Sans': 'Plus Jakarta Sans',
    'Source Sans 3': 'Source Sans 3',
    Merriweather: 'Merriweather',
    'JetBrains Mono': 'JetBrains Mono',
  };
  const displayFont = ALLOWED_DISPLAY_FONTS[brand.fontDisplay] || 'Fraunces';
  const bodyFont = ALLOWED_BODY_FONTS[brand.fontBody] || 'Plus Jakarta Sans';
  const googleFontFamilies = [...new Set([displayFont, bodyFont])]
    .map(name => `family=${name.replaceAll(' ', '+')}:wght@400;600;700`)
    .join('&');
  const title = escapeHtml(charter.productTitle || intake.projectName || 'Digital Product');
  const primaryHex = color(brand.primaryHex, '#14685f');
  const secondaryHex = color(brand.secondaryHex, '#278774');
  const accentHighlightHex = color(brand.accentHex, '#d97706');
  const surfaceHex = color(brand.neutralBgHex, '#f4f7f6');
  const studioMark = `<svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-hidden="true" style="vertical-align:middle;margin-right:8px"><rect width="64" height="64" rx="14" fill="${primaryHex}"/><path d="M16 18.5C16 16.567 17.567 15 19.5 15H34.5C42.508 15 49 21.492 49 29.5V34.5C49 42.508 42.508 49 34.5 49H19.5C17.567 49 16 47.433 16 45.5V18.5Z" stroke="${secondaryHex}" stroke-width="2.5"/><path d="M23 22H33.5C38.194 22 42 25.806 42 30.5V33.5C42 38.194 38.194 42 33.5 42H23V22Z" fill="${secondaryHex}"/><path d="M31 19L35 27L43 31L35 35L31 43L27 35L19 31L27 27L31 19Z" fill="${accentHighlightHex}"/><circle cx="31" cy="31" r="2.75" fill="${primaryHex}"/></svg>`;
  const { transformationMap, productBible } = project;
  const beforeItems = transformationMap?.beforeState?.currentPains || [];
  const bridgeItems = transformationMap?.bridgeProcess?.keyMilestones || [];
  const afterItems = transformationMap?.afterState?.tangibleOutcomes || [];
  const keyTermsEntries = Object.entries(productBible?.keyTerminology || {});
  const introducedConcepts = productBible?.introducedConcepts || [];
  const hasSummaryMeta = outline.length > 1 || Boolean(charter.primaryProblemSolved?.trim()) || beforeItems.length > 0;
  const executiveSummaryHtml = hasSummaryMeta ? `<section id="executive-summary" class="executive-summary" aria-label="Executive Summary and Learning Roadmap">
    <div class="chapter-label">Executive Summary &amp; Action Roadmap</div>
    <h2>How to Use This Guide for Measurable Results</h2>
    <div class="summary-grid">
      ${charter.targetAudience ? `<div class="summary-card"><h3>Who This Guide Helps</h3><p>${escapeHtml(charter.targetAudience)}</p></div>` : ''}
      ${charter.primaryProblemSolved ? `<div class="summary-card"><h3>Core Problem Solved</h3><p>${escapeHtml(charter.primaryProblemSolved)}</p></div>` : ''}
      ${charter.centralPromise ? `<div class="summary-card"><h3>Core Transformation Outcome</h3><p>${escapeHtml(charter.centralPromise)}</p></div>` : ''}
    </div>
    ${(beforeItems.length || bridgeItems.length || afterItems.length) ? `<div class="transform-grid">
      <div class="transform-col"><h3>1. Current Friction (Before)</h3><ul>${beforeItems.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>Unclear baseline workflow</li>'}</ul></div>
      <div class="transform-col"><h3>2. Structured Method (Bridge)</h3><ol>${bridgeItems.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>Step-by-step guided chapters</li>'}</ol></div>
      <div class="transform-col"><h3>3. Practical Outcome (After)</h3><ul>${afterItems.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>Repeatable, self-audited execution</li>'}</ul></div>
    </div>` : ''}
    ${(productBible?.signatureFramework || keyTermsEntries.length || introducedConcepts.length) ? `<div class="summary-card"><h3>Core Frameworks &amp; Reference Terminology</h3><ul>${productBible?.signatureFramework ? `<li><strong>Signature Framework:</strong> ${escapeHtml(productBible.signatureFramework)}</li>` : ''}${introducedConcepts.map(concept => `<li>${escapeHtml(concept)}</li>`).join('')}${keyTermsEntries.map(([term, def]) => `<li><strong>${escapeHtml(term)}:</strong> ${escapeHtml(def)}</li>`).join('')}</ul></div>` : ''}
    ${outline.length ? `<h3>At-a-Glance Chapter Takeaways &amp; Action Deliverables</h3><div class="table-scroll"><table><thead><tr><th>Chapter</th><th>Learning Objective</th><th>Practical Deliverable</th><th>Completion Milestone</th></tr></thead><tbody>${outline.map((ch, i) => `<tr><td><a href="#chapter-${i + 1}">Ch. ${escapeHtml(ch.order)}: ${escapeHtml(ch.title)}</a></td><td>${escapeHtml(ch.objective || '—')}</td><td>${escapeHtml(ch.practicalDeliverable || '—')}</td><td>${escapeHtml(ch.completionMilestone || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>` : '';
  return `<!DOCTYPE html><html lang="${/[\u3400-\u9fff]/.test(charter.productTitle) ? 'zh-Hant' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${googleFontFamilies}&display=swap" rel="stylesheet"><style>
:root{--ink:#13252c;--muted:#4f646d;--line:#d1dce0;--paper:#ffffff;--surface:${surfaceHex};--accent:${primaryHex};--secondary:${secondaryHex};--highlight:${accentHighlightHex};--font-display:"${displayFont}",Georgia,serif;--font-body:"${bodyFont}",system-ui,-apple-system,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:92px}body{margin:0;background:#e6ecef;color:var(--ink);font:400 17px/1.8 var(--font-body);-webkit-font-smoothing:antialiased}a{color:var(--accent);text-underline-offset:3px}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--highlight);outline-offset:4px}button,summary{cursor:pointer}h1,h2,h3,h4{line-height:1.22;text-wrap:balance;color:var(--ink)}h1,h2{font-family:var(--font-display)}h1{font-size:clamp(2.2rem,5.5vw,3.9rem);margin:18px 0 16px;letter-spacing:-0.02em}h2{font-size:clamp(1.55rem,3vw,2.15rem);margin:12px 0 24px;letter-spacing:-0.015em}h3{font-size:1.25rem;margin:32px 0 14px;font-family:var(--font-body);font-weight:700}p{margin:0 0 20px}header{position:sticky;top:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:12px 5%;display:flex;gap:16px;justify-content:space-between;align-items:center;z-index:10}header span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:15px}header a{font-size:14px;font-weight:600;text-decoration:none}header a:hover{text-decoration:underline}button{border:0;background:var(--accent);color:#fff;padding:10px 18px;border-radius:8px;font:600 13.5px var(--font-body);white-space:nowrap;transition:background .15s}button:hover{background:var(--secondary)}.book{max-width:1220px;margin:32px auto;background:var(--paper);border-radius:14px;box-shadow:0 18px 50px -24px rgba(15,38,48,0.22);padding:clamp(24px,5.5vw,76px)}.cover{position:relative;padding:44px 40px 48px;background:linear-gradient(135deg,var(--surface) 0%,#ffffff 65%);border:1px solid var(--line);border-top:8px solid var(--accent);border-radius:12px;margin-bottom:36px}.cover-accent{width:64px;height:5px;border-radius:3px;background:var(--highlight);margin:18px 0 10px}.cover-subtitle{font-size:1.2rem;color:var(--muted);max-width:64ch;line-height:1.6;margin-bottom:24px}.cover-promise{background:#ffffff;border:1px solid var(--line);border-radius:10px;padding:18px 22px;margin:20px 0 26px;font-size:15px}.cover-promise strong{color:var(--secondary);display:block;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}.edition,.chapter-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--secondary)}.cover dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px;font-size:14px;padding-top:20px;border-top:1px solid var(--line);margin:0}.cover dt{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}.cover dd{margin:0;font-weight:700;color:var(--ink)}.contents{padding:28px 0 36px}.contents ol{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.contents li{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:12px 16px;font-size:15px;font-weight:600}.contents li a{text-decoration:none;display:block}.contents li a:hover{text-decoration:underline}.executive-summary{padding:36px 0;border-top:1px solid var(--line)}.summary-grid,.transform-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:20px 0}.summary-card,.transform-col{background:var(--surface);padding:20px 22px;border:1px solid var(--line);border-radius:10px}.summary-card h3,.transform-col h3{margin:0 0 10px;font-size:1rem;font-family:var(--font-body);color:var(--accent)}.summary-card p:last-child,.transform-col ul,.transform-col ol{margin-bottom:0;font-size:14.5px}.chapter{border-top:2px solid var(--line);padding-top:48px;margin-top:44px;break-before:page}.objective{font-size:1.12rem;color:var(--muted);max-width:70ch;margin-bottom:24px}.chapter-content{overflow-wrap:anywhere}.chapter-content p{max-width:70ch}.chapter-content h2,.chapter-content h3,.chapter-content h4{font-family:var(--font-body);margin-top:34px;color:var(--accent)}.chapter-content blockquote{margin:24px 0;padding:18px 24px;background:var(--surface);border:1px solid var(--line);border-radius:10px;font-style:normal}.chapter-content pre{overflow:auto;padding:20px;background:#0f222a;color:#e7f3f5;border-radius:10px;white-space:pre-wrap}.chapter-content img{max-width:100%}.chapter-content table{display:block;overflow-x:auto}.citation{font:700 12px var(--font-body);color:var(--secondary);white-space:nowrap}.editorial-note{display:block;color:var(--muted);font:12px/1.5 var(--font-body);margin-top:6px}.source-needed{display:inline-block;background:#fff4de;color:#784416;font:12px/1.5 var(--font-body);padding:2px 8px;margin:4px 6px;border:1px solid #d4ad6b;border-radius:5px}.evidence-note{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 20px;margin:26px 0;font-size:14px}.evidence-note summary{font-weight:700}.evidence-note p{margin:12px 0 0}.data-figure{margin:32px 0;padding:18px;background:var(--surface);border:1px solid var(--line);border-radius:10px;break-inside:avoid;overflow-x:auto}.data-figure svg{display:block;width:100%;min-width:520px;height:auto;margin-bottom:12px}.reading-section{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,.62fr);gap:32px;align-items:start}.reading-section>div,.section-figures{min-width:0}.section-figures{padding-top:12px}.supporting-image{margin:24px 0;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:10px;break-inside:avoid}.supporting-image img{max-width:100%;height:auto;max-height:440px;object-fit:contain;border-radius:6px}.supporting-image small{display:block;margin-top:6px}.section-figures .process{display:grid;grid-template-columns:1fr}.section-figures .process-figure{margin-top:0}.process-figure{margin:28px 0;padding:22px;background:var(--surface);border:1px solid var(--line);border-radius:10px;break-inside:avoid}.process{display:flex;flex-wrap:wrap;gap:12px;list-style:none;padding:0;margin:0 0 12px;counter-reset:step}.process li{counter-increment:step;flex:1 1 160px;background:#ffffff;border:1px solid var(--line);border-radius:8px;padding:14px;font-size:14px;line-height:1.55;overflow-wrap:anywhere}.process li:before{content:counter(step,decimal-leading-zero);display:block;color:var(--highlight);font:700 12px ui-monospace,monospace;margin-bottom:6px}figcaption,caption{font-size:13px;color:var(--muted);text-align:left;line-height:1.6}caption{padding:12px 0}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px;font-variant-numeric:tabular-nums;border:1px solid var(--line);border-radius:8px;overflow:hidden}th,td{text-align:left;vertical-align:top;padding:13px 15px;border:1px solid var(--line);min-width:130px}th{background:var(--surface);color:var(--accent);font-weight:700}td p{margin-bottom:10px}td ol{padding-left:18px}.action{background:linear-gradient(135deg,var(--surface) 0%,#ffffff 100%);border:1px solid var(--line);border-top:4px solid var(--highlight);border-radius:10px;padding:24px;margin:32px 0}.action h3{margin-top:0;color:var(--accent)}.references{margin-top:64px;border-top:2px solid var(--ink);padding-top:32px;break-before:page}.references li{padding:18px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere;scroll-margin-top:90px}.references li:target{background:#fff4de}.references small{display:block;color:var(--muted)}.back-link,footer{font-size:13px}footer{border-top:1px solid var(--line);margin-top:60px;padding-top:20px;color:var(--muted)}@media(max-width:900px){.reading-section{grid-template-columns:1fr;gap:0}.section-figures{padding:0}}@media(max-width:600px){body{font-size:16px}.book{margin:0;border-radius:0}.cover{padding:24px 20px}header{padding:10px 16px}header span{display:none}.process{display:grid;grid-template-columns:1fr}.cover dl{display:grid}h2{font-size:1.6rem}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{.reading-section{display:block}.section-figures .process{display:flex}.supporting-image img{max-height:80mm}@page{margin:18mm}header,.back-link{display:none}body{background:#fff;font-size:11pt}.book{padding:0;margin:0;max-width:none;box-shadow:none}.cover{break-after:page}h2,h3,h4,figcaption{break-after:avoid}p{orphans:3;widows:3}.process-figure{break-inside:auto}.table-scroll{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}a{color:inherit}.references a:after{content:' (' attr(href) ')';font-size:9pt}.source-needed{print-color-adjust:exact}}
</style></head><body><header><span>${studioMark}${title}</span><a href="#contents">Contents</a>${hasSummaryMeta ? '<a href="#executive-summary">Summary</a>' : ''}<a href="#references">References</a><button onclick="window.print()">Print / Save PDF</button></header><main class="book"><section class="cover"><div class="edition">${studioMark}Commercial Edition · ${escapeHtml(brand.profileName || 'Digital Product Studio')}</div><div class="cover-accent" aria-hidden="true"></div><h1>${title}</h1><p class="cover-subtitle">${escapeHtml(charter.subtitle)}</p>${charter.centralPromise ? `<div class="cover-promise"><strong>Core Outcome Promise</strong><span>${escapeHtml(charter.centralPromise)}</span></div>` : ''}<dl><div><dt>Author / Imprint</dt><dd>${escapeHtml(intake.creatorName || brand.profileName || 'Digital Product Studio')}</dd></div><div><dt>Chapters Included</dt><dd>${outline.length}</dd></div><div><dt>Signature Framework</dt><dd>${escapeHtml(charter.signatureFramework || 'Structured Execution System')}</dd></div><div><dt>Reading Format</dt><dd>Linked sources · Print-to-PDF ready</dd></div></dl></section>
${charter.explicitDisclaimers.length ? `<aside class="evidence-note"><h3>Usage notice</h3><ul>${charter.explicitDisclaimers.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul></aside>` : ''}
<nav id="contents" class="contents" aria-label="Table of contents"><h2>Contents</h2><ol>${hasSummaryMeta ? '<li><a href="#executive-summary">Executive Summary &amp; Action Roadmap</a></li>' : ''}${outline.map((ch, i) => `<li><a href="#chapter-${i + 1}">Ch. ${escapeHtml(ch.order)}: ${escapeHtml(ch.title)}</a></li>`).join('')}<li><a href="#references">References &amp; Evidence Index</a></li></ol></nav>${executiveSummaryHtml}${chapterHtml}
<section id="references" class="references"><h2>References</h2><p>Numbered citations link to the source records below. Cited records retain their retrieved text excerpt, locator and bibliography. Each claim must also have a current author support review. A source appearing in this list does not validate an unrelated statement.</p><ol>${refs.map(card => `<li id="reference-${numbers.get(card.id)}" value="${numbers.get(card.id)}">${escapeHtml(card.author || card.publisherOrOrg)}. (${escapeHtml(referenceYear(card))}). <cite>${escapeHtml(card.sourceTitle || card.title)}</cite>. ${card.author ? escapeHtml(card.publisherOrOrg) + '.' : ''} ${card.doi ? `DOI: ${escapeHtml(card.doi)}.` : ''} ${safeUrl(card.sourceURL) ? `<a href="${safeUrl(card.sourceURL)}" rel="noopener noreferrer">${escapeHtml(card.sourceURL)}</a>` : 'Source URL missing or invalid.'}<small>Publication date supplied: ${escapeHtml(card.publicationDate || 'not supplied')} · Retrieved: ${escapeHtml(card.retrievedAt || 'not recorded')} · ${escapeHtml(card.id)} · Retrieval: ${card.retrieval ? escapeHtml(card.retrieval.kind) : 'not retrieved'} · Record status: ${escapeHtml(card.status)}</small><small>${escapeHtml(card.editorialNotes.verificationNotes)}</small>${citedRecords.filter(record=>bibliographicKey(record)===bibliographicKey(card)).map(record=>record.verificationQuote ? `<blockquote>${escapeHtml(record.verificationQuote)}</blockquote><small>[${escapeHtml(record.id)}] Locator: ${escapeHtml(record.verificationLocator)} · Retrieved: ${escapeHtml(record.retrieval?.retrievedAt || 'not retrieved')}</small>` : `<small>[${escapeHtml(record.id)}] No retrieved supporting excerpt.</small>`).join('')}</li>`).join('') || (outline.length > 0 && outline.every(ch => { const audit=auditChapter(ch,cards); return audit.passages > 0 && audit.editorial === audit.passages; }) ? '<li>This document contains author-reviewed original instructions or examples, with no empirical source claims. No sources are cited.</li>' : '<li>No sources cited. Add claim-level citations or review original editorial material before publishing.</li>')}</ol></section><footer>${studioMark}© ${new Date().getFullYear()} ${escapeHtml(intake.creatorName || brand.profileName || 'Digital Product Studio')} · Digital Product Studio</footer></main></body></html>`;
}
