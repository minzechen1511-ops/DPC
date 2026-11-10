import React from 'react';
import { Download, Play, Settings2, Globe, Sparkles } from 'lucide-react';
import { DigitalProductProject, StageId } from '../types/project.ts';
import { STAGE_METADATA, getStageMetadata } from '../utils/workflowEngine.ts';
import { Language, translations } from '../utils/i18n.ts';

interface HeaderProps {
  project: DigitalProductProject;
  activeView: StageId | 'dashboard' | 'new_project' | 'my_projects' | 'ai_settings' | 'automation_settings';
  setActiveView: (view: any) => void;
  onRunAutopilot: () => void;
  isAutopilotRunning: boolean;
  progressPercent: number;
  lang: Language;
  setLang: (lang: Language) => void;
  onLoadDemoProject?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  activeView,
  setActiveView,
  onRunAutopilot,
  isAutopilotRunning,
  progressPercent,
  lang,
  setLang,
  onLoadDemoProject,
}) => {
  const t = translations[lang];

  const currentStageMeta = getStageMetadata(activeView, lang) || {
    title:
      activeView === 'dashboard'
        ? t.navDashboard
        : activeView === 'new_project'
        ? t.navNewProject
        : activeView === 'my_projects'
        ? t.navMyProjects
        : activeView === 'ai_settings'
        ? t.navAiSettings
        : t.navAutomationSettings,
    subtitle: t.subtitle,
  };

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-6 shrink-0 select-none">
      {/* Zone 1: Brand Wordmark (Single text element) & Project Context */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActiveView('dashboard')}
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors whitespace-nowrap"
        >
          {t.appName}
        </button>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-medium text-slate-600 whitespace-nowrap truncate max-w-[220px]">
          {project.charter?.productTitle || project.name || t.untitledProject}
        </span>
        {project.isBlankProject && (
          <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Blank
          </span>
        )}
      </div>

      {/* Zone 2: Contextual Stage Title & Active Model */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 truncate">
        <span className="font-semibold text-slate-800">{currentStageMeta.title}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="text-slate-500">{currentStageMeta.subtitle}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
          {project.aiSettings.provider?.toUpperCase()}: {project.aiSettings.defaultModel || 'default'}
        </span>
      </div>

      {/* Zone 3: Primary Action & Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Sample Demo Quick Load Button if on blank or accessible */}
        {project.isBlankProject && onLoadDemoProject && (
          <button
            onClick={onLoadDemoProject}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap"
            title="Load the completed 28-Day Budget Meal Plan as a sample reference"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'en' ? 'Load Sample Demo' : '載入範例資料'}</span>
          </button>
        )}

        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 rounded font-semibold transition-colors ${
              lang === 'en' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Switch UI to English"
          >
            EN
          </button>
          <button
            onClick={() => setLang('zh')}
            className={`px-2 py-1 rounded font-semibold transition-colors ${
              lang === 'zh' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="切換介面為繁體中文"
          >
            繁中
          </button>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setActiveView('ai_settings')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title={t.aiSettings}
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Export Center Button */}
        <button
          onClick={() => setActiveView('export_center')}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.exportProduct}</span>
        </button>

        {/* Run Autopilot Primary CTA */}
        <button
          onClick={onRunAutopilot}
          disabled={isAutopilotRunning}
          className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
            isAutopilotRunning
              ? 'bg-amber-600 cursor-not-allowed opacity-90'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
          }`}
        >
          {isAutopilotRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{t.autopilotRunning}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.runAutopilot}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
