import type { DigitalProductProject } from '../types/project.ts';

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /sk-or-v1-[A-Za-z0-9_-]{12,}/g,
  /sk-proj-[A-Za-z0-9_-]{12,}/g,
  /sk-ant-[A-Za-z0-9_-]{12,}/g,
  /AIzaSy[A-Za-z0-9_-]{16,}/g,
  /whsec_[A-Za-z0-9+/=_-]{16,}/g,
  /DPS1-[A-Za-z0-9_-]{8,}/g,
];

export function redactSecretStrings(text: string): string {
  let clean = text;
  for (const regex of SECRET_VALUE_PATTERNS) {
    clean = clean.replace(regex, '[REDACTED_SECRET]');
  }
  return clean;
}

export function hasSensitiveSecrets(input: unknown): boolean {
  const serialized = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  for (const regex of SECRET_VALUE_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(serialized)) {
      regex.lastIndex = 0;
      return true;
    }
    regex.lastIndex = 0;
  }
  return false;
}

/**
 * Strip sensitive API keys, desktop license artifacts, and non-portable credentials
 * before storing in cloud DB, localStorage, or exporting backup/bundle files.
 */
export function sanitizeProjectForExport(
  project: DigitalProductProject
): DigitalProductProject {
  const cloned = structuredClone(project) as DigitalProductProject & Record<string, any>;

  // Remove any legacy desktop/license properties if carried over from old localStorage backups
  delete cloned.subscriptionState;
  delete cloned.desktopLicense;
  delete cloned.licenseKey;
  delete cloned.desktopSubscription;

  const rawModel = String(cloned.aiSettings?.defaultModel || '').trim();
  const validGeminiModels = new Set([
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
    'gemini-4-argon',
    'gemini-4-carbon',
  ]);
  const normalizedModel = validGeminiModels.has(rawModel) ? rawModel : 'gemini-4-hydrogen';

  cloned.aiSettings = {
    ...(cloned.aiSettings || {}),
    provider: 'gemini',
    apiKey: '',
    apiKeys: {
      openrouter: '',
      gemini: '',
      openai: '',
      claude: '',
    },
    defaultModel: normalizedModel,
    providerModels: {
      ...(cloned.aiSettings?.providerModels || {}),
      gemini: normalizedModel,
    },
    freeOnly: false,
    allowPaidFallback: Boolean(cloned.aiSettings?.allowPaidFallback ?? true),
    maxSpendPerRequest: Number(cloned.aiSettings?.maxSpendPerRequest ?? 0.5),
    dailyBudget: Number(cloned.aiSettings?.dailyBudget ?? 5),
    projectBudget: Number(cloned.aiSettings?.projectBudget ?? 20),
    baseUrl: '',
    usageStats: cloned.aiSettings?.usageStats || {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    },
  };

  // Normalize human-gate preferences safely on legacy imports
  if (cloned.preferences) {
    const mode =
      cloned.preferences.automationMode === 'guided_until_gate'
        ? 'guided_until_gate'
        : 'manual_review';
    cloned.preferences = {
      ...cloned.preferences,
      automationMode: mode as DigitalProductProject['preferences']['automationMode'],
      autoApproveNonCritical: false,
    };
  }

  return cloned;
}
