import { ReferenceCard, ReferenceVerificationStatus } from '../types/project.ts';

export interface CardValidationResult {
  isValid: boolean;
  missingSections: string[];
  warnings: string[];
}

/**
 * Validates that a reference card contains all 7 mandatory sections:
 * A. Title
 * B. Description
 * C. Content Outline
 * D. Practical Framework (with editorial origin clarification)
 * E. Research Summary
 * F. Editorial Notes
 * G. Brand Guidelines
 */
export function validateSevenPartCard(card: Partial<ReferenceCard>): CardValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!card.title || card.title.trim().length === 0) {
    missing.push('A. Title (標題)');
  }
  if (!card.description || card.description.trim().length === 0) {
    missing.push('B. Description (說明及價值)');
  }
  if (!card.contentOutline || card.contentOutline.length === 0) {
    missing.push('C. Content Outline (內容大綱)');
  }
  if (!card.practicalFramework || !card.practicalFramework.name || !card.practicalFramework.actionSteps?.length) {
    missing.push('D. Practical Framework (實作行動架構)');
  } else if (!card.practicalFramework.editorialOrigin) {
    warnings.push('Section D should clearly note editorial synthesis provenance');
  }

  if (!card.researchSummary || card.researchSummary.trim().length < 30) {
    missing.push('E. Research Summary (實質研究摘要)');
  }

  if (!card.editorialNotes || !card.editorialNotes.targetChapters?.length) {
    missing.push('F. Editorial Notes (編輯與章節指引)');
  }

  if (!card.brandGuidelines || !card.brandGuidelines.toneApplication) {
    missing.push('G. Brand Guidelines (品牌溝通指引)');
  }

  return {
    isValid: missing.length === 0,
    missingSections: missing,
    warnings,
  };
}

/**
 * Computes coverage across research pillars and verified counts.
 */
export function analyzeReferenceLibrary(cards: ReferenceCard[]) {
  const total = cards.length;
  let verifiedCount = 0;
  const coveragePillars: Record<string, number> = {};
  const statusCounts: Record<ReferenceVerificationStatus, number> = {
    VERIFIED_FULL_TEXT: 0,
    VERIFIED_PARTIAL_TEXT: 0,
    METADATA_ONLY: 0,
    RETRIEVAL_BLOCKED: 0,
    REJECTED_DUPLICATE: 0,
    REJECTED_LOW_QUALITY: 0,
    NEEDS_REVIEW: 0,
  };

  for (const card of cards) {
    statusCounts[card.status] = (statusCounts[card.status] || 0) + 1;
    if (card.status === 'VERIFIED_FULL_TEXT' || card.status === 'VERIFIED_PARTIAL_TEXT') {
      verifiedCount++;
    }

    if (Array.isArray(card.pillars)) {
      for (const pillar of card.pillars) {
        coveragePillars[pillar] = (coveragePillars[pillar] || 0) + 1;
      }
    }
  }

  return {
    total,
    verifiedCount,
    statusCounts,
    coveragePillars,
    isTargetReached: verifiedCount >= 20,
  };
}
