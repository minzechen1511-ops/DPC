import { TopicCandidate } from '../types/project.ts';

export interface ScoreWeights {
  demandSignal: number;      // max 25
  problemUrgency: number;    // max 15
  competitionEntry: number;  // max 15
  differentiation: number;   // max 15
  creatorFit: number;        // max 10
  audienceReach: number;     // max 10
  digitalFit: number;        // max 5
  costRisk: number;          // max 5
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  demandSignal: 25,
  problemUrgency: 15,
  competitionEntry: 15,
  differentiation: 15,
  creatorFit: 10,
  audienceReach: 10,
  digitalFit: 5,
  costRisk: 5,
};

/**
 * Calculates the total opportunity score (0 - 100) for a candidate topic
 * using the V4.0 opportunity scoring rubric.
 */
export function calculateOpportunityScore(breakdown: TopicCandidate['scoreBreakdown']): number {
  const score =
    Math.min(25, Math.max(0, breakdown.demandSignal)) +
    Math.min(15, Math.max(0, breakdown.problemUrgency)) +
    Math.min(15, Math.max(0, breakdown.competitionEntry)) +
    Math.min(15, Math.max(0, breakdown.differentiation)) +
    Math.min(10, Math.max(0, breakdown.creatorFit)) +
    Math.min(10, Math.max(0, breakdown.audienceReach)) +
    Math.min(5, Math.max(0, breakdown.digitalFit)) +
    Math.min(5, Math.max(0, breakdown.costRisk));

  return Math.round(score * 10) / 10;
}

/**
 * Rank candidates by opportunity score and assign top-three priority badges:
 * 1. BEST_OVERALL (highest overall score)
 * 2. EASIEST_TO_LAUNCH (high competition entry + low cost risk + high creator fit)
 * 3. HIGH_DIFFERENTIATION (highest differentiation score)
 */
export function rankAndBadgeCandidates(candidates: TopicCandidate[]): TopicCandidate[] {
  if (!candidates || candidates.length === 0) return [];

  const evaluated = candidates.map((candidate) => ({
    ...candidate,
    opportunityScore: calculateOpportunityScore(candidate.scoreBreakdown),
  }));

  // Sort descending by score
  const sorted = [...evaluated].sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Identify Best Overall
  const bestOverallId = sorted[0]?.id;

  // Identify Easiest to Launch (sum of competitionEntry + costRisk + creatorFit)
  const easiestCandidate = [...sorted].sort((a, b) => {
    const easeA = a.scoreBreakdown.competitionEntry + a.scoreBreakdown.costRisk + a.scoreBreakdown.creatorFit;
    const easeB = b.scoreBreakdown.competitionEntry + b.scoreBreakdown.costRisk + b.scoreBreakdown.creatorFit;
    return easeB - easeA;
  })[0];
  const easiestId = easiestCandidate?.id !== bestOverallId ? easiestCandidate?.id : sorted[1]?.id;

  // Identify High Differentiation
  const diffCandidate = [...sorted].sort(
    (a, b) => b.scoreBreakdown.differentiation - a.scoreBreakdown.differentiation
  )[0];
  const diffId =
    diffCandidate?.id !== bestOverallId && diffCandidate?.id !== easiestId
      ? diffCandidate?.id
      : sorted.find((c) => c.id !== bestOverallId && c.id !== easiestId)?.id;

  return sorted.map((candidate) => {
    let badge: TopicCandidate['badge'] = undefined;
    if (candidate.id === bestOverallId) badge = 'BEST_OVERALL';
    else if (candidate.id === easiestId) badge = 'EASIEST_TO_LAUNCH';
    else if (candidate.id === diffId) badge = 'HIGH_DIFFERENTIATION';

    return {
      ...candidate,
      badge,
    };
  });
}
