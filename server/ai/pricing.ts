export interface CostCalculationResult {
  estimatedCostUsd: number;
  costStatus: 'actual' | 'estimated' | 'unknown';
  pricingNote: string;
}

const KNOWN_RATES_PER_MILLION: Record<string, { prompt: number; completion: number }> = {
  'gemini-4-hydrogen': { prompt: 0.15, completion: 0.6 },
  'gemini-3.1-flash-lite': { prompt: 0.08, completion: 0.3 },
  'gemini-4-argon': { prompt: 1.25, completion: 5.0 },
  'gemini-4-carbon': { prompt: 2.5, completion: 10.0 },
};

export function calculateAiUsageCost(input: {
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reportedCostUsd?: number | null;
}): CostCalculationResult {
  const modelId = (input.model || '').trim().toLowerCase();

  if (
    typeof input.reportedCostUsd === 'number' &&
    Number.isFinite(input.reportedCostUsd) &&
    input.reportedCostUsd >= 0
  ) {
    return {
      estimatedCostUsd: Number(input.reportedCostUsd.toFixed(6)),
      costStatus: 'actual',
      pricingNote: 'Reported by upstream provider.',
    };
  }

  const rate = KNOWN_RATES_PER_MILLION[modelId];
  const promptTokens = Number(input.promptTokens || 0);
  const completionTokens = Number(input.completionTokens || 0);
  const totalTokens = Number(input.totalTokens || promptTokens + completionTokens);

  if (rate && totalTokens > 0) {
    const cost =
      promptTokens || completionTokens
        ? (promptTokens / 1_000_000) * rate.prompt + (completionTokens / 1_000_000) * rate.completion
        : (totalTokens / 1_000_000) * ((rate.prompt + rate.completion) / 2);
    return {
      estimatedCostUsd: Number(cost.toFixed(6)),
      costStatus: 'estimated',
      pricingNote: 'Estimated from published Gemini model token rates.',
    };
  }

  return {
    estimatedCostUsd: 0,
    costStatus: 'unknown',
    pricingNote: 'Exact model rate unavailable; check Google AI Studio billing settings.',
  };
}
