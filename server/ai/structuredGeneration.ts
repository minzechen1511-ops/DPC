const text = {type: 'string'};
const strings = {type: 'array', items: text};
export const UVZ_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    buyerProblems: strings, potentialSolutions: strings,
    creatorExpertiseFit: text, commercialFeasibility: text,
    differentiationOpportunities: strings,
    positioningOptions: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object',
        properties: {name: text, angle: text, targetPersona: text, promise: text, pros: text, risks: text, isRecommended: {type: 'boolean'}},
        required: ['name', 'angle', 'targetPersona', 'promise', 'pros', 'risks', 'isRecommended'],
      },
    },
  },
  required: ['buyerProblems', 'potentialSolutions', 'creatorExpertiseFit', 'commercialFeasibility', 'differentiationOpportunities', 'positioningOptions'],
};

export function requireGeneratedText(response: any, structured = false): string {
  const finish = response?.candidates?.[0]?.finishReason;
  const fail = (message: string, code: string): never => {throw Object.assign(new Error(message), {statusCode: 502, code});};
  if (finish === 'MAX_TOKENS') fail('Gemini reached the output limit before completing the draft. Retry with a shorter focus note or a larger output allowance.', 'AI_OUTPUT_TRUNCATED');
  if (response?.promptFeedback?.blockReason || (finish && finish !== 'STOP')) fail('Gemini could not complete this request under its content rules. Revise the focus note and retry; your draft is retained.', 'AI_OUTPUT_BLOCKED');
  const content = typeof response?.text === 'string' ? response.text.trim() : '';
  if (!content) fail('Gemini returned no usable text. Retry this generation; your saved draft is unchanged.', 'EMPTY_AI_RESPONSE');
  if (structured) {
    try { JSON.parse(content); }
    catch { fail('Gemini returned incomplete structured data. Retry generation; your saved draft is unchanged.', 'INVALID_AI_JSON'); }
  }
  return content;
}
