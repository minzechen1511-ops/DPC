import React, { useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  TrendingUp,
  BookOpen,
  Archive,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  Cpu,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase.ts';
import { StudioLogo } from './StudioLogo.tsx';
import { Language } from '../utils/i18n.ts';
import { ScientificWorkflowDiagram } from './ScientificVisuals.tsx';
import { checkGeminiConfiguration, checkSignInDomain, DomainAccess } from '../utils/signInSetup.ts';

interface GoogleSignInGateProps {
  lang: Language;
  setLang: (lang: Language) => void;
  initialError?: string | null;
}

export const GoogleSignInGate: React.FC<GoogleSignInGateProps> = ({
  lang,
  setLang,
  initialError = null,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [domainAccess, setDomainAccess] = useState<DomainAccess | 'checking'>('checking');
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(false);
  const hostname = window.location.hostname;
  const projectId = auth.app.options.projectId || '';
  const consoleUrl = `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/authentication/settings`;

  const refreshSetup = async () => {
    setCheckingSetup(true);
    const [domain, gemini] = await Promise.all([
      checkSignInDomain(auth.app.options.apiKey || '', window.location.href),
      checkGeminiConfiguration(),
    ]);
    setDomainAccess(domain);
    setGeminiConfigured(gemini);
    setCheckingSetup(false);
  };

  useEffect(() => { void refreshSetup(); }, []);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.emailVerified) {
        await signOut(auth);
        setErrorMsg(
          lang === 'en'
            ? 'Your Google account must have a verified email address to access Digital Product Studio.'
            : '您的 Google 帳戶須具備已驗證的電子郵件才能存取數位產品工作室。'
        );
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setDomainAccess('unauthorized');
        setErrorMsg(lang === 'en'
          ? `Google sign-in is blocked because ${hostname} is not authorized in Firebase. Follow the domain setup instructions below, then reload this Studio page.`
          : `Firebase 尚未授權 ${hostname}，因此無法使用 Google 登入。請依下方網域設定說明操作，再重新載入此工作室頁面。`);
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(lang === 'en'
          ? 'Enable the Google sign-in provider in Firebase Authentication > Sign-in method.'
          : '請在 Firebase Authentication > 登入方式啟用 Google 登入供應商。');
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg(
          lang === 'en'
            ? 'Sign-in window closed before completing authentication.'
            : 'Google 登入視窗已關閉，尚未完成驗證。'
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(
          lang === 'en'
            ? 'Browser popup was blocked. Please allow popups for this studio and try again.'
            : '瀏覽器封鎖了彈出式登入視窗，請允許彈出視窗後再試一次。'
        );
      } else {
        setErrorMsg(
          err?.message ||
            (lang === 'en'
              ? 'Could not complete Google Sign-In. Please retry.'
              : '無法完成 Google 登入，請再試一次。')
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  const pillars = [
    {
      icon: TrendingUp,
      accent: 'text-sky-700 bg-sky-50 border-sky-200',
      title: lang === 'en' ? '1. Live Market Intelligence (Gate A)' : '1. 即時多平台市場情報 (Gate A)',
      desc:
        lang === 'en'
          ? 'Compare Kindle and Apple Books chart observations with reviewed Whop, Gumroad, Etsy and Payhip offers, NYT/Keepa reports and Google Trends context.'
          : '比對 Kindle、Apple Books 排行、Whop、Gumroad、Etsy、Payhip 商品，以及 NYT、Keepa、Google Trends 的覆核脈絡；題材仍需驗證。',
    },
    {
      icon: BookOpen,
      accent: 'text-teal-700 bg-teal-50 border-teal-200',
      title: lang === 'en' ? '2. Evidence-Backed Authoring' : '2. 文獻實證與長篇內容生成',
      desc:
        lang === 'en'
          ? 'Ground every chapter with retrieved academic/government citations, worksheets & Product Bible continuity.'
          : '串接真實文獻引用、章節大綱與伴隨工作表，並於出版前通過嚴格查核關卡。',
    },
    {
      icon: Archive,
      accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      title: lang === 'en' ? '3. Turnkey Buyer Bundle (.zip)' : '3. 完整商業交付成品套件 (.zip)',
      desc:
        lang === 'en'
          ? 'Export executive summary playbooks, styled printable e-books, interactive checklists & launch copy.'
          : '一鍵打包執行摘要、圖文並茂之電子書、練習工具表與定價銷售文案。',
    },
  ];

  return (
    <div className="min-h-screen scientific-grid-bg text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StudioLogo size={30} />
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Digital Product Studio
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-2 text-xs font-mono text-slate-600">
              <Cpu className="w-3.5 h-3.5 text-teal-700" />
              <span>GEMINI 4 SCIENTIFIC WORKSPACE</span>
            </span>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  lang === 'en' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('zh')}
                aria-pressed={lang === 'zh'}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  lang === 'zh' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                繁中
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Full-Screen Widescreen Hero */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch">
          {/* Left Editorial + Scientific Architecture Column */}
          <div className="lg:col-span-7 xl:col-span-8 order-last lg:order-first flex flex-col justify-center space-y-6">
            <div className="flex items-start sm:items-center gap-2 text-xs font-mono font-semibold text-teal-800 leading-snug">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {lang === 'en'
                  ? 'COMMERCIAL CLOUD EDITION · POWERED BY GOOGLE GEMINI'
                  : '正式商業雲端版 · 由 GOOGLE GEMINI 科學研發引擎驅動'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              {lang === 'en'
                ? 'Research, Author & Package Digital Products in One Studio'
                : '一站式實證研究、撰寫並打包數位商品'}
            </h1>

            <p className="text-base lg:text-lg text-slate-600 leading-relaxed max-w-5xl">
              {lang === 'en'
                ? 'Sign in with Google for your cloud workspace and marketplace research. AI generation uses a separately configured server-side Gemini API key.'
                : '使用 Google 登入雲端工作區並進行市場研究。AI 內容生成使用另外設定於伺服器端的 Gemini API 金鑰。'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="bg-white/95 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-xs"
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${p.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{p.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>

            <ScientificWorkflowDiagram lang={lang} />
          </div>

          {/* Right Sign-In Card */}
          <div className="lg:col-span-5 xl:col-span-4 order-first lg:order-last flex flex-col justify-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 xl:p-10 shadow-md space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {lang === 'en' ? 'Google Account Authentication' : 'Google 帳戶安全驗證'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {lang === 'en' ? 'Open Your Studio Workspace' : '登入進入數位產品工作室'}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'en'
                    ? 'Your Google sign-in identifies your Cloud Firestore workspace. It does not provide a Gemini API key or transfer your Gemini subscription quota.'
                    : 'Google 登入用於識別您的 Cloud Firestore 工作區，不會提供 Gemini API 金鑰，也不會轉移您的 Gemini 訂閱額度。'}
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-3 break-words" aria-live="polite">
                <p className="font-semibold">
                  {lang === 'en' ? 'Sign-in domain: ' : '登入網域：'}
                  <span className="font-mono">{hostname}</span>
                </p>
                {domainAccess === 'unauthorized' ? (
                  <div className="space-y-2 text-amber-950">
                    <p>{lang === 'en'
                      ? `Domain authorization required. In Firebase project ${projectId}, open Authentication → Settings → Authorized domains → Add domain and add exactly:`
                      : `需要授權此網域。請在 Firebase 專案 ${projectId} 開啟 Authentication → 設定 → 已授權網域 → 新增網域，加入：`}</p>
                    <code className="block font-bold select-all">{hostname}</code>
                    <p>{lang === 'en'
                      ? 'Enter only the hostname, without http://, a port or a path. A project owner/admin must make this change. Keep existing domains. If you also use localhost, add it separately. After saving, reload this Studio page to reset Firebase’s cached domain check.'
                      : '僅填主機名稱，不含 http://、連接埠或路徑。需要專案擁有者／管理員設定，並保留現有網域。若也使用 localhost，請另外加入。儲存後請重新載入此工作室頁面，以重設 Firebase 快取的網域檢查。'}</p>
                    <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      {lang === 'en' ? 'Open Firebase domain settings' : '開啟 Firebase 網域設定'}
                    </a>
                  </div>
                ) : <p>{domainAccess === 'authorized'
                  ? (lang === 'en' ? 'This hostname is on Firebase’s live allowlist. Account sign-in still needs to complete.' : '此主機名稱已在 Firebase 的即時授權清單中，仍需完成帳戶登入。')
                  : (lang === 'en' ? 'Domain authorization has not been confirmed. You can retry the check or attempt sign-in.' : '尚未確認網域授權狀態，可重新檢查或嘗試登入。')}</p>}
                <p>{geminiConfigured === true
                  ? (lang === 'en' ? 'Server Gemini API key: configured; model access and quota still require a connection test after sign-in.' : '伺服器 Gemini API 金鑰：已設定；登入後仍需測試模型權限與額度。')
                  : geminiConfigured === false
                    ? (lang === 'en' ? 'Server Gemini API key: missing. Configure GEMINI_API_KEY in the server .env or deployment secrets, then restart/redeploy. Never put it in browser code.' : '伺服器 Gemini API 金鑰：未設定。請於伺服器 .env 或部署密鑰設定 GEMINI_API_KEY，再重新啟動／部署。請勿放入瀏覽器程式碼。')
                    : (lang === 'en' ? 'Server Gemini API key: configuration could not be confirmed.' : '伺服器 Gemini API 金鑰：無法確認設定。')}</p>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="block underline">
                  {lang === 'en' ? 'Manage Gemini API keys in Google AI Studio' : '在 Google AI Studio 管理 Gemini API 金鑰'}
                </a>
                <button type="button" onClick={() => void refreshSetup()} disabled={checkingSetup} className="underline font-semibold disabled:opacity-60">
                  {checkingSetup ? (lang === 'en' ? 'Checking setup…' : '正在檢查設定…') : (lang === 'en' ? 'Recheck setup' : '重新檢查設定')}
                </button>
                <button type="button" onClick={() => window.location.reload()} className="block underline font-semibold">
                  {lang === 'en' ? 'Reload Studio after changing domain settings' : '變更網域設定後重新載入工作室'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full py-4 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer"
              >
                {signingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                )}
                <span>
                  {signingIn
                    ? lang === 'en'
                      ? 'Connecting Google Account...'
                      : '正在連接 Google 帳戶...'
                    : lang === 'en'
                    ? 'Sign in with Google'
                    : '使用 Google 帳戶登入'}
                </span>
              </button>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                <p>
                  {lang === 'en'
                    ? 'Google sign-in and server Gemini API credentials are configured separately.'
                    : 'Google 登入與伺服器 Gemini API 憑證需要分別設定。'}
                </p>
                <p>
                  {lang === 'en'
                    ? 'Gate A / B / C reviews determine export readiness.'
                    : 'Gate A / B / C 覆核決定匯出就緒狀態。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
