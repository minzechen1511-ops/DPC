import { countManuscriptWords } from './textMetrics.ts';
import type { DigitalProductProject, ReferenceCard } from '../types/project.ts';
import { isCurrentMarketEvidence } from './marketDiscoveryEngine.ts';
import { auditChapter } from './styledBook.ts';
const reviewedSource = (card: ReferenceCard) => card.status === 'VERIFIED_FULL_TEXT' && /^https?:\/\//.test(card.sourceURL) && (card.verificationQuote?.trim().length || 0) >= 20 && Boolean(card.verificationLocator?.trim()) && Boolean(card.verifiedAt);
export type GateKey = 'gateA' | 'gateB' | 'gateC';
export function gateIssues(project: DigitalProductProject, gate: GateKey): string[] {
  const issues: string[] = [];
  const selected = project.marketResearch.topicCandidates.find(c => c.id === project.marketResearch.selectedTopicId);
  if (!selected) issues.push('Select a niche linked to current marketplace evidence.');
  else if (!selected.sourceObservationIds.length || !selected.sourceObservationIds.every(id => {
    const source = project.marketResearch.platformEvidence.find(o => o.id === id);
    return source && isCurrentMarketEvidence(source);
  })) issues.push('Refresh marketplace research: selected evidence is sample, missing, unsupported or older than 48 hours.');
  if (gate === 'gateA') return issues;
  if (!project.workflow.gates.gateA.isApproved) issues.push('Approve Gate A before approving the product strategy.');
  if (!project.charter.productTitle.trim() || !project.charter.targetAudience.trim() || !project.charter.learningObjectives.length) issues.push('Complete the charter title, target audience and learning objectives.');
  if (!project.referenceLibrary.cards.some(reviewedSource)) issues.push('Add a topic-relevant full-text source with a supporting excerpt, exact locator and author verification date.');
  if (gate === 'gateB') return issues;
  if (!project.workflow.gates.gateB.isApproved || !project.charter.isApproved) issues.push('Approve Gate B before the final quality review.');
  if (!project.outline.length) issues.push('Create the manuscript chapters.');
  for (const chapter of project.outline) {
    const count = countManuscriptWords(chapter.contentMarkdown || '');
    if (!chapter.isCompleted || count < Math.max(100, Math.floor(chapter.targetWordCount / 2))) issues.push(`${chapter.title}: finish a substantive manuscript (at least half the target length).`);
    const audit = auditChapter(chapter, project.referenceLibrary.cards);
    if (!audit.passages || audit.needsReview || audit.unresolvedIds.length) issues.push(`${chapter.title}: resolve missing or unverified paragraph and table citations.`);
    const citedIds = [...(chapter.contentMarkdown || '').matchAll(/\[(REF-[\w-]+(?:\s*[,;]\s*REF-[\w-]+)*)\]/g)].flatMap(match => match[1].split(/\s*[,;]\s*/));
    if (citedIds.some(id => !project.referenceLibrary.cards.some(card => card.id === id && reviewedSource(card)))) issues.push(`${chapter.title}: retain an exact supporting excerpt and locator for every cited source.`);
    for (const image of chapter.illustrations || []) if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image.dataUri) || !image.alt || !image.caption || !image.credit || !image.license || !image.paragraphAnchor || !(chapter.contentMarkdown || '').includes(image.paragraphAnchor) || !image.sourceReferenceIds.length || image.sourceReferenceIds.some(id => !project.referenceLibrary.cards.some(card => card.id === id && reviewedSource(card)))) issues.push(`${chapter.title}: review picture rights, source, description and paragraph placement.`);
    if (/\[SOURCE NEEDED\]|draft generation in progress|TODO|placeholder/i.test(chapter.contentMarkdown || '')) issues.push(`${chapter.title}: resolve draft placeholders.`);
    if (!chapter.mappedReferenceIds.length || chapter.mappedReferenceIds.some(id => !project.referenceLibrary.cards.some(c => c.id === id && reviewedSource(c)))) issues.push(`${chapter.title}: map verified topic sources.`);
  }
  if (!project.resources.some(r => r.contentMarkdown.trim().length > 150 && r.instructions.trim())) issues.push('Include at least one substantive, usable companion resource.');
  return [...new Set(issues)];
}
export function revokeApprovals(project: DigitalProductProject, from: GateKey): DigitalProductProject {
  const next = { ...project, updatedAt: new Date().toISOString(), workflow: { ...project.workflow, gates: { ...project.workflow.gates }, stageStatuses: { ...project.workflow.stageStatuses, quality_assurance: 'NEEDS_REVIEW' as const, export_center: 'BLOCKED' as const } } };
  const order: GateKey[] = ['gateA', 'gateB', 'gateC'];
  for (const key of order.slice(order.indexOf(from))) next.workflow.gates[key] = { ...next.workflow.gates[key], isApproved: false, approvedAt: undefined };
  if (from !== 'gateC') next.charter = { ...project.charter, isApproved: false, approvedAt: undefined };
  return next;
}
export function approveGate(project: DigitalProductProject, gate: GateKey): DigitalProductProject {
  if (gateIssues(project, gate).length) return project;
  return { ...project, charter: gate === 'gateB' ? { ...project.charter, isApproved: true, approvedAt: new Date().toISOString() } : project.charter, workflow: { ...project.workflow, gates: { ...project.workflow.gates, [gate]: { ...project.workflow.gates[gate], isApproved: true, approvedAt: new Date().toISOString() } }, stageStatuses: { ...project.workflow.stageStatuses, [gate === 'gateA' ? 'topic_selection' : gate === 'gateB' ? 'product_charter' : 'quality_assurance']: 'COMPLETED', export_center: gate === 'gateC' ? 'READY' : 'BLOCKED' } } };
}
