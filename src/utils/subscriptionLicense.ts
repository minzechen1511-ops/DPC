export type SubscriptionPlanId = 'TRIAL' | 'PRO_MONTHLY' | 'STUDIO_ANNUAL' | 'LIFETIME_FOUNDER';

export type SubscriptionHealth =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'TRIAL_ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'UNLICENSED';

export interface IssuedSubscriptionRecord {
  id: string;
  email: string;
  holderName: string;
  plan: Exclude<SubscriptionPlanId, 'TRIAL'>;
  licenseKey: string;
  issuedAt: string;
  expiresAt?: string;
  paymentReference: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}

export interface SubscriptionProgramConfig {
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  founderPriceUsd: number;
  trialDays: number;
  supportEmail: string;
  manualPaymentInstructions: string;
  enforceExportGate: boolean;
}

export interface AppSubscriptionState {
  schemaVersion: '1.0';
  activePlan: SubscriptionPlanId;
  subscriberEmail: string;
  subscriberName: string;
  licenseKey: string;
  activatedAt?: string;
  expiresAt?: string;
  trialStartedAt: string;
  manualPaymentRef?: string;
  isSuspended: boolean;
  programConfig: SubscriptionProgramConfig;
  issuedRecords: IssuedSubscriptionRecord[];
}

export interface SubscriptionEvaluation {
  health: SubscriptionHealth;
  isPaidLicense: boolean;
  isEntitled: boolean;
  canExportCommercialBundle: boolean;
  daysRemaining: number | null;
  planLabel: string;
  statusLabel: string;
  reason: string;
}

export interface KeyVerificationResult {
  valid: boolean;
  plan?: Exclude<SubscriptionPlanId, 'TRIAL'>;
  expiresAt?: string;
  isLifetime?: boolean;
  error?: string;
}

export const SUBSCRIPTION_STORAGE_KEY = 'dps_subscription_state_v1';

const APP_LICENSE_PEPPER = 'DPS_DESKTOP_MANUAL_SUB_V1_2026_STUDIO_KEYRING';

const PLAN_TO_CODE: Record<Exclude<SubscriptionPlanId, 'TRIAL'>, string> = {
  PRO_MONTHLY: 'PRO',
  STUDIO_ANNUAL: 'STU',
  LIFETIME_FOUNDER: 'FND',
};

const CODE_TO_PLAN: Record<string, Exclude<SubscriptionPlanId, 'TRIAL'>> = {
  PRO: 'PRO_MONTHLY',
  STU: 'STUDIO_ANNUAL',
  FND: 'LIFETIME_FOUNDER',
};

export const PLAN_CATALOG: Record<
  SubscriptionPlanId,
  {
    nameEn: string;
    nameZh: string;
    cadenceEn: string;
    cadenceZh: string;
    featuresEn: string[];
    featuresZh: string[];
  }
> = {
  TRIAL: {
    nameEn: 'Evaluation Trial',
    nameZh: '桌面體驗試用版',
    cadenceEn: '7-day evaluation',
    cadenceZh: '7 天免費評估試用',
    featuresEn: [
      'Full Market Intelligence (MTRE) & Gate A/B workflows',
      'Manuscript editing & Styled HTML e-book preview',
      'Local workspace storage & profit simulator',
    ],
    featuresZh: [
      '完整市場情報引擎 (MTRE) 與 Gate A/B 流程',
      '章節寫作編輯器與精裝 HTML 電子書預覽',
      '本機多專案儲存與商業獲利試算引擎',
    ],
  },
  PRO_MONTHLY: {
    nameEn: 'Creator Pro (Monthly)',
    nameZh: '創作者專業月費版',
    cadenceEn: 'Monthly manual renewal',
    cadenceZh: '每月手動續訂授權',
    featuresEn: [
      'Unlimited commercial digital product workspaces',
      'Full Buyer Learning Bundle (.zip) commercial export rights',
      'All commercial brand imprint presets & launch copy suite',
    ],
    featuresZh: [
      '無限建立商業數位商品開發專案',
      '完整買家版商品組合包 (.zip) 商業出版授權',
      '解鎖全部品牌識別風格組與銷售文案套件',
    ],
  },
  STUDIO_ANNUAL: {
    nameEn: 'Studio Annual (Pro Seat)',
    nameZh: '工作室年費旗艦版',
    cadenceEn: 'Annual manual renewal',
    cadenceZh: '每年手動續訂授權',
    featuresEn: [
      'Everything in Creator Pro for 365 days',
      'Multi-brand commercial publishing & client toolkit rights',
      'Priority desktop updates & offline archive integrity verification',
    ],
    featuresZh: [
      '完整包含專業版全年 365 天商業授權',
      '多品牌出版與客戶委託專案交付授權',
      '優先取得桌面端更新與完整離線封裝驗證',
    ],
  },
  LIFETIME_FOUNDER: {
    nameEn: 'Founder Lifetime Desktop',
    nameZh: '創始人終身桌面授權',
    cadenceEn: 'One-time manual activation',
    cadenceZh: '一次性永久離線授權',
    featuresEn: [
      'Perpetual offline Windows desktop activation',
      'Zero recurring renewal locks on local exports',
      'Includes full owner license issuer console',
    ],
    featuresZh: [
      '永久有效之 Windows 桌面端離線授權金鑰',
      '本地端所有匯出與商業功能零到期限制',
      '內建完整訂閱者金鑰簽發與帳冊管理介面',
    ],
  },
};

