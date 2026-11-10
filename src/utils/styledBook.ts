import { Marked, type Tokens } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { ChapterOutlineItem, DigitalProductProject, ReferenceCard } from '../types/project.ts';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const safeUrl = (value: string) => /^https?:\/\//i.test(value) ? escapeHtml(value) : '';
const citationPattern = /\[(REF-[\w-]+(?:\s*[,;]\s*REF-[\w-]+)*)\]/g;
const idsIn = (text: string) => [...text.replace(/`+[^`]*`+/g, '').replace(/<!--[\s\S]*?-->/g, '').matchAll(citationPattern)].flatMap(m => m[1].split(/\s*[,;]\s*/));
const isVerified = (card?: ReferenceCard) => card?.status === 'VERIFIED_FULL_TEXT' && Boolean(safeUrl(card.sourceURL));

export interface EvidenceAudit { passages: number; cited: number; needsReview: number; unresolvedIds: string[] }
export function auditChapter(chapter: ChapterOutlineItem, cards: ReferenceCard[]): EvidenceAudit {
  const audit: EvidenceAudit = { passages: 0, cited: 0, needsReview: 0, unresolvedIds: [] };
  const parser = new Marked();
  parser.walkTokens(parser.lexer(chapter.contentMarkdown || ''), token => {
    if (token.type === 'table') {
      for (const row of (token as Tokens.Table).rows) {
        const ids = idsIn(row.map(cell => cell.text).join(' '));
        audit.passages++;
        const unknown = ids.filter(id => !cards.some(c => c.id === id));
        audit.unresolvedIds.push(...unknown);
        if (ids.length && !unknown.length && ids.every(id => isVerified(cards.find(c => c.id === id)))) audit.cited++;
        else audit.needsReview++;
      }
    }
    if (token.type !== 'paragraph' && !(token.type === 'list_item' && !(token as Tokens.ListItem).tokens.some(t => t.type === 'list'))) return;
    if (!token.raw.trim()) return;
    audit.passages++;
    const ids = idsIn(token.raw);
    const unresolved = ids.filter(id => !cards.some(c => c.id === id));
    audit.unresolvedIds.push(...unresolved);
    if (!token.raw.includes('[SOURCE NEEDED]') && ids.length && !unresolved.length && ids.every(id => isVerified(cards.find(c => c.id === id)))) audit.cited++;
    else audit.needsReview++;
  });
  audit.unresolvedIds = [...new Set(audit.unresolvedIds)];
  return audit;
}

export function compileStyledHtml(project: DigitalProductProject): string {
  const { charter, brand, intake, outline } = project;
  const cards = project.referenceLibrary.cards;
  const used = new Set<string>();
  const numbers = new Map<string, number>();
  const cite = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return `<span class="source-needed">Unknown source: ${escapeHtml(id)}</span>`;
    if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
    used.add(id);
    return `<a class="citation" href="#reference-${numbers.get(id)}" aria-label="Reference ${numbers.get(id)}: ${escapeHtml(card.sourceTitle)}">[${numbers.get(id)}]</a>${isVerified(card) ? '' : '<span class="source-needed">Source review needed</span>'}`;
  };
  const review = (raw: string) => {
    const ids = idsIn(raw);
    return ids.length || raw.includes('[SOURCE NEEDED]') ? '' : '<small class="source-needed">Citation needed · review this passage</small>';
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
      html: ({ text }) => escapeHtml(text),
      paragraph({ tokens, raw }) { return `<p>${this.parser.parseInline(tokens)}${review(raw)}</p>\n`; },
      listitem({ tokens, raw }) { return `<li>${this.parser.parse(tokens)}${review(raw)}</li>\n`; },
      heading({ depth, tokens }) { return `<h${Math.min(depth + 1, 6)}>${this.parser.parseInline(tokens)}</h${Math.min(depth + 1, 6)}>\n`; },
    },
  });
  const renderTokens = (tokens: ReturnType<typeof parser.lexer>) => sanitizeHtml(parser.parser(tokens), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'sup', 'small', 'span'],
    allowedAttributes: { a: ['href', 'title', 'class', 'aria-label'], span: ['class'], small: ['class'], th: ['align'], td: ['align'] },
    allowedSchemes: ['https', 'http', 'mailto'],
  });
  const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#]/g, '').trim();
  const diagram = (steps: string[], caption: string, label: string) => `<figure class="process-figure" aria-label="${escapeHtml(label)}"><ol class="process">${steps.filter(Boolean).map(step => `<li>${escapeHtml(plain(step))}</li>`).join('')}</ol><figcaption>${caption}</figcaption></figure>`;
  const sections = (chapter: ChapterOutlineItem) => {
    let figure = 0;
    const groups: ReturnType<typeof parser.lexer>[] = [];
    const chapterTokens = parser.lexer(chapter.contentMarkdown || '');
    for (const token of chapterTokens) {
      if (!groups.length || token.type === 'heading') groups.push(Object.assign([], { links: chapterTokens.links }));
      groups[groups.length - 1].push(token);
    }
    return groups.map(tokens => {
      const heading = tokens.find(t => t.type === 'heading') as Tokens.Heading | undefined;
      const list = tokens.find(t => t.type === 'list') as Tokens.List | undefined;
      const points = list?.items.map(t => plain(t.text.replace(citationPattern, '')).slice(0, 220)).filter(Boolean).slice(0, 5);
      const rendered = renderTokens(tokens);
      const charts = tokens.filter(t => t.type === 'table').map(token => {
        const table = token as Tokens.Table;
        // Chart only explicitly cited numeric data. Keep the original accessible table alongside it.
        const ids = [...new Set(idsIn(table.raw))];
        if (!ids.length || !ids.every(id => isVerified(cards.find(c => c.id === id))) || table.rows.length < 2 || table.rows.length > 12) return '';
        if (!table.rows.every(row => idsIn(row.map(cell => cell.text).join(' ')).length > 0)) return '';
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
      return rendered + charts + (heading && points && points.length > 1 ? diagram(points, `Figure ${chapter.order}.${++figure}. ${escapeHtml(plain(heading.text))} — conceptual summary of this section; not measured data. ${[...new Set(idsIn(list?.raw || ''))].map(cite).join(' ')}`, plain(heading.text)) : '');
    }).join('');
  };
  const chapterHtml = outline.map((ch, index) => {
    const audit = auditChapter(ch, cards);
    const mapped = cards.filter(c => ch.mappedReferenceIds.includes(c.id));
    const unknownMapped = ch.mappedReferenceIds.filter(id => !cards.some(card => card.id === id));
    const content = sections(ch);
    return `<section class="chapter" id="chapter-${index + 1}"><div class="chapter-label">Chapter ${escapeHtml(ch.order)}</div><h2>${escapeHtml(ch.title)}</h2>
      ${ch.objective ? `<p class="objective">${escapeHtml(ch.objective)}</p>` : ''}
      <details class="evidence-note" ${audit.needsReview || unknownMapped.length ? 'open' : ''}><summary>Evidence review: ${audit.cited} / ${audit.passages} passages have citations to full-text source records</summary><p>Source status comes from the project library, not an independent fact check. Check that each cited source supports the adjacent claim. ${audit.needsReview} passages need citation or source review. ${audit.unresolvedIds.length || unknownMapped.length ? `Unresolved IDs: ${escapeHtml([...audit.unresolvedIds, ...unknownMapped].join(', '))}.` : ''}</p></details>
      <div class="chapter-content">${content || '<p>Manuscript not yet written.</p>'}</div>
      ${diagram([ch.objective, ...ch.subtopics, ch.practicalDeliverable].filter(Boolean), `Figure ${escapeHtml(ch.order)}. Overview — chapter plan and intended outcome. Editorial concept diagram; not evidence of effectiveness.`, `Chapter ${ch.order} overview`)}
      ${mapped.length ? `<section class="evidence-table"><h3>Supporting source notes</h3><p>These chapter mappings provide research context; they do not automatically substantiate uncited manuscript passages.</p><div class="table-scroll"><table><caption>Source claims and practical frameworks recorded in the project library</caption><thead><tr><th>Source</th><th>Recorded supporting points</th><th>Practical framework</th></tr></thead><tbody>${mapped.map(card => `<tr><td>${escapeHtml(card.sourceTitle)} ${cite(card.id)}</td><td>${card.supportedClaims.map(claim => `<p>${escapeHtml(claim)} ${cite(card.id)}</p>`).join('') || 'No supporting claims recorded.'}</td><td>${escapeHtml(card.practicalFramework.name)}<ol>${card.practicalFramework.actionSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><small>${escapeHtml(card.practicalFramework.editorialOrigin)}</small></td></tr>`).join('')}</tbody></table></div></section>` : '<p class="source-needed">No supporting sources mapped to this chapter.</p>'}
      ${ch.practicalDeliverable ? `<aside class="action"><h3>Apply this chapter</h3><p>${escapeHtml(ch.practicalDeliverable)}</p><p>Completion goal: ${escapeHtml(ch.completionMilestone || 'Review the result against the chapter objective.')}</p></aside>` : ''}
      <a class="back-link" href="#contents">Back to contents ↑</a></section>`;
  }).join('');
  const refs = cards.filter(c => used.has(c.id)).sort((a, b) => numbers.get(a.id)! - numbers.get(b.id)!);
  const color = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const title = escapeHtml(charter.productTitle || intake.projectName || 'Digital Product');
  return `<!DOCTYPE html><html lang="${/[\u3400-\u9fff]/.test(charter.productTitle) ? 'zh-Hant' : 'en'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>
:root{--ink:#173039;--muted:#50636c;--line:#cbd6d7;--paper:#fff;--surface:#f2f6f5;--accent:${color(brand.primaryHex, '#14685f')}}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;background:#e9efed;color:var(--ink);font:17px/1.8 system-ui,sans-serif}a{color:var(--accent);text-underline-offset:3px}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #b45a20;outline-offset:4px}button,summary{cursor:pointer}h1,h2,h3,h4{line-height:1.25;text-wrap:balance}h1,h2{font-family:Georgia,serif}h1{font-size:clamp(2.1rem,6vw,3.8rem);margin:28px 0}h2{font-size:2rem;margin:12px 0 28px}h3{font-size:1.3rem;margin:36px 0 16px}p{margin:0 0 22px}header{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);padding:12px 5%;display:flex;gap:16px;justify-content:space-between;align-items:center;z-index:2}header span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}button{border:0;background:#173f43;color:#fff;padding:12px 18px;border-radius:5px;white-space:nowrap}button:hover{background:#245b60}.book{max-width:1000px;margin:36px auto;background:var(--paper);padding:clamp(22px,6vw,80px)}.cover{padding:36px 0 56px;border-bottom:2px solid var(--ink)}.cover p{color:var(--muted)}.edition,.chapter-label{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}.cover dl{display:flex;flex-wrap:wrap;gap:24px;font-size:14px}.cover dt{color:var(--muted)}.cover dd{margin:0;font-weight:600}.contents{padding:36px 0}.contents ol{padding-left:24px}.contents li{padding:7px 0;border-bottom:1px solid var(--line)}.chapter{border-top:1px solid var(--line);padding-top:48px;margin-top:40px;break-before:page}.objective{font-size:1.15rem;color:var(--muted)}.chapter-content{overflow-wrap:anywhere}.chapter-content p{max-width:72ch}.chapter-content h2,.chapter-content h3,.chapter-content h4{font-family:system-ui,sans-serif;margin-top:36px}.chapter-content blockquote{margin:24px 0;padding:16px 24px;background:var(--surface)}.chapter-content pre{overflow:auto;padding:20px;background:var(--surface);white-space:pre-wrap}.chapter-content img{max-width:100%}.chapter-content table{display:block;overflow-x:auto}.citation{font:600 12px system-ui,sans-serif;white-space:nowrap}.source-needed{display:inline-block;background:#fff4de;color:#784416;font:12px/1.5 system-ui,sans-serif;padding:2px 6px;margin:4px 6px;border:1px solid #d4ad6b;border-radius:3px}.evidence-note{background:var(--surface);padding:16px 20px;margin:28px 0;font-size:14px}.evidence-note summary{font-weight:600}.evidence-note p{margin:12px 0 0}.data-figure{margin:32px 0;break-inside:avoid}.data-figure svg{display:block;width:100%;height:auto;margin-bottom:12px}.process-figure{margin:32px 0;padding:24px 0;border-block:1px solid var(--line);break-inside:avoid}.process{display:flex;flex-wrap:wrap;gap:12px;list-style:none;padding:0;counter-reset:step}.process li{counter-increment:step;flex:1 1 160px;background:var(--surface);padding:16px;font-size:14px;line-height:1.6;overflow-wrap:anywhere}.process li:before{content:counter(step,decimal-leading-zero);display:block;color:var(--accent);font:600 12px ui-monospace,monospace;margin-bottom:8px}figcaption,caption{font-size:13px;color:var(--muted);text-align:left;line-height:1.6}caption{padding:12px 0}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:14px;border:1px solid var(--line);min-width:140px}th{background:var(--surface)}td p{margin-bottom:12px}td ol{padding-left:18px}.action{background:var(--surface);padding:24px;margin:32px 0}.action h3{margin-top:0}.references{margin-top:64px;border-top:2px solid var(--ink);padding-top:32px;break-before:page}.references li{padding:18px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere;scroll-margin-top:90px}.references li:target{background:#fff4de}.references small{display:block;color:var(--muted)}.back-link,footer{font-size:13px}footer{border-top:1px solid var(--line);margin-top:60px;padding-top:20px;color:var(--muted)}@media(max-width:600px){body{font-size:16px}.book{margin:0}header{padding:10px 16px}header span{display:none}.process{display:grid;grid-template-columns:1fr}.cover dl{display:grid}h2{font-size:1.65rem}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{@page{margin:18mm}header,.back-link{display:none}body{background:#fff;font-size:11pt}.book{padding:0;margin:0;max-width:none}.cover{break-after:page}h2,h3,h4,figcaption{break-after:avoid}p{orphans:3;widows:3}.process-figure{break-inside:auto}.table-scroll{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}a{color:inherit}.references a:after{content:' (' attr(href) ')';font-size:9pt}.source-needed{print-color-adjust:exact}}
</style></head><body><header><span>${title}</span><a href="#contents">Contents</a><a href="#references">References</a><button onclick="window.print()">Print / Save PDF</button></header><main class="book"><section class="cover"><div class="edition">Executive E-Book · Research edition</div><h1>${title}</h1><p>${escapeHtml(charter.subtitle)}</p><dl><div><dt>Author / publisher</dt><dd>${escapeHtml(intake.creatorName || brand.profileName || 'Digital Product Studio')}</dd></div><div><dt>Chapters</dt><dd>${outline.length}</dd></div><div><dt>Reading format</dt><dd>Linked sources · Printable figures</dd></div></dl></section>
${charter.explicitDisclaimers.length ? `<aside class="evidence-note"><h3>Usage notice</h3><ul>${charter.explicitDisclaimers.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul></aside>` : ''}
<nav id="contents" class="contents" aria-label="Table of contents"><h2>Contents</h2><ol>${outline.map((ch, i) => `<li><a href="#chapter-${i + 1}">${escapeHtml(ch.title)}</a></li>`).join('')}<li><a href="#references">References</a></li></ol></nav>${chapterHtml}
<section id="references" class="references"><h2>References</h2><p>Numbered citations link to the source records below. Verification labels describe saved library metadata; verify source text and claim relevance before publication.</p><ol>${refs.map(card => `<li id="reference-${numbers.get(card.id)}" value="${numbers.get(card.id)}">${escapeHtml(card.author || card.publisherOrOrg)}. ${card.publicationDate ? `(${escapeHtml(card.publicationDate)}).` : '(n.d.).'} <cite>${escapeHtml(card.sourceTitle || card.title)}</cite>. ${card.author ? escapeHtml(card.publisherOrOrg) + '.' : ''} ${safeUrl(card.sourceURL) ? `<a href="${safeUrl(card.sourceURL)}" rel="noopener noreferrer">${escapeHtml(card.sourceURL)}</a>` : 'Source URL missing or invalid.'}<small>Retrieved: ${escapeHtml(card.retrievedAt || 'not recorded')} · ${escapeHtml(card.id)} · Library status: ${escapeHtml(card.status)}</small><small>${escapeHtml(card.editorialNotes.verificationNotes)}</small></li>`).join('') || '<li>No sources cited. Add claim-level citations before publishing.</li>'}</ol></section><footer>© ${new Date().getFullYear()} ${escapeHtml(intake.creatorName || brand.profileName || 'Digital Product Studio')} · Digital Product Creator</footer></main></body></html>`;
}
