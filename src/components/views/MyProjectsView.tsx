import React, { useRef } from 'react';
import { FolderKanban, PlusCircle, Download, Upload, RotateCcw, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { DEMO_PROJECT, BLANK_PROJECT } from '../../data/demoProject.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface MyProjectsViewProps {
  currentProject: DigitalProductProject;
  onLoadProject: (project: DigitalProductProject) => void;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({
  currentProject,
  onLoadProject,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${currentProject.projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.projectId && (parsed.charter || parsed.name)) {
          onLoadProject(parsed);
          alert(lang === 'en' ? 'Project restored successfully!' : '專案備份檔已成功還原！');
          setActiveView('dashboard');
        } else {
          alert(lang === 'en' ? 'Invalid project backup JSON file.' : '匯入的檔案不是有效的專案備份檔。');
        }
      } catch (err: any) {
        alert(lang === 'en' ? `Parse error: ${err.message}` : `解析失敗: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>{t.navMyProjects}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === 'en' ? 'Digital Product Projects & Templates' : '我的數位產品專案庫與範例'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? 'Switch between your active project, the official 28-Day Budget Meal Plan sample template, or create a new blank project.'
              : '可在進行中專案、28天平價餐桌計畫官方範例與全新空白專案之間快速切換，亦支援結構化 JSON 備份'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Import JSON' : '匯入專案 JSON'}</span>
          </button>
          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Export Backup' : '匯出專案備份'}</span>
          </button>
          <button
            onClick={() => {
              onLoadProject({
                ...BLANK_PROJECT,
                projectId: `proj_${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setActiveView('dashboard');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            + {lang === 'en' ? 'New Blank Project' : '建立全新空白專案'}
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Project */}
        <div className="bg-white border-2 border-indigo-600 rounded-xl p-6 space-y-3 relative flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block mb-2">
              {lang === 'en' ? 'Active Project' : '目前啟用中'}
            </span>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-400 block truncate">
                ID: {currentProject.projectId}
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {currentProject.charter?.productTitle || currentProject.name || t.untitledProject}
              </h2>
              <p className="text-xs text-slate-600 line-clamp-2">
                {currentProject.charter?.subtitle || currentProject.charter?.centralPromise || (lang === 'en' ? 'Custom workspace project' : '自訂專案工作區')}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block">{t.sources}</span>
                <strong>{currentProject.referenceLibrary?.verifiedCount || (currentProject.referenceLibrary?.cards || []).length} 篇</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t.chapters}</span>
                <strong>{(currentProject.outline || []).filter((c) => c.isCompleted).length} 章</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">QA</span>
                <strong className="text-emerald-600">{currentProject.qualityReport?.overallScore || 0}/100</strong>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-400 text-[11px]">
                {currentProject.isBlankProject ? (lang === 'en' ? 'Blank Project' : '空白專案') : (lang === 'en' ? 'In Progress' : '進行中')}
              </span>
              <button
                onClick={() => setActiveView('dashboard')}
                className="text-indigo-600 font-semibold hover:text-indigo-800"
              >
                {lang === 'en' ? 'Open Dashboard &rarr;' : '進入工作台 &rarr;'}
              </button>
            </div>
          </div>
        </div>

        {/* Master Demonstration Project */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {lang === 'en' ? 'Sample Master Reference' : '官方完整示範專案'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">{DEMO_PROJECT.projectId}</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">{DEMO_PROJECT.charter.productTitle}</h2>
              <p className="text-xs text-slate-600">{DEMO_PROJECT.charter.subtitle}</p>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {lang === 'en'
                ? 'Complete 8-chapter manuscript (16,840 words), 20 USDA/EPA research cards, 28 recipes, and launch asset bundle.'
                : '涵蓋 USDA/EPA/FDA 20 篇七部分知識卡、全書 8 章 16,840 字、28 道平價家庭食譜與完整上市套件。'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-medium text-[11px]">
              {lang === 'en' ? '100% Completed' : '全階段 100% 完工'}
            </span>
            <button
              onClick={() => {
                onLoadProject(DEMO_PROJECT);
                alert(lang === 'en' ? 'Loaded 28-Day Budget Meal Plan master sample project!' : '已載入「Budget Family Meal Planning」官方完整展示專案！');
                setActiveView('dashboard');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'en' ? 'Load Sample' : '載入此示範'}</span>
            </button>
          </div>
        </div>

        {/* Blank Project Template */}
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 space-y-3 flex flex-col justify-between hover:border-indigo-400 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {lang === 'en' ? 'Blank Starter Template' : '全新空白起點'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">proj_blank</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Clean Slate Workspace' : '乾淨空白工作區'}
              </h2>
              <p className="text-xs text-slate-600">
                {lang === 'en'
                  ? 'Start from stage 1 without pre-existing sample data, ready for your custom market niche.'
                  : '從第一階段市場情報開始，不含任何預設餐桌範例資料，準備發掘你的專屬利基題材。'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">{lang === 'en' ? 'Clean Initial State' : '空白初始狀態'}</span>
            <button
              onClick={() => {
                onLoadProject({
                  ...BLANK_PROJECT,
                  projectId: `proj_${Date.now()}`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                alert(lang === 'en' ? 'Reset to clean blank project!' : '已切換為全新空白專案！');
                setActiveView('dashboard');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>{lang === 'en' ? 'Reset to Blank' : '切換為空白'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
