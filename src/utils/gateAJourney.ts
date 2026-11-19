import type { DigitalProductProject, StageId } from '../types/project.ts';
import { gateIssues } from './gatePolicy.ts';
import { propagateTopicToDownstream } from './marketDiscoveryEngine.ts';

import { formatLocalizedRateLimitError, parseGeminiRateLimitDetails } from './synthesisVisualizer.ts';

// Internal market_research data/services remain intact. Both legacy discovery
// routes resolve to one user-facing setup step at the existing Gate A checkpoint.
export const GATE_A_STEPS = ['topic_selection', 'project_brief', 'uvz', 'transformation_map'] as const;
export type GateAJourneyStage = typeof GATE_A_STEPS[number];
export const GUIDED_GENERATION_AVAILABLE = false; // Job routes store metadata; no generation executor exists.

export function setupStage(stage: string) {
  return stage === 'market_research' ? 'topic_selection' : stage;
}

export function generationError(error: unknown, lang: 'en' | 'zh') {
  const message = error instanceof Error ? error.message.trim() : '';
  const detail = error as {code?:string;statusCode?:number};
  if (detail?.code === 'OPENROUTER_NOT_CONNECTED') return lang === 'en' ? 'OpenRouter needs a verified key. Open AI Settings and save your key, then retry.' : 'OpenRouter 需要有效金鑰，請至 AI 設定儲存並驗證後重試。';
  if (detail?.statusCode === 401) return lang === 'en' ? 'Your Studio session or provider key was rejected. Sign in again or verify the key in AI Settings, then retry.' : '工作區登入或供應商金鑰遭拒，請重新登入或在 AI 設定驗證金鑰後重試。';
  if (detail?.code === 'MISSING_SERVER_GEMINI_KEY') return lang === 'en' ? 'Google sign-in succeeded, but this Studio server has no Gemini API credential. Configure GEMINI_API_KEY in AI Studio Secrets; Google sign-in alone does not supply API quota.' : 'Google 已登入，但此伺服器未設定 Gemini 金鑰。請在 AI Studio Secrets 設定 GEMINI_API_KEY；登入本身不提供 API 額度。';
  if (/unexpected (end of json|token)|is not valid json/i.test(message)) return lang === 'en' ? 'The generated draft was incomplete or did not match the required format. Your saved work is retained; retry generation.' : '生成草稿不完整或格式不符，已保留儲存內容，請重試生成。';

  if (
    !message ||
    /unexpected (end of json|token)|failed to fetch|fetch failed|networkerror|load failed|is not valid json/i.test(
      message
    )
  ) {
    return lang === 'en'
      ? 'The AI service did not return a usable response. Check AI settings and your connection, then retry.'
      : 'AI 服務未傳回可用回應。請檢查 AI 設定與連線，再重試。';
  }
  const parsedGemini = parseGeminiRateLimitDetails(message);
  if (parsedGemini) {
    return formatLocalizedRateLimitError(parsedGemini, lang);
  }
  return message;
}

export function gateAApproved(project: DigitalProductProject) {
  return project.workflow.gates.gateA.isApproved && gateIssues(project, 'gateA').length === 0;
}
export function discoveryAction(project: DigitalProductProject): 'scan' | 'choose' | 'approve' | 'continue' {
  if (gateAApproved(project)) return 'continue';
  if (gateIssues(project, 'gateA').length === 0) return 'approve';
  const eligible = project.marketResearch.topicCandidates.some(candidate => gateIssues({
    ...project, marketResearch: {...project.marketResearch, selectedTopicId: candidate.id},
  }, 'gateA').length === 0);
  return eligible ? 'choose' : 'scan';
}
export function selectedPositioning(project: DigitalProductProject) {
  return project.uvz.positioningOptions.find(option => option.id === project.uvz.selectedOptionId);
}
export function usableBrief(project: DigitalProductProject) {
  return [project.intake.targetAudience, project.intake.problemsSolved, project.intake.productIdea,
    project.intake.desiredTransformation].every(value => Boolean(value?.trim()));
}
export function mapDraftReady(project: DigitalProductProject) {
  const map = project.transformationMap;
  return Boolean(map.beforeState.currentPains.length && map.bridgeProcess.keyMilestones.length &&
    map.afterState.tangibleOutcomes.length && map.titleOptions.some(title => title.title.trim()));
}
export function usableMap(project: DigitalProductProject) {
  return mapDraftReady(project) && project.transformationMap.titleOptions.some(title => title.id === project.transformationMap.selectedTitleId);
}
export function gateAJourney(project: DigitalProductProject) {
  const approved = gateAApproved(project);
  const done = [approved,
    approved && usableBrief(project) && project.workflow.stageStatuses.project_brief === 'COMPLETED',
    approved && Boolean(selectedPositioning(project)) && project.workflow.stageStatuses.uvz === 'COMPLETED',
    approved && usableMap(project) && project.workflow.stageStatuses.transformation_map === 'COMPLETED'];
  const available = [true, approved, approved && done[1], approved && done[2]];
  const next = GATE_A_STEPS.find((_, index) => !done[index]) || 'reference_library';
  return {done, available, next: next as StageId};
}

/** Prefill only the immediate brief/charter handoff; selecting a topic must not
 * replace existing manuscript, references, resources or downstream project work. */
export function selectJourneyTopic(project: DigitalProductProject, topicId: string, lang: 'en' | 'zh', audienceId?: string) {
  const topic = project.marketResearch.topicCandidates.find(topic => topic.id === topicId);
  if (!topic || (project.marketResearch.selectedTopicId === topicId && (!audienceId || audienceId === topic.selectedAudienceHypothesisId))) return project;
  const suggested = propagateTopicToDownstream(project, topicId, lang, audienceId);
  return {...project, marketResearch: {...project.marketResearch, ...suggested.marketResearch},
    intake: {...suggested.intake,
      creatorName: project.intake.creatorName, experienceLevel: project.intake.experienceLevel,
      relevantExperience: project.intake.relevantExperience, expertise: project.intake.expertise,
      interests: project.intake.interests,
      brandStyleAndVoice: project.intake.brandStyleAndVoice,
      constraintsAndExclusions: project.intake.constraintsAndExclusions},
    charter: {...project.charter, productTitle: suggested.charter.productTitle, subtitle: suggested.charter.subtitle,
      targetAudience: suggested.charter.targetAudience, primaryProblemSolved: suggested.charter.primaryProblemSolved,
      centralPromise: suggested.charter.centralPromise},
    workflow: {...project.workflow, stageStatuses: {...project.workflow.stageStatuses,
      topic_selection: 'NEEDS_REVIEW' as const, project_brief: 'READY' as const,
      uvz: 'NEEDS_REVIEW' as const, transformation_map: 'NEEDS_REVIEW' as const}}};
}
