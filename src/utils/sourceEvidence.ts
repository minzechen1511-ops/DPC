import type { ReferenceCard, ChapterOutlineItem } from '../types/project.ts';
export const normalizeEvidenceText = (value: unknown) => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
export function isAllowedResearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false;
    const host = url.hostname.toLowerCase();
    return /\.(gov|edu)$/.test(host) || host.endsWith('.ac.uk') || ['europepmc.org','www.ebi.ac.uk','www.who.int','www.oecd.org','openstax.org','www.worldbank.org','www.imf.org','www.fao.org'].includes(host);
  } catch { return false; }
}
export function isRetrievedSource(card?: ReferenceCard): boolean {
  if (!card || card.status !== 'VERIFIED_FULL_TEXT' || !card.retrieval || !card.verifiedAt) return false;
  const evidence = card.retrieval;
  if (['sourceTitle','publisherOrOrg','sourceURL','verificationQuote','verificationLocator'].some(key => typeof (card as unknown as Record<string,unknown>)[key] !== 'string')) return false;
  if ((card.doi !== undefined && typeof card.doi !== 'string') || (card.publicationDate !== undefined && typeof card.publicationDate !== 'string') || (evidence.doi !== undefined && typeof evidence.doi !== 'string')) return false;
  if (!Array.isArray(evidence.authors) || !evidence.authors.every(author => typeof author === 'string') || typeof evidence.publisher !== 'string' || !Number.isFinite(Date.parse(card.verifiedAt))) return false;
  if (!/^[a-f0-9]{64}$/.test(evidence.contentHash) || !Number.isFinite(Date.parse(evidence.retrievedAt)) || Date.parse(evidence.retrievedAt) > Date.now() + 300_000) return false;
  if (!['full_text','page_text'].includes(evidence.kind) || !['Europe PMC','Trusted public page'].includes(evidence.provider)) return false;
  if (!isAllowedResearchUrl(evidence.canonicalUrl) || card.sourceURL !== evidence.canonicalUrl) return false;
  if (evidence.provider === 'Europe PMC' && (!/^PMC\d+$/.test(evidence.documentId) || evidence.canonicalUrl !== `https://europepmc.org/articles/${evidence.documentId}`)) return false;
  return normalizeEvidenceText(card.author || '') === normalizeEvidenceText(evidence.authors.join(', ')) && normalizeEvidenceText(card.publisherOrOrg) === normalizeEvidenceText(evidence.publisher) && (card.publicationDate || '') === (evidence.publicationDate || '') && (card.doi || '').toLowerCase() === (evidence.doi || '').toLowerCase() && normalizeEvidenceText(card.sourceTitle) === normalizeEvidenceText(evidence.title) &&
    normalizeEvidenceText(card.verificationQuote || '').length >= 40 &&
    normalizeEvidenceText(evidence.excerpt).includes(normalizeEvidenceText(card.verificationQuote || '')) &&
    Boolean(evidence.locator) && card.verificationLocator === evidence.locator;
}
/** Exact identity snapshot: any bibliography, excerpt or retrieval change invalidates old support reviews. */
export function sourceFingerprint(card: ReferenceCard): string {
  return JSON.stringify([card.id,card.sourceTitle,card.author,card.publisherOrOrg,card.publicationDate,card.doi,card.sourceURL,card.status,card.verificationQuote,card.verificationLocator,card.retrieval,card.verifiedAt]);
}

export const chapterResearchFingerprint = (chapter: ChapterOutlineItem) => JSON.stringify([chapter.id, chapter.title, chapter.objective, chapter.subtopics]);

export const bibliographicKey = (card: ReferenceCard): string => typeof card.doi === 'string' && card.doi.trim() ? `doi:${card.doi.toLowerCase().trim()}` : card.sourceURL ? `url:${card.sourceURL}` : `record:${card.id}`;

export const referenceYear = (card: ReferenceCard): string => String(card.publicationDate || '').match(/\b\d{4}\b/)?.[0] || 'n.d.';
