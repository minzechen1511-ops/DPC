# Manual workflow and source support

Digital Product Studio has no Autopilot action or automatic gate approval. The UI offers one stage at a time. Legacy project fields are accepted for compatibility, but restored preferences are normalized to manual review.

## Gate B research

1. Select a niche and approve Gate A explicitly.
2. Define chapter titles, objectives and subtopics. Outline Builder has an explicit chapter-plan editor.
3. Open **Reference Research (Gate B)** and enter a focused research question. Crossref and Europe PMC return actual bibliographic records. Provider errors and empty results stay visible; no replacement references are generated.
4. Treat titles, abstracts, DOI metadata and keyword matches as discovery information, not validated support. Retraction-related search records cannot be selected for evidence retrieval.
5. Retrieve accessible article text through Europe PMC, or a supported public government, university or research HTML page. The server retains the original title, authors, publisher, supplied publication date, DOI where present, exact paragraph and locator, retrieval time and normalized retrieved-text SHA-256. Article IDs are checked. Redirects, inaccessible pages, unsupported full text and PDFs remain unresolved; nothing is invented to fill the gap.
6. Select an exact source paragraph, keep bibliographic metadata as retrieved, write your own summary and supported claim, select the relevant chapters, and explain why the excerpt is relevant to those objectives. A checkbox without retrieved text does not validate a source. Each chapter needs a current relevance mapping before Gate B approval.
7. Approve Gate B deliberately. The server checks the server-retrieved source text (cached for up to ten minutes) and compares document identity, bibliography, retained excerpt and normalized text snapshot hash; client flags alone cannot pass this check. Then draft chapters using only the permitted retrieved excerpts. A changed chapter objective requires a new relevance review.

Research hosts are `api.crossref.org`, `www.ebi.ac.uk` and `europepmc.org`, plus the specific government, university or supported research host the author chooses. Retain inherited proxy and TLS trust settings. This cloud environment currently denies outbound research access, so live sources could not be validated here; network settings must allow the required destinations before live retrieval can succeed. The configured cloud proxy enforces destination access. Direct local requests validate DNS answers at connection time to refuse private/reserved addresses. Search terms are limited, text retrieval is bounded and requests time out.

## Passage support review

In Content Studio, save the draft and open **Review claim-to-source support**. Compare every factual paragraph, list item, table row and figure caption with the exact retrieved excerpt. Review each source cited in that passage. Choose support, qualified support or unsupported, and explain the decision. If a paragraph combines unrelated factual claims, split it or cite and review the required sources beside those claims.

An original exercise or instruction containing no empirical claim can receive an explicit editorial classification and rationale. This is not a replacement for missing factual evidence. There is no bulk automatic approval.

Saved support decisions bind the exact passage, section context, source identity, bibliography and retained excerpt. A changed statement, table value/header, source quotation or bibliography invalidates its old decision. The companion-resource editor uses the same review for purpose, instructions, content and completion criteria.

Retrieval proves that text was obtained and its identity retained. Relevance and entailment still require the author's judgment; these checks do not independently certify scientific conclusions, peer-review quality or the absence of future corrections.

## Export behavior

- Inline numbered citations link to a bibliography of works actually cited in the manuscript, not every chapter mapping. Different excerpt records from the same DOI/publication URL share a bibliography number.
- Author names, dates and DOI come from retrieved metadata; missing dates stay `n.d.`. Original publication dates and retrieval details remain available in the source record.
- Unsupported or stale claim reviews remain visibly marked in the HTML. Quantitative charts require reviewed, cited data rows. Reference research notes are clearly separate from claim evidence.
- Companion HTML uses the same citation renderer and bibliography as the book.
- `research/claim-evidence-matrix.html` and `.json` connect each passage to the source excerpt, locator, metadata and author's support rationale. The publication report covers both chapters and companions.
- Gate C approval and buyer-bundle download also check the source records against retrieved text. A buyer bundle requires a current matching source-check report, which is retained in the publication-review JSON. Unavailable or changed sources block buyer status and remain downloadable only as author-review work.
- An incomplete project remains an author-review bundle; presence of source records or citation markers alone cannot produce a reviewed buyer bundle. Legacy sample reference records must be researched and reviewed again.

Validation: `npm test`, `npm run lint`, `npm run build`. Tests use clearly synthetic fixtures for retrieval and review success, and separately verify that source-access failures do not generate replacements.
