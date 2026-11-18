import type { DigitalProductProject } from '../types/project.ts';
import { compareCandidateEvidence } from './marketDiscoveryEngine.ts';

/** Comparison rows duplicate retained observations and can exceed Firestore's
 * document limit. Persist all original evidence and decisions; rebuild only
 * this deterministic presentation data when opening the workspace. */
export function compactMarketResearch(market: DigitalProductProject['marketResearch']): DigitalProductProject['marketResearch'] {
  return {
    ...market,
    topicCandidates: market.topicCandidates.map(({ evidenceComparison: _derived, ...candidate }) => candidate),
  };
}

export function hydrateMarketResearch(market: DigitalProductProject['marketResearch']): DigitalProductProject['marketResearch'] {
  return {
    ...market,
    topicCandidates: market.topicCandidates.map(candidate => {
      if (!candidate.marketCategory) return candidate;
      const comparison = compareCandidateEvidence(market.platformEvidence, candidate.marketCategory);
      return { ...candidate, evidenceComparison: comparison.evidenceComparison, multiSourceStatus: comparison.multiSourceStatus };
    }),
  };
}
