import React, { useState } from 'react';
import { PlusCircle, Sparkles, CheckCircle2, Layers, Globe, ShieldCheck } from 'lucide-react';
import { ProductFormat, MarketRegion } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface NewProjectWizardProps {
  onStartProject: (params: {
    projectName: string;
    market: MarketRegion;
    language: string;
    productFormat: ProductFormat;
    referenceTarget: 8 | 20 | 30;
  }) => Promise<void>;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  onStartProject,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [projectName, setProjectName] = useState<string>(
    lang === 'en' ? 'New Digital Product Project' : '新數位商品專案'
  );
  const [market, setMarket] = useState<MarketRegion>('US');
  const [language, setLanguage] = useState<string>(lang === 'en' ? 'English' : '繁體中文');
  const [productFormat, setProductFormat] = useState<ProductFormat>('ebook_toolkit');
  const [referenceTarget, setReferenceTarget] = useState<8 | 20 | 30>(20);

  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true); setCreationError('');
    try { await onStartProject({
      projectName,
      market,
      language,
      productFormat,
      referenceTarget,
    });
    } catch (error) {setCreationError(error instanceof Error ? error.message : 'Could not create project. Retry without losing your inputs.');}
    finally {setCreating(false);}
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {creating && <p role="status">{lang === 'en' ? 'Creating and saving your project…' : '正在建立並儲存您的專案…'}</p>}
      {creationError && <p role="alert" className="p-3 text-rose-900 bg-rose-50 rounded-lg">{creationError}</p>}
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
          <PlusCircle className="w-4 h-4" />
          <span>{t.navNewProject}</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {lang === 'en' ? 'Start a digital product' : '開始數位商品開發'}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-4xl">
          {lang === 'en'
            ? 'Start with Topic Discovery: scan sources, compare evidence and choose a topic on one page. Defaults are editable; no detailed creator form is required.'
            : '設定目標市場、輸出語言、產品型態與研究深度，立即啟動 MTRE 即時市場情報偵測與高變現選題推薦。'}
        </p>
      </div>

      {/* Full-Width 2-Column Laboratory Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 space-y-6">
          <div className="space-y-2">
            <label htmlFor="new-project-name" className="block text-sm font-bold text-slate-800">
              {lang === 'en' ? 'Project Name' : '專案暫定名稱'}
            </label>
            <input
              id="new-project-name" type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3"
              required
            />
          </div>

          <details><summary className="cursor-pointer font-semibold text-teal-800 mb-3">{lang === 'en' ? 'Optional project defaults' : '選用專案預設值'}</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                {lang === 'en' ? 'Target Market Region' : '目標市場區域'}
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as MarketRegion)}
                className="w-full font-medium bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              >
                <option value="US">US — United States (Primary Digital Market)</option>
                <option value="GLOBAL_EN">Global English Market (US, UK, CA, AU)</option>
                <option value="UK">UK — United Kingdom</option>
                <option value="TW">TW — Taiwan (繁體中文市場)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                {lang === 'en' ? 'Product Output Language' : '產品主要語言'}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full font-medium bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              >
                <option value="English">English (Recommended Default)</option>
                <option value="繁體中文">繁體中文 (Traditional Chinese)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                {lang === 'en' ? 'Core Delivery Format' : '核心交付產品型態'}
              </label>
              <select
                value={productFormat}
                onChange={(e) => setProductFormat(e.target.value as ProductFormat)}
                className="w-full font-medium bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              >
                <option value="ebook_toolkit">Comprehensive Ebook + Companion Toolkits</option>
                <option value="workbook">Guided Implementation Workbook + Trackers</option>
                <option value="template_bundle">Plug-and-Play Template Bundle + SOP Playbook</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                {lang === 'en' ? 'Evidence Source Depth' : '目標實證文獻規格'}
              </label>
              <select
                value={referenceTarget}
                onChange={(e) => setReferenceTarget(Number(e.target.value) as 8 | 20 | 30)}
                className="w-full font-mono font-medium bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
              >
                <option value={8}>8 sources (Compact Guide)</option>
                <option value={20}>20 sources (Standard Flagship)</option>
                <option value={30}>30 sources (Authoritative Edition)</option>
              </select>
            </div>
          </div>

          </details>
          <button
            type="submit" disabled={creating}
            className="w-full py-3.5 px-6 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-2.5 shadow-sm"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>{lang === 'en' ? 'Create project & discover topics →' : '建立專案並探索題材 →'}</span>
          </button>
        </form>

        {/* Live Architectural Specification Preview */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider">
                {lang === 'en' ? 'Blueprint Specification' : '專案產線配置預覽'}
              </span>
              <Layers className="w-4 h-4 text-sky-600" />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-mono text-slate-500">PROJECT TITLE</div>
              <div className="text-base font-bold text-slate-900">{projectName || '—'}</div>
              <div className="flex flex-wrap gap-2 pt-2 text-xs font-mono text-slate-600">
                <span>Region: {market}</span>
                <span>·</span>
                <span>Lang: {language}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
                <div>
                  <strong className="block text-slate-900">{lang === 'en' ? 'Stage 1 · Live Chart Feed' : '第一階段 · 即時排行驗證'}</strong>
                  <span className="text-xs text-slate-600">{lang === 'en' ? 'Fetches verified rankings before topic approval.' : '自動對照公開暢銷排行並過濾無實證題材。'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-600 mt-1 shrink-0" />
                <div>
                  <strong className="block text-slate-900">{lang === 'en' ? 'Gate B & C Verification' : '雙重學術/商業品質閘門'}</strong>
                  <span className="text-xs text-slate-600">
                    {lang === 'en'
                      ? `Calibrated for ${referenceTarget} source cards and full buyer bundle export.`
                      : `配置 ${referenceTarget} 篇實證文獻指標與完整商業套件匯出規範。`}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <strong className="block text-slate-900">{lang === 'en' ? 'Deliverable Package' : '交付格式'}</strong>
                  <span className="text-xs font-mono text-slate-600">{productFormat}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 font-medium">
            {lang === 'en'
              ? 'All workspace mutations auto-sync to your private Cloud Firestore repository.'
              : '所有專案設定將自動安全同步至您個人的雲端資料庫。'}
          </div>
        </aside>
      </div>
    </div>
  );
};
