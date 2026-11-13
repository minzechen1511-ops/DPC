import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  HardDriveDownload,
  KeyRound,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Unlock,
} from 'lucide-react';
import {
  AppSubscriptionState,
  IssuedSubscriptionRecord,
  PLAN_CATALOG,
  SubscriptionPlanId,
  evaluateSubscriptionStatus,
  issueSubscriptionKey,
  verifySubscriptionKey,
} from '../../utils/subscriptionLicense.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { StudioLogo } from '../StudioLogo.tsx';

interface DesktopPackageStatus {
  ready: boolean;
  fileName: string;
  sizeBytes: number;
  sha256: string | null;
  builtAt: string | null;
  targetPlatform: string;
  runtimeArchitecture: string;
  appVersion: string;
  canRebuild?: boolean;
}

interface SubscriptionDesktopViewProps {
  subscription: AppSubscriptionState;
  onUpdateSubscription: (next: AppSubscriptionState) => void;
  lang?: Language;
}

function formatMb(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SubscriptionDesktopView: React.FC<SubscriptionDesktopViewProps> = ({
  subscription,
  onUpdateSubscription,
  lang = 'en',
}) => {
  const t = translations[lang];
  const evaluation = evaluateSubscriptionStatus(subscription, new Date(), lang);

  // Desktop package info from server
  const [pkgInfo, setPkgInfo] = useState<DesktopPackageStatus | null>(null);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [buildingExe, setBuildingExe] = useState(false);
  const [downloadingExe, setDownloadingExe] = useState(false);
  const [pkgError, setPkgError] = useState('');
  const [pkgStatusMsg, setPkgStatusMsg] = useState('');

  // Activation form
  const [activateEmail, setActivateEmail] = useState(subscription.subscriberEmail || '');
  const [activateName, setActivateName] = useState(subscription.subscriberName || '');
  const [activateKey, setActivateKey] = useState(subscription.licenseKey || '');
  const [activatePaymentRef, setActivatePaymentRef] = useState(subscription.manualPaymentRef || '');
  const [activationMessage, setActivationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Program config form (Owner subscription settings)
  const [configDraft, setConfigDraft] = useState(subscription.programConfig);
  const [configSavedMsg, setConfigSavedMsg] = useState(false);

  // Manual key issuer form (Owner console)
  const [issueEmail, setIssueEmail] = useState('');
  const [issueHolder, setIssueHolder] = useState('');
  const [issuePlan, setIssuePlan] = useState<Exclude<SubscriptionPlanId, 'TRIAL'>>('PRO_MONTHLY');
  const [issueDurationDays, setIssueDurationDays] = useState<number>(30);
  const [issuePaymentRef, setIssuePaymentRef] = useState('');
  const [issuerError, setIssuerError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setConfigDraft(subscription.programConfig);
    setActivateEmail((prev) => prev || subscription.subscriberEmail);
    setActivateName((prev) => prev || subscription.subscriberName);
    setActivateKey((prev) => prev || subscription.licenseKey);
    setActivatePaymentRef((prev) => prev || subscription.manualPaymentRef || '');
  }, [subscription]);

  const fetchDesktopInfo = async () => {
    setPkgLoading(true);
    try {
      const res = await fetch('/api/desktop/info');
      if (res.ok) {
        const data = await res.json();
        setPkgInfo(data);
      }
    } catch {
      // ignore if offline
    } finally {
      setPkgLoading(false);
    }
  };

  useEffect(() => {
    fetchDesktopInfo();
  }, []);

  const handleBuildDesktopExe = async () => {
    if (buildingExe) return;
    setBuildingExe(true);
    setPkgError('');
    setPkgStatusMsg('');
    try {
      const res = await fetch('/api/desktop/build', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ready) {
        setPkgError(
          data.error ||
            (lang === 'en'
              ? 'Failed to package Digital Product Studio.exe.'
              : '打包 Digital Product Studio.exe 失敗。')
        );
      } else {
        setPkgInfo(data);
        setPkgStatusMsg(
          lang === 'en'
            ? `Packaged ${data.fileName} (${formatMb(data.sizeBytes)}) cleanly.`
            : `已成功封裝 ${data.fileName}（${formatMb(data.sizeBytes)}）。`
        );
      }
    } catch (err: any) {
      setPkgError(err?.message || 'Unable to contact desktop build service.');
    } finally {
      setBuildingExe(false);
    }
  };

  const handleDownloadDesktopExe = async () => {
    if (downloadingExe) return;
    setDownloadingExe(true);
    setPkgError('');
    setPkgStatusMsg('');
    try {
      const res = await fetch('/api/desktop/download');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pkgInfo?.fileName || 'Digital Product Studio.exe';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPkgStatusMsg(
        lang === 'en'
          ? 'Download started: Digital Product Studio.exe. Double-click the executable on Windows to launch the standalone desktop studio and configure your subscription.'
          : '已開始下載 Digital Product Studio.exe。於 Windows 雙擊執行即可啟動獨立桌面工作室並管理訂閱授權。'
      );
      fetchDesktopInfo();
    } catch (err: any) {
      setPkgError(err?.message || 'Unable to download Digital Product Studio.exe.');
    } finally {
      setDownloadingExe(false);
    }
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    setActivationMessage(null);
    const emailTrimmed = activateEmail.trim();
    const keyTrimmed = activateKey.trim().toUpperCase();
    const result = verifySubscriptionKey(keyTrimmed, emailTrimmed);
    if (!result.valid || !result.plan) {
      setActivationMessage({
        type: 'error',
        text:
          result.error ||
          (lang === 'en'
            ? 'License key verification failed.'
            : '訂閱金鑰驗證失敗，請確認信箱與金鑰完全一致。'),
      });
      return;
    }

    const nextState: AppSubscriptionState = {
      ...subscription,
      activePlan: result.plan,
      subscriberEmail: emailTrimmed,
      subscriberName: activateName.trim() || emailTrimmed.split('@')[0],
      licenseKey: keyTrimmed,
      activatedAt: new Date().toISOString(),
      expiresAt: result.expiresAt,
      manualPaymentRef: activatePaymentRef.trim() || subscription.manualPaymentRef,
      isSuspended: false,
    };
    onUpdateSubscription(nextState);
    setActivationMessage({
      type: 'success',
      text:
        lang === 'en'
          ? `Subscription activated: ${PLAN_CATALOG[result.plan].nameEn}. Saved to browser and desktop vault.`
          : `訂閱授權已啟用：${PLAN_CATALOG[result.plan].nameZh}，並已同步寫入本機桌面設定檔。`,
    });
  };

  const handleToggleSuspend = () => {
    onUpdateSubscription({
      ...subscription,
      isSuspended: !subscription.isSuspended,
    });
  };

  const handleResetToTrial = () => {
    setConfirmReset(false);
    setActivateKey('');
    onUpdateSubscription({
      ...subscription,
      activePlan: 'TRIAL',
      licenseKey: '',
      expiresAt: undefined,
      activatedAt: undefined,
      isSuspended: false,
    });
    setActivationMessage({
      type: 'success',
      text:
        lang === 'en'
          ? 'Desktop license cleared. Reverted to Evaluation Trial mode.'
          : '已清除商業金鑰，回復為桌面體驗試用模式。',
    });
  };

  const handleSaveProgramConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSubscription({
      ...subscription,
      programConfig: {
        ...configDraft,
        monthlyPriceUsd: Math.max(0, Number(configDraft.monthlyPriceUsd) || 0),
        annualPriceUsd: Math.max(0, Number(configDraft.annualPriceUsd) || 0),
        founderPriceUsd: Math.max(0, Number(configDraft.founderPriceUsd) || 0),
        trialDays: Math.max(0, Math.round(Number(configDraft.trialDays) || 0)),
      },
    });
    setConfigSavedMsg(true);
    setTimeout(() => setConfigSavedMsg(false), 3000);
  };

  const handleIssueManualKey = (e: React.FormEvent) => {
    e.preventDefault();
    setIssuerError('');
    const email = issueEmail.trim();
    if (!email || !email.includes('@')) {
      setIssuerError(lang === 'en' ? 'Enter a valid buyer email address.' : '請輸入有效的訂閱者 Email。');
      return;
    }

    const expiresAt =
      issuePlan === 'LIFETIME_FOUNDER'
        ? undefined
        : new Date(Date.now() + Math.max(1, issueDurationDays) * 86_400_000).toISOString();

    const licenseKey = issueSubscriptionKey({
      email,
      plan: issuePlan,
      expiresAt,
    });

    const record: IssuedSubscriptionRecord = {
      id: `sub_${Date.now()}`,
      email,
      holderName: issueHolder.trim() || email.split('@')[0],
      plan: issuePlan,
      licenseKey,
      issuedAt: new Date().toISOString(),
      expiresAt,
      paymentReference: issuePaymentRef.trim() || 'Manual Transfer',
      status: 'ACTIVE',
    };

    onUpdateSubscription({
      ...subscription,
      issuedRecords: [record, ...subscription.issuedRecords],
    });

    setIssueEmail('');
    setIssueHolder('');
    setIssuePaymentRef('');
  };

  const handleApplyRecordToApp = (rec: IssuedSubscriptionRecord) => {
    setActivateEmail(rec.email);
    setActivateName(rec.holderName);
    setActivateKey(rec.licenseKey);
    setActivatePaymentRef(rec.paymentReference);
    onUpdateSubscription({
      ...subscription,
      activePlan: rec.plan,
      subscriberEmail: rec.email,
      subscriberName: rec.holderName,
      licenseKey: rec.licenseKey,
      activatedAt: new Date().toISOString(),
      expiresAt: rec.expiresAt,
      manualPaymentRef: rec.paymentReference,
      isSuspended: rec.status !== 'ACTIVE',
    });
    setActivationMessage({
      type: 'success',
      text:
        lang === 'en'
          ? `Applied ${rec.email} (${PLAN_CATALOG[rec.plan].nameEn}) to this desktop app.`
          : `已將 ${rec.email} 的授權（${PLAN_CATALOG[rec.plan].nameZh}）套用至此桌面程式。`,
    });
  };

  const handleCopyKey = async (rec: IssuedSubscriptionRecord) => {
    try {
      await navigator.clipboard.writeText(rec.licenseKey);
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleToggleRecordStatus = (recId: string) => {
    const updated = subscription.issuedRecords.map((rec) => {
      if (rec.id !== recId) return rec;
      const nextStatus: IssuedSubscriptionRecord['status'] =
        rec.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      return { ...rec, status: nextStatus };
    });
    const target = updated.find((r) => r.id === recId);
    const shouldSyncActive = target && target.licenseKey === subscription.licenseKey;
    onUpdateSubscription({
      ...subscription,
      isSuspended: shouldSyncActive ? target.status !== 'ACTIVE' : subscription.isSuspended,
      issuedRecords: updated,
    });
  };

  const handleExtendRecord30Days = (recId: string) => {
    const updated = subscription.issuedRecords.map((rec) => {
      if (rec.id !== recId || rec.plan === 'LIFETIME_FOUNDER') return rec;
      const baseMs = Math.max(Date.now(), rec.expiresAt ? Date.parse(rec.expiresAt) : Date.now());
      const nextExpiresAt = new Date(baseMs + 30 * 86_400_000).toISOString();
      const nextKey = issueSubscriptionKey({
        email: rec.email,
        plan: rec.plan,
        expiresAt: nextExpiresAt,
      });
      return {
        ...rec,
        expiresAt: nextExpiresAt,
        licenseKey: nextKey,
        status: 'ACTIVE' as const,
      };
    });
    onUpdateSubscription({
      ...subscription,
      issuedRecords: updated,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>{t.navSubscriptionDesktop}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === 'en'
              ? 'Desktop Program Package (.exe) & Manual Subscription'
              : '獨立桌面程式打包 (.exe) 與手動訂閱授權設定'}
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl">
            {lang === 'en'
              ? 'Download Digital Product Studio as a self-contained Windows desktop program (all studio views, AI proxy, research engine, and export tools bundled in one .exe) and configure manual subscription licensing.'
              : '將完整系統封裝為單一 Windows 可執行桌面程式（Digital Product Studio.exe），整合前端介面、本地伺服器、AI 模型連線、文獻查核與本機手動訂閱授權管理。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {pkgInfo?.canRebuild !== false && (
            <button
              type="button"
              onClick={handleBuildDesktopExe}
              disabled={buildingExe}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${buildingExe ? 'animate-spin' : ''}`} />
              <span>
                {buildingExe
                  ? lang === 'en'
                    ? 'Packaging .exe...'
                    : '封裝 .exe 中...'
                  : lang === 'en'
                  ? 'Rebuild Desktop .exe'
                  : '重新封裝 .exe'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadDesktopExe}
            disabled={downloadingExe || buildingExe}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>
              {downloadingExe
                ? lang === 'en'
                  ? 'Preparing Download...'
                  : '準備下載中...'
                : lang === 'en'
                ? 'Download Digital Product Studio.exe'
                : '下載 Digital Product Studio.exe'}
            </span>
          </button>
        </div>
      </div>

      {pkgStatusMsg && (
        <p role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pkgStatusMsg}</span>
        </p>
      )}
      {pkgError && (
        <p role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{pkgError}</span>
        </p>
      )}

      {/* Section 1: Desktop Packaging & Post-Download Guide */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <StudioLogo size={32} className="shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {lang === 'en'
                  ? 'All-in-One Windows Executable Distribution'
                  : '單檔整合式 Windows 桌面可執行檔'}
              </h2>
              <p className="text-xs text-slate-500">
                {pkgInfo?.runtimeArchitecture || 'Standalone Single-File Windows Executable (PE32+)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {pkgLoading ? (
              <span className="text-slate-500">{lang === 'en' ? 'Inspecting package…' : '檢查封裝狀態…'}</span>
            ) : pkgInfo?.ready ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'en' ? 'Package Built & Ready' : '封裝檔已就緒可下載'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <Terminal className="w-4 h-4" />
                <span>{lang === 'en' ? 'Builds Automatically on Download' : '點擊下載將自動即時封裝'}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block mb-1">{lang === 'en' ? 'Executable File' : '主程式檔案名稱'}</span>
            <strong className="font-mono text-slate-900 block truncate">Digital Product Studio.exe</strong>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block mb-1">{lang === 'en' ? 'Target OS & Format' : '目標系統與架構'}</span>
            <strong className="text-slate-900 block">{pkgInfo?.targetPlatform || 'Windows 10 / 11 (x64)'}</strong>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block mb-1">{lang === 'en' ? 'Bundled Size' : '單檔整合容量'}</span>
            <strong className="font-mono tabular-nums text-slate-900 block">
              {pkgInfo?.ready ? formatMb(pkgInfo.sizeBytes) : lang === 'en' ? 'Pending build' : '尚未編譯'}
            </strong>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-500 block mb-1">{lang === 'en' ? 'SHA-256 Integrity' : 'SHA-256 校驗指紋'}</span>
            <strong
              title={pkgInfo?.sha256 || undefined}
              className="font-mono tabular-nums text-slate-900 block truncate"
            >
              {pkgInfo?.sha256 ? `${pkgInfo.sha256.slice(0, 16)}…` : '—'}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs text-slate-700">
          <div>
            <strong className="text-slate-900 block mb-1">
              {lang === 'en' ? '1. Zero-Dependency Single .exe' : '1. 單一檔案零依賴啟動'}
            </strong>
            <p className="leading-relaxed text-slate-600">
              {lang === 'en'
                ? 'Contains the full React studio UI, Express API server, market intelligence collector, citation verifier, ZIP packager, and local license vault—no Node.js install required.'
                : '完整內嵌 React 介面、Express 後端、市場情報爬蟲、文獻查核與 ZIP 輸出引擎，使用者電腦無需安裝任何運行環境。'}
            </p>
          </div>
          <div>
            <strong className="text-slate-900 block mb-1">
              {lang === 'en' ? '2. Native Desktop Window' : '2. 獨立桌面視窗運行'}
            </strong>
            <p className="leading-relaxed text-slate-600">
              {lang === 'en'
                ? 'Launching Digital Product Studio.exe boots on localhost and opens a dedicated frameless Edge/Chrome app window (Electron source wrapper also included via npm run desktop:electron).'
                : '雙擊執行檔即自動於本機啟動桌面專屬視窗（並隨附 Electron 原始封裝入口，方便進一步產出專屬安裝精靈）。'}
            </p>
          </div>
          <div>
            <strong className="text-slate-900 block mb-1">
              {lang === 'en' ? '3. Post-Download Subscription Vault' : '3. 下載後本機訂閱設定保存'}
            </strong>
            <p className="leading-relaxed text-slate-600">
              {lang === 'en'
                ? 'After downloading, subscribers enter their manual subscription key right here; licenses persist both locally in browser storage and in %APPDATA%\\DigitalProductStudio\\subscription.json.'
                : '下載後使用者可於本頁啟用手動訂閱金鑰，授權狀態將同時儲存於瀏覽器與本機 AppData 訂閱保險箱，重開程式不遺失。'}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Active Subscription Status & Activation (Post-Download User Experience) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {lang === 'en' ? 'Desktop License Status' : '目前桌面端訂閱狀態'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{evaluation.planLabel}</h2>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border ${
                evaluation.health === 'ACTIVE' || evaluation.health === 'TRIAL_ACTIVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : evaluation.health === 'EXPIRING_SOON'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {evaluation.isPaidLicense && evaluation.isEntitled ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : evaluation.health === 'SUSPENDED' || evaluation.health === 'EXPIRED' ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              <span>{evaluation.statusLabel}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{evaluation.reason}</p>

          <dl className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <dt className="text-slate-500">{lang === 'en' ? 'Licensed Email' : '訂閱者信箱'}</dt>
              <dd className="font-medium text-slate-900 mt-0.5 truncate">
                {subscription.subscriberEmail || (lang === 'en' ? 'Not assigned (Trial)' : '未綁定（試用中）')}
              </dd>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <dt className="text-slate-500">{lang === 'en' ? 'Remaining Term' : '剩餘有效天數'}</dt>
              <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                {evaluation.daysRemaining === null
                  ? lang === 'en'
                    ? 'Perpetual'
                    : '永久有效'
                  : `${evaluation.daysRemaining} ${lang === 'en' ? 'days' : '天'}`}
              </dd>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <dt className="text-slate-500">{lang === 'en' ? 'Commercial ZIP Export' : '商業套件匯出權限'}</dt>
              <dd className="font-semibold mt-0.5 text-slate-900">
                {evaluation.canExportCommercialBundle
                  ? lang === 'en'
                    ? 'Unlocked'
                    : '已解鎖'
                  : lang === 'en'
                  ? 'Locked (License Required)'
                  : '已鎖定（需付費訂閱）'}
              </dd>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <dt className="text-slate-500">{lang === 'en' ? 'Payment Reference' : '手動付款備註'}</dt>
              <dd className="font-mono text-slate-900 mt-0.5 truncate">
                {subscription.manualPaymentRef || '—'}
              </dd>
            </div>
          </dl>

          {/* Manual Renewal Instructions Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
            <strong className="text-slate-800 block">
              {lang === 'en' ? 'Manual Subscription & Renewal Instructions' : '手動訂閱與續約流程說明'}
            </strong>
            <p className="text-slate-600 leading-relaxed">{subscription.programConfig.manualPaymentInstructions}</p>
            <p className="text-slate-500">
              {lang === 'en' ? 'Support Contact:' : '授權客服聯絡：'}{' '}
              <span className="font-mono text-slate-800">{subscription.programConfig.supportEmail}</span>
            </p>
          </div>

          {subscription.activePlan !== 'TRIAL' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleToggleSuspend}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5"
              >
                {subscription.isSuspended ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                <span>
                  {subscription.isSuspended
                    ? lang === 'en'
                      ? 'Resume License'
                      : '恢復此授權'
                    : lang === 'en'
                    ? 'Pause Subscription'
                    : '暫停目前訂閱'}
                </span>
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                >
                  {lang === 'en' ? 'Deactivate License' : '解除綁定金鑰'}
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetToTrial}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    {lang === 'en' ? 'Confirm Deactivate' : '確認解除'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    {lang === 'en' ? 'Cancel' : '取消'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activate / Update License Form */}
        <form
          onSubmit={handleActivateLicense}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'en' ? 'Activate or Renew Desktop Subscription Key' : '啟用或續訂桌面版授權金鑰'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">
                {lang === 'en' ? 'Subscriber Email *' : '訂閱者電子郵件 *'}
              </span>
              <input
                type="email"
                required
                value={activateEmail}
                onChange={(e) => setActivateEmail(e.target.value)}
                placeholder="subscriber@company.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">
                {lang === 'en' ? 'Subscriber / Studio Name' : '使用者或工作室名稱'}
              </span>
              <input
                type="text"
                value={activateName}
                onChange={(e) => setActivateName(e.target.value)}
                placeholder={lang === 'en' ? 'Optional display name' : '選填顯示名稱'}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <label className="block space-y-1 sm:col-span-2">
              <span className="font-semibold text-slate-700">
                {lang === 'en' ? 'Manual Subscription Key *' : '手動訂閱金鑰 (DPS1-...) *'}
              </span>
              <input
                type="text"
                required
                value={activateKey}
                onChange={(e) => setActivateKey(e.target.value)}
                placeholder="DPS1-PRO-20271231-A1B2C3-1234ABCD"
                className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 uppercase"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">
                {lang === 'en' ? 'Receipt / Transfer Ref' : '匯款或訂單編號'}
              </span>
              <input
                type="text"
                value={activatePaymentRef}
                onChange={(e) => setActivatePaymentRef(e.target.value)}
                placeholder="INV-2026-104"
                className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          {activationMessage && (
            <p
              role={activationMessage.type === 'error' ? 'alert' : 'status'}
              className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activationMessage.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {activationMessage.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{activationMessage.text}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              {lang === 'en'
                ? 'Keys verify offline via cryptographic signature bound to your subscriber email.'
                : '金鑰透過綁定訂閱者信箱之離線簽章演算法於桌面端即時驗證。'}
            </span>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
            >
              {lang === 'en' ? 'Activate Subscription' : '驗證並啟用訂閱'}
            </button>
          </div>

          {/* 3 Commercial Subscription Plan Tiers Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            {(['PRO_MONTHLY', 'STUDIO_ANNUAL', 'LIFETIME_FOUNDER'] as const).map((planId) => {
              const info = PLAN_CATALOG[planId];
              const price =
                planId === 'PRO_MONTHLY'
                  ? subscription.programConfig.monthlyPriceUsd
                  : planId === 'STUDIO_ANNUAL'
                  ? subscription.programConfig.annualPriceUsd
                  : subscription.programConfig.founderPriceUsd;
              const isCurrent = subscription.activePlan === planId && evaluation.isEntitled;
              return (
                <div
                  key={planId}
                  className={`p-3.5 rounded-lg border space-y-2 text-xs ${
                    isCurrent ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <strong className="text-slate-900">{lang === 'en' ? info.nameEn : info.nameZh}</strong>
                    <span className="font-mono tabular-nums font-bold text-indigo-700">${price}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{lang === 'en' ? info.cadenceEn : info.cadenceZh}</p>
                  <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                    {(lang === 'en' ? info.featuresEn : info.featuresZh).map((feat) => (
                      <li key={feat}>{feat}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </form>
      </section>

      {/* Section 3: Studio Owner Subscription Settings & Manual Key Issuer */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {lang === 'en'
                ? 'Manual Subscription Program Settings & Subscriber Key Issuer'
                : '商業訂閱方案規則設定與手動金鑰簽發控制台'}
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            {lang === 'en'
              ? 'Configure desktop pricing, trial length, export lock policy, and issue buyer keys'
              : '設定月/年/終身方案價格、試用天數、商業匯出鎖定政策與簽發訂閱金鑰'}
          </span>
        </div>

        {/* Owner Policy & Pricing Config Form */}
        <form onSubmit={handleSaveProgramConfig} className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Monthly Price ($)' : '月費方案 ($)'}</span>
              <input
                type="number"
                min={0}
                value={configDraft.monthlyPriceUsd}
                onChange={(e) => setConfigDraft({ ...configDraft, monthlyPriceUsd: Number(e.target.value) })}
                className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Annual Price ($)' : '年費方案 ($)'}</span>
              <input
                type="number"
                min={0}
                value={configDraft.annualPriceUsd}
                onChange={(e) => setConfigDraft({ ...configDraft, annualPriceUsd: Number(e.target.value) })}
                className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Founder Price ($)' : '終身方案 ($)'}</span>
              <input
                type="number"
                min={0}
                value={configDraft.founderPriceUsd}
                onChange={(e) => setConfigDraft({ ...configDraft, founderPriceUsd: Number(e.target.value) })}
                className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Trial Days' : '試用天數'}</span>
              <input
                type="number"
                min={0}
                max={90}
                value={configDraft.trialDays}
                onChange={(e) => setConfigDraft({ ...configDraft, trialDays: Number(e.target.value) })}
                className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block space-y-1 col-span-2">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Support Email' : '客服聯絡信箱'}</span>
              <input
                type="email"
                value={configDraft.supportEmail}
                onChange={(e) => setConfigDraft({ ...configDraft, supportEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start text-xs">
            <label className="block space-y-1 md:col-span-2">
              <span className="font-semibold text-slate-700">
                {lang === 'en' ? 'Manual Payment & Renewal Instructions (Shown Post-Download)' : '手動訂閱付款與續約指引（下載後顯示於授權頁面）'}
              </span>
              <textarea
                rows={2}
                value={configDraft.manualPaymentInstructions}
                onChange={(e) => setConfigDraft({ ...configDraft, manualPaymentInstructions: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 resize-y"
              />
            </label>

            <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={configDraft.enforceExportGate}
                onChange={(e) => setConfigDraft({ ...configDraft, enforceExportGate: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="font-medium text-slate-800">
                {lang === 'en'
                  ? 'Require paid subscription for Buyer ZIP exports'
                  : '鎖定商業 ZIP 匯出直到啟用付費訂閱'}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors"
            >
              {lang === 'en' ? 'Save Subscription Settings' : '儲存訂閱制度設定'}
            </button>
            {configSavedMsg && (
              <p role="status" className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {lang === 'en'
                    ? 'Subscription rules & export gate updated.'
                    : '訂閱規則與匯出授權政策已更新。'}
                </span>
              </p>
            )}
          </div>
        </form>

        {/* Manual Subscriber Key Generator */}
        <div className="pt-5 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === 'en' ? 'Issue New Manual Subscriber Key' : '手動簽發新訂閱者授權金鑰'}
          </h3>

          <form onSubmit={handleIssueManualKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs">
            <label className="block space-y-1 lg:col-span-2">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Buyer Email *' : '買家信箱 *'}</span>
              <input
                type="email"
                value={issueEmail}
                onChange={(e) => setIssueEmail(e.target.value)}
                placeholder="client@business.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Buyer Name' : '買家姓名'}</span>
              <input
                type="text"
                value={issueHolder}
                onChange={(e) => setIssueHolder(e.target.value)}
                placeholder="Taylor Chen"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Subscription Plan' : '授權方案'}</span>
              <select
                value={issuePlan}
                onChange={(e) => {
                  const nextPlan = e.target.value as Exclude<SubscriptionPlanId, 'TRIAL'>;
                  setIssuePlan(nextPlan);
                  if (nextPlan === 'PRO_MONTHLY') setIssueDurationDays(30);
                  if (nextPlan === 'STUDIO_ANNUAL') setIssueDurationDays(365);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
              >
                <option value="PRO_MONTHLY">Creator Pro (Monthly)</option>
                <option value="STUDIO_ANNUAL">Studio Annual (365d)</option>
                <option value="LIFETIME_FOUNDER">Founder Lifetime</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">{lang === 'en' ? 'Term (Days)' : '有效天數'}</span>
              <input
                type="number"
                min={1}
                disabled={issuePlan === 'LIFETIME_FOUNDER'}
                value={issuePlan === 'LIFETIME_FOUNDER' ? 9999 : issueDurationDays}
                onChange={(e) => setIssueDurationDays(Number(e.target.value))}
                className="w-full font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                className="w-full px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
              >
                {lang === 'en' ? 'Issue Key' : '簽發金鑰'}
              </button>
            </div>
          </form>

          {issuerError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {issuerError}
            </p>
          )}

          {/* Issued Subscribers Ledger Table */}
          {subscription.issuedRecords.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              {lang === 'en'
                ? 'No manual subscriber keys issued yet. Generate a key above for a subscriber or test activation on this desktop.'
                : '尚未手動簽發任何訂閱金鑰。於上方輸入買家信箱即可產出可離線驗證之授權金鑰。'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{lang === 'en' ? 'Subscriber' : '訂閱者'}</th>
                    <th className="py-2.5 px-3 font-semibold">{lang === 'en' ? 'Plan' : '方案'}</th>
                    <th className="py-2.5 px-3 font-semibold">{lang === 'en' ? 'License Key' : '金鑰'}</th>
                    <th className="py-2.5 px-3 font-semibold">{lang === 'en' ? 'Expires' : '到期日'}</th>
                    <th className="py-2.5 px-3 font-semibold">{lang === 'en' ? 'Status' : '狀態'}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{lang === 'en' ? 'Actions' : '管理操作'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscription.issuedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-900 block">{rec.holderName}</strong>
                        <span className="text-slate-500">{rec.email}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {lang === 'en' ? PLAN_CATALOG[rec.plan].nameEn : PLAN_CATALOG[rec.plan].nameZh}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 whitespace-nowrap">
                        {rec.licenseKey}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {rec.expiresAt ? rec.expiresAt.slice(0, 10) : lang === 'en' ? 'Lifetime' : '永久'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold">
                        <span
                          className={
                            rec.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'
                          }
                        >
                          {rec.status === 'ACTIVE'
                            ? lang === 'en'
                              ? 'Active'
                              : '有效'
                            : lang === 'en'
                            ? 'Paused'
                            : '暫停'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyKey(rec)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedId === rec.id ? (lang === 'en' ? 'Copied' : '已複製') : (lang === 'en' ? 'Copy' : '複製')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyRecordToApp(rec)}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                          >
                            {lang === 'en' ? 'Apply to App' : '套用授權'}
                          </button>
                          {rec.plan !== 'LIFETIME_FOUNDER' && (
                            <button
                              type="button"
                              onClick={() => handleExtendRecord30Days(rec.id)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              +30d
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleRecordStatus(rec.id)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            {rec.status === 'ACTIVE'
                              ? lang === 'en'
                                ? 'Pause'
                                : '暫停'
                              : lang === 'en'
                              ? 'Resume'
                              : '恢復'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