export const DEFAULT_SUBSCRIPTION_STATE: AppSubscriptionState = {
  schemaVersion: '1.0',
  activePlan: 'TRIAL',
  subscriberEmail: '',
  subscriberName: '',
  licenseKey: '',
  trialStartedAt: '2026-11-12T00:00:00.000Z',
  isSuspended: false,
  programConfig: {
    monthlyPriceUsd: 29,
    annualPriceUsd: 249,
    founderPriceUsd: 499,
    trialDays: 7,
    supportEmail: 'support@digitalproductstudio.local',
    manualPaymentInstructions:
      'Send monthly ($29) or annual ($249) subscription transfer with your email, then enter your issued DPS1 license key below to activate desktop exports.',
    enforceExportGate: false,
  },
  issuedRecords: [],
};

function computeKeySignatureHex(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const full = `${payload}|${APP_LICENSE_PEPPER}`;
  for (let i = 0; i < full.length; i++) {
    const c = full.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 ^ (c + ((h1 >>> 3) & 0xff))) >>> 0;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const part1 = (h1 >>> 0).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const part2 = (h2 >>> 0).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  return `${part1}${part2}`;
}

function formatDateTag(isoDate?: string): string {
  if (!isoDate) return 'LIFETIME';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'LIFETIME';
  const yyyy = String(d.getUTCFullYear()).padStart(4, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function parseDateTag(tag: string): string | undefined {
  if (tag === 'LIFETIME') return undefined;
  if (!/^\d{8}$/.test(tag)) return undefined;
  const yyyy = tag.slice(0, 4);
  const mm = tag.slice(4, 6);
  const dd = tag.slice(6, 8);
  const iso = `${yyyy}-${mm}-${dd}T23:59:59.999Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return iso;
}

function deterministicNonce(seed: string): string {
  let h = 0x517cc1b7;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x27d4eb2d) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
}

export function issueSubscriptionKey(params: {
  email: string;
  plan: Exclude<SubscriptionPlanId, 'TRIAL'>;
  expiresAt?: string;
  nonce?: string;
}): string {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid subscriber email is required to issue a license key.');
  }
  const planCode = PLAN_TO_CODE[params.plan];
  const expTag = params.plan === 'LIFETIME_FOUNDER' ? 'LIFETIME' : formatDateTag(params.expiresAt);
  const nonce = (params.nonce || deterministicNonce(`${normalizedEmail}|${planCode}|${expTag}|${Date.now()}`))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .padStart(6, '0')
    .slice(0, 6);
  const sig = computeKeySignatureHex(`DPS1|${planCode}|${expTag}|${nonce}|${normalizedEmail}`);
  return `DPS1-${planCode}-${expTag}-${nonce}-${sig}`;
}

export function verifySubscriptionKey(
  rawKey: string,
  subscriberEmail: string,
  now: Date = new Date()
): KeyVerificationResult {
  const cleanedKey = rawKey.trim().toUpperCase();
  const normalizedEmail = subscriberEmail.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { valid: false, error: 'Enter the subscriber email matching the license key.' };
  }

  const parts = cleanedKey.split('-');
  if (parts.length !== 5 || parts[0] !== 'DPS1') {
    return { valid: false, error: 'Invalid license key format. Expected DPS1-PLAN-EXPIRY-NONCE-SIG.' };
  }

  const [, planCode, expTag, nonce, providedSig] = parts;
  const plan = CODE_TO_PLAN[planCode];
  if (!plan) {
    return { valid: false, error: `Unknown subscription plan code "${planCode}".` };
  }

  if (expTag !== 'LIFETIME' && !/^\d{8}$/.test(expTag)) {
    return { valid: false, error: 'Invalid license expiration date format.' };
  }

  const expectedSig = computeKeySignatureHex(`DPS1|${planCode}|${expTag}|${nonce}|${normalizedEmail}`);
  if (expectedSig !== providedSig) {
    return {
      valid: false,
      error: 'License key signature does not match this subscriber email.',
    };
  }

  const isLifetime = expTag === 'LIFETIME';
  const expiresAt = isLifetime ? undefined : parseDateTag(expTag);
  if (!isLifetime && !expiresAt) {
    return { valid: false, error: 'License expiration date could not be parsed.' };
  }

  if (expiresAt && new Date(expiresAt).getTime() < now.getTime()) {
    return {
      valid: false,
      plan,
      expiresAt,
      isLifetime: false,
      error: `Subscription key expired on ${expiresAt.slice(0, 10)}. Renew manually to continue.`,
    };
  }

  return {
    valid: true,
    plan,
    expiresAt,
    isLifetime,
  };
}

export function evaluateSubscriptionStatus(
  state: AppSubscriptionState,
  now: Date = new Date(),
  lang: 'en' | 'zh' = 'en'
): SubscriptionEvaluation {
  const catalog = PLAN_CATALOG[state.activePlan] || PLAN_CATALOG.TRIAL;
  const planLabel = lang === 'en' ? catalog.nameEn : catalog.nameZh;

  if (state.isSuspended) {
    return {
      health: 'SUSPENDED',
      isPaidLicense: state.activePlan !== 'TRIAL',
      isEntitled: false,
      canExportCommercialBundle: !state.programConfig.enforceExportGate,
      daysRemaining: 0,
      planLabel,
      statusLabel: lang === 'en' ? 'Suspended' : '已暫停授權',
      reason:
        lang === 'en'
          ? 'This desktop subscription is manually paused. Resume or enter a renewed license key.'
          : '此桌面端訂閱目前為手動暫停狀態，請恢復授權或輸入續訂金鑰。',
    };
  }

  if (state.activePlan !== 'TRIAL' && state.licenseKey.trim().length > 0) {
    const verified = verifySubscriptionKey(state.licenseKey, state.subscriberEmail, now);
    if (!verified.valid) {
      const isExpired = Boolean(verified.expiresAt && new Date(verified.expiresAt).getTime() < now.getTime());
      return {
        health: isExpired ? 'EXPIRED' : 'UNLICENSED',
        isPaidLicense: false,
        isEntitled: false,
        canExportCommercialBundle: !state.programConfig.enforceExportGate,
        daysRemaining: 0,
        planLabel,
        statusLabel: isExpired
          ? lang === 'en'
            ? 'Expired'
            : '訂閱已到期'
          : lang === 'en'
          ? 'Verification Needed'
          : '需要重新驗證',
        reason: verified.error || (lang === 'en' ? 'License key requires verification.' : '授權金鑰需重新驗證。'),
      };
    }

    if (verified.isLifetime || !verified.expiresAt) {
      return {
        health: 'ACTIVE',
        isPaidLicense: true,
        isEntitled: true,
        canExportCommercialBundle: true,
        daysRemaining: null,
        planLabel,
        statusLabel: lang === 'en' ? 'Active (Lifetime)' : '已啟用（終身）',
        reason: lang === 'en' ? 'Perpetual desktop subscription verified locally.' : '已在本機完成永久桌面授權驗證。',
      };
    }

    const msLeft = new Date(verified.expiresAt).getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msLeft / 86_400_000));
    const expiringSoon = daysRemaining <= 7;

    return {
      health: expiringSoon ? 'EXPIRING_SOON' : 'ACTIVE',
      isPaidLicense: true,
      isEntitled: true,
      canExportCommercialBundle: true,
      daysRemaining,
      planLabel,
      statusLabel: expiringSoon
        ? lang === 'en'
          ? `Expiring in ${daysRemaining}d`
          : `將於 ${daysRemaining} 天後到期`
        : lang === 'en'
        ? 'Active'
        : '訂閱有效',
      reason: expiringSoon
        ? lang === 'en'
          ? `Manual renewal due by ${verified.expiresAt.slice(0, 10)}.`
          : `請於 ${verified.expiresAt.slice(0, 10)} 前手動續訂。`
        : lang === 'en'
        ? `Desktop license valid through ${verified.expiresAt.slice(0, 10)}.`
        : `桌面端訂閱授權有效至 ${verified.expiresAt.slice(0, 10)}。`,
    };
  }

  // Trial Mode
  const trialDays = Math.max(0, Number(state.programConfig.trialDays || 0));
  const startMs = new Date(state.trialStartedAt || now.toISOString()).getTime();
  const endMs = (Number.isNaN(startMs) ? now.getTime() : startMs) + trialDays * 86_400_000;
  const daysRemaining = Math.max(0, Math.ceil((endMs - now.getTime()) / 86_400_000));

  if (trialDays > 0 && now.getTime() <= endMs) {
    return {
      health: 'TRIAL_ACTIVE',
      isPaidLicense: false,
      isEntitled: true,
      canExportCommercialBundle: !state.programConfig.enforceExportGate,
      daysRemaining,
      planLabel,
      statusLabel:
        lang === 'en' ? `Trial (${daysRemaining}d left)` : `試用期（剩 ${daysRemaining} 天）`,
      reason: state.programConfig.enforceExportGate
        ? lang === 'en'
          ? 'Commercial Buyer Bundle exports are locked until a paid manual subscription key is activated.'
          : '已開啟商業匯出授權鎖定：請先啟用付費手動訂閱金鑰以解鎖買家版 ZIP 匯出。'
        : lang === 'en'
        ? 'Evaluation trial active. Enter a manual subscription key anytime to activate commercial license.'
        : '免費試用進行中，您可隨時輸入手動訂閱金鑰啟用商業授權。',
    };
  }

  return {
    health: 'EXPIRED',
    isPaidLicense: false,
    isEntitled: false,
    canExportCommercialBundle: !state.programConfig.enforceExportGate,
    daysRemaining: 0,
    planLabel,
    statusLabel: lang === 'en' ? 'Trial Expired' : '試用期已結束',
    reason:
      lang === 'en'
        ? 'Evaluation period ended. Activate a manual Pro Monthly or Studio Annual license key.'
        : '桌面體驗期已結束，請輸入月費或年費手動訂閱金鑰以繼續商業使用。',
  };
}

export function normalizeSubscriptionState(raw: unknown): AppSubscriptionState {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_SUBSCRIPTION_STATE);
  }
  const obj = raw as Partial<AppSubscriptionState>;
  const config = obj.programConfig || ({} as Partial<SubscriptionProgramConfig>);
  return {
    schemaVersion: '1.0',
    activePlan:
      obj.activePlan && obj.activePlan in PLAN_CATALOG ? obj.activePlan : 'TRIAL',
    subscriberEmail: typeof obj.subscriberEmail === 'string' ? obj.subscriberEmail : '',
    subscriberName: typeof obj.subscriberName === 'string' ? obj.subscriberName : '',
    licenseKey: typeof obj.licenseKey === 'string' ? obj.licenseKey : '',
    activatedAt: typeof obj.activatedAt === 'string' ? obj.activatedAt : undefined,
    expiresAt: typeof obj.expiresAt === 'string' ? obj.expiresAt : undefined,
    trialStartedAt:
      typeof obj.trialStartedAt === 'string' && !Number.isNaN(Date.parse(obj.trialStartedAt))
        ? obj.trialStartedAt
        : new Date().toISOString(),
    manualPaymentRef: typeof obj.manualPaymentRef === 'string' ? obj.manualPaymentRef : undefined,
    isSuspended: Boolean(obj.isSuspended),
    programConfig: {
      monthlyPriceUsd:
        typeof config.monthlyPriceUsd === 'number' && config.monthlyPriceUsd >= 0
          ? config.monthlyPriceUsd
          : DEFAULT_SUBSCRIPTION_STATE.programConfig.monthlyPriceUsd,
      annualPriceUsd:
        typeof config.annualPriceUsd === 'number' && config.annualPriceUsd >= 0
          ? config.annualPriceUsd
          : DEFAULT_SUBSCRIPTION_STATE.programConfig.annualPriceUsd,
      founderPriceUsd:
        typeof config.founderPriceUsd === 'number' && config.founderPriceUsd >= 0
          ? config.founderPriceUsd
          : DEFAULT_SUBSCRIPTION_STATE.programConfig.founderPriceUsd,
      trialDays:
        typeof config.trialDays === 'number' && config.trialDays >= 0
          ? config.trialDays
          : DEFAULT_SUBSCRIPTION_STATE.programConfig.trialDays,
      supportEmail:
        typeof config.supportEmail === 'string' && config.supportEmail.trim()
          ? config.supportEmail
          : DEFAULT_SUBSCRIPTION_STATE.programConfig.supportEmail,
      manualPaymentInstructions:
        typeof config.manualPaymentInstructions === 'string' && config.manualPaymentInstructions.trim()
          ? config.manualPaymentInstructions
          : DEFAULT_SUBSCRIPTION_STATE.programConfig.manualPaymentInstructions,
      enforceExportGate: Boolean(config.enforceExportGate),
    },
    issuedRecords: Array.isArray(obj.issuedRecords) ? obj.issuedRecords : [],
  };
}

export function loadSubscriptionState(): AppSubscriptionState {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_SUBSCRIPTION_STATE);
  try {
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) {
      const initial: AppSubscriptionState = {
        ...structuredClone(DEFAULT_SUBSCRIPTION_STATE),
        trialStartedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return normalizeSubscriptionState(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_SUBSCRIPTION_STATE);
  }
}

export function saveSubscriptionState(state: AppSubscriptionState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
