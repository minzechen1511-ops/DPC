import type { DigitalProductProject, StageId } from '../types/project.ts';
import { gateIssues } from './gatePolicy.ts';
import { isGateAQualifiedEvidence, propagateTopicToDownstream } from './marketDiscoveryEngine.ts';

export const GATE_A_STEPS = ['market_research', 'topic_selection', 'project_brief', 'uvz', 'transformation_map'] as const;
export type GateAJourneyStage = typeof GATE_A_STEPS[number];
export const GUIDED_GENERATION_AVAILABLE = false; // Job routes store metadata; no generation executor exists.

export function generationError(error: unknown, lang: 'en' | 'zh') {
  const message = error instanceof Error ? error.message : '';
  if (!message || /json|unexpected token|fetch|network|response/i.test(message)) return lang === 'en'
    ? 'The AI service did not return a usable response. Check AI settings and your connection, then retry.'
    : 'AI 服務未傳回可用回應。請檢查 AI 設定與連線，再重試。';
  return message;
}

export function gateAApproved(project: DigitalProductProject) {
  return project.workflow.gates.gateA.isApproved && gateIssues(project, 'gateA').length === 0;
}
export function selectedPositioning(project: DigitalProductProject) {
  return project.uvz.positioningOptions.find(option => option.id === project.uvz.selectedOptionId);
}
export function usableBrief(project: DigitalProductProject) {
  return [project.intake.targetAudience, project.intake.problemsSolved, project.intake.productIdea,
    project.intake.desiredTransformation].every(value => Boolean(value?.trim()));
}
export function usableMap(project: DigitalProductProject) {
  const map = project.transformationMap;
  return Boolean(map.beforeState.currentPains.length && map.bridgeProcess.keyMilestones.length &&
    map.afterState.tangibleOutcomes.length && map.titleOptions.some(title => title.id === map.selectedTitleId));
}
export function gateAJourney(project: DigitalProductProject) {
  const approved = gateAApproved(project);
  const done = [project.marketResearch.platformEvidence.some(observation => isGateAQualifiedEvidence(observation)), approved,
    approved && usableBrief(project) && project.workflow.stageStatuses.project_brief === 'COMPLETED',
    approved && Boolean(selectedPositioning(project)) && project.workflow.stageStatuses.uvz === 'COMPLETED',
    approved && usableMap(project) && project.workflow.stageStatuses.transformation_map === 'COMPLETED'];
  const available = [true, done[0], approved, approved && done[2], approved && done[3]];
  const next = GATE_A_STEPS.find((_, index) => !done[index]) || 'reference_library';
  return {done, available, next: next as StageId};
}

/** Prefill only the immediate brief/charter handoff; selecting a topic must not
 * replace existing manuscript, references, resources or downstream project work. */
export function selectJourneyTopic(project: DigitalProductProject, topicId: string, lang: 'en' | 'zh', audienceId?: string) {
  if (!project.marketResearch.topicCandidates.some(topic => topic.id === topicId)) return project;
  const suggested = propagateTopicToDownstream(project, topicId, lang, audienceId);
  return {...project, marketResearch: {...project.marketResearch, ...suggested.marketResearch},
    intake: suggested.intake,
    charter: {...project.charter, productTitle: suggested.charter.productTitle, subtitle: suggested.charter.subtitle,
      targetAudience: suggested.charter.targetAudience, primaryProblemSolved: suggested.charter.primaryProblemSolved,
      centralPromise: suggested.charter.centralPromise},
    workflow: {...project.workflow, stageStatuses: {...project.workflow.stageStatuses,
      topic_selection: 'NEEDS_REVIEW' as const, project_brief: 'READY' as const,
      uvz: 'NEEDS_REVIEW' as const, transformation_map: 'NEEDS_REVIEW' as const}}};
}
