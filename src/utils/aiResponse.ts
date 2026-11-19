export class AiServiceError extends Error {
  public statusCode: number;
  public retryAfterSeconds?: number;
  constructor(message: string, public code: string, public status = 0) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = status;
  }
}

/** Never let a proxy HTML page or empty success response become a JSON parse
 * error that incorrectly blames the creator's Google session. */
export async function readAiResponse(response: Response, requireContent = false) {
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new AiServiceError('The Studio backend returned a page instead of an AI response. Reload the AI Studio preview and retry.', 'AI_BACKEND_RESPONSE', response.status);
  }
  let result: any;
  try { result = await response.json(); }
  catch { throw new AiServiceError('The Studio backend returned an incomplete response. Retry this request.', 'AI_BACKEND_RESPONSE', response.status); }
  if (!response.ok || result?.success === false) {
    const error = new AiServiceError(typeof result?.error === 'string' ? result.error : `AI request failed (HTTP ${response.status}).`, result?.code || 'AI_REQUEST_FAILED', response.status);
    if (Number.isFinite(result?.retryAfterSeconds)) error.retryAfterSeconds=result.retryAfterSeconds;
    throw error;
  }
  if (requireContent && (typeof result?.content !== 'string' || !result.content.trim())) {
    throw new AiServiceError('Gemini returned no usable text. Retry this generation; your saved draft is unchanged.', 'EMPTY_AI_RESPONSE', response.status);
  }
  return result;
}
