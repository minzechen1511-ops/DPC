import test from 'node:test';
import assert from 'node:assert/strict';
import { compileStyledHtml, auditChapter } from './styledBook.ts';
import { DEMO_PROJECT } from '../data/demoProject.ts';

function projectWith(content: string) {
  const project = structuredClone(DEMO_PROJECT);
  project.outline = [{ ...project.outline[0], mappedReferenceIds: ['REF-01'], contentMarkdown: content }];
  return project;
}

test('renders Markdown headings, emphasis, lists, tables and quotes without literal heading markers', () => {
  const html = compileStyledHtml(projectWith('### Main point\n\n**Strong** and *emphasis*. [REF-01]\n\n- Inspect\n- Review\n\n> A quotation. [REF-01]\n\n| Item | Value |\n|---|---|\n| A | 2 |'));
  assert.match(html, /<h4>Main point<\/h4>/);
  assert.match(html, /<strong>Strong<\/strong>/);
  assert.match(html, /<em>emphasis<\/em>/);
  assert.match(html, /<blockquote>/);
  assert.ok(!html.includes('### Main point'));
  assert.match(html, /conceptual summary of this section/);
  assert.match(html, /<th>Item<\/th>/);
});

test('links inline citations to bottom references and reports unresolved IDs and uncited passages', () => {
  const project = projectWith('Supported passage. [REF-01]\n\nUncited claim.\n\nUnknown. [REF-999]');
  const audit = auditChapter(project.outline[0], project.referenceLibrary.cards);
  assert.equal(audit.passages, 3);
  assert.equal(audit.cited, 1);
  assert.equal(audit.needsReview, 2);
  assert.deepEqual(audit.unresolvedIds, ['REF-999']);
  const html = compileStyledHtml(project);
  assert.match(html, /href="#reference-1"/);
  assert.match(html, /id="reference-1"/);
  assert.ok(html.indexOf('id="references"') > html.indexOf('class="chapter-content"'));
  assert.match(html, /Citation needed/);
  assert.match(html, /Unknown source: REF-999/);
  assert.ok(!html.includes('100% Field-Verified'));
});

test('does not treat partial, blocked, or URL-less source records as verified', () => {
  const project = projectWith('Claim. [REF-01]');
  for (const status of ['METADATA_ONLY', 'VERIFIED_PARTIAL_TEXT', 'RETRIEVAL_BLOCKED'] as const) {
    project.referenceLibrary.cards[0].status = status;
    assert.equal(auditChapter(project.outline[0], project.referenceLibrary.cards).cited, 0);
    assert.match(compileStyledHtml(project), /Source review needed/);
  }
  project.referenceLibrary.cards[0].status = 'VERIFIED_FULL_TEXT';
  project.referenceLibrary.cards[0].sourceURL = 'javascript:alert(1)';
  assert.equal(auditChapter(project.outline[0], project.referenceLibrary.cards).cited, 0);
});

test('escapes manuscript HTML and metadata and blocks unsafe links', () => {
  const project = projectWith('<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>');
  project.charter.productTitle = '<img src=x onerror=alert(2)>';
  project.brand.primaryHex = 'red;}body{display:none';
  const html = compileStyledHtml(project);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('body{display:none'));
  assert.match(html, /&lt;script&gt;/);
});

test('numeric charts preserve cited table values and reject uncited or incompatible units', () => {
  const table = '## Results\n\n| Group | Cost ($) |\n|---|---|\n| A [REF-01] | 10 |\n| B [REF-01] | 20 |';
  const html = compileStyledHtml(projectWith(table));
  assert.match(html, /class="data-figure"/);
  assert.match(html, /Values transcribed from the adjacent manuscript table/);
  assert.match(html, />10<\/text>/);
  assert.match(html, />20<\/text>/);
  assert.ok(!compileStyledHtml(projectWith(table.replaceAll('[REF-01]', ''))).includes('class="data-figure"'));
  assert.ok(!compileStyledHtml(projectWith(table.replace('| 20 |', '| 20% |'))).includes('class="data-figure"'));
});

test('keeps heading markers inside code as code without making conceptual figures', () => {
  const html = compileStyledHtml(projectWith('```markdown\n### Code example\n- one\n- two\n```'));
  assert.match(html, /<pre><code/);
  assert.ok(!html.includes('<h4>Code example'));
  assert.ok(!html.includes('conceptual summary of this section'));
});

test('preserves Markdown reference links across section boundaries and ignores citation examples in code', () => {
  const project = projectWith('## Introduction\n\n[Official source][source]. [REF-01]\n\n## More\n\nUse `[REF-01]` as syntax.\n\n[source]: https://example.com/research');
  assert.match(compileStyledHtml(project), /href="https:\/\/example.com\/research"/);
  assert.equal(auditChapter(project.outline[0], project.referenceLibrary.cards).needsReview, 1);
});

test('a cited nested bullet cannot hide an uncited parent claim', () => {
  const project=projectWith('- An uncited parent claim\n  - Supported child. [REF-01]');
  const audit=auditChapter(project.outline[0],project.referenceLibrary.cards);
  assert.equal(audit.needsReview,1);
  assert.match(compileStyledHtml(project),/Citation needed/);
});
