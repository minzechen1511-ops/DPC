import React, { useState } from 'react';
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
      if (code === 'auth/popup-closed-by-user') {
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
                ? 'Research, Author & Package Profitable Digital Products in One Studio'
                : '一站式實證研究、撰寫並打包高變現商業數位商品'}
            </h1>

            <p className="text-base lg:text-lg text-slate-600 leading-relaxed max-w-5xl">
              {lang === 'en'
                ? 'Sign in with your Google account to unlock live marketplace discovery, evidence-backed chapter generation using our managed Gemini token, and cloud-synced multi-project workspaces.'
                : '登入您的 Google 帳戶即可啟用全套實證數位商品研發產線：直接調用伺服器端託管 Gemini Token 生成高精度電子書與實作工具包，並於雲端安全隔離同步。'}
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
                    ? 'Your projects are isolated to your Google account in Cloud Firestore, with instant access to server-side Gemini AI generation.'
                    : '所有專案將嚴格隔離並同步保存於您個人的雲端工作區，登入後即可立即使用 Gemini 進行商品開發。'}
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
                    ? '✓ Managed server-side Gemini 4 token — zero manual API key setup required'
                    : '✓ 內建伺服器端 Gemini 4 Token — 無需自行申請或貼上 API 金鑰'}
                </p>
                <p>
                  {lang === 'en'
                    ? '✓ Gate A / B / C quality verification & instant commercial ZIP export'
                    : '✓ Gate A / B / C 商業品質稽核與即開即賣 ZIP 套件匯出'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
