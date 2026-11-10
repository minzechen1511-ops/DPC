import React, { useState } from 'react';
import { PlusCircle, Sparkles, CheckCircle2, ArrowRight, Play, Layers } from 'lucide-react';
import { DigitalProductProject, ProductFormat, MarketRegion } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface NewProjectWizardProps {
  onStartProject: (params: {
    projectName: string;
    market: MarketRegion;
    language: string;
    productFormat: ProductFormat;
    referenceTarget: 8 | 20 | 30;
  }) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartProject({
      projectName,
      market,
      language,
      productFormat,
      referenceTarget,
    });
    setActiveView('market_research');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{t.navNewProject}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {lang === 'en' ? 'Create a New High-Value Digital Product' : '啟動新數位商品全自動研究與企劃'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === 'en'
            ? 'The system will launch the MTRE market intelligence engine to research high-opportunity niches and generate scored topic candidates.'
            : '系統將自動以所選市場與規格啟動 MTRE 市場研究，推薦具備高商業機會之產品題材'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Project Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            {lang === 'en' ? 'Project Name:' : '專案暫定名稱：'}
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            required
          />
        </div>

        {/* Market & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              {lang === 'en' ? 'Target Market Region:' : '目標市場區域：'}
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as MarketRegion)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="US">US — United States (Primary Digital Market)</option>
              <option value="GLOBAL_EN">Global English Market (US, UK, CA, AU)</option>
              <option value="UK">UK — United Kingdom</option>
              <option value="TW">TW — Taiwan (繁體中文市場)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              {lang === 'en' ? 'Product Output Language:' : '產品主要語言：'}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="English">English (Recommended Default)</option>
              <option value="繁體中文">繁體中文 (Traditional Chinese)</option>
            </select>
          </div>
        </div>

        {/* Product Format */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            {lang === 'en' ? 'Core Delivery Format:' : '核心交付產品型態：'}
          </label>
          <select
            value={productFormat}
            onChange={(e) => setProductFormat(e.target.value as ProductFormat)}
            className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ebook_toolkit">Comprehensive Ebook + Companion Toolkits (Highest Perceived Value)</option>
            <option value="workbook">Guided Implementation Workbook + Trackers</option>
            <option value="template_bundle">Plug-and-Play Template Bundle + SOP Playbook</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{lang === 'en' ? 'Launch Market Intelligence & Discover Niches →' : '啟動市場情報調查並推薦題材 →'}</span>
        </button>
      </form>
    </div>
  );
};
