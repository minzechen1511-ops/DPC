import React from 'react';
import { Download, Settings2, Menu } from 'lucide-react';
import { DigitalProductProject, StageId } from '../types/project.ts';
import { getStageMetadata } from '../utils/workflowEngine.ts';
import { Language, translations } from '../utils/i18n.ts';
import { StudioLogo } from './StudioLogo.tsx';

interface HeaderProps {
  onToggleNavigation: () => void;
  navigationOpen: boolean;
  project: DigitalProductProject;
  activeView: StageId | 'dashboard' | 'new_project' | 'my_projects' | 'ai_settings' | 'automation_settings' | 'subscription_desktop';
  setActiveView: (view: any) => void;
  progressPercent: number;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleNavigation,
  navigationOpen,
  project,
  activeView,
  setActiveView,
  progressPercent,
  lang,
  setLang,
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
        : activeView === 'subscription_desktop'
        ? t.navSubscriptionDesktop
        : t.navAutomationSettings,
    subtitle: t.subtitle,
  };

  return (
    <header className="workspace-header px-4 lg:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Zone 1: Brand Emblem & Wordmark + Project Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button className="navigation-toggle p-2" onClick={onToggleNavigation} aria-label={lang === 'en' ? 'Toggle navigation' : '切換導覽'} aria-expanded={navigationOpen} aria-controls="workspace-navigation"><Menu size={20} /></button>
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2.5 text-sm xl:text-base font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0"
        >
          <StudioLogo size={24} className="shrink-0" />
          <span>{t.appName}</span>
        </button>
        <span className="hidden xl:inline text-xs text-slate-400" aria-hidden="true">/</span>
        <span className="hidden xl:inline text-xs font-medium text-slate-600 whitespace-nowrap truncate max-w-[200px]">
          {project.charter?.productTitle || project.name || t.untitledProject}
        </span>
        {project.isBlankProject && (
          <>
            <span className="hidden sm:inline text-xs text-slate-300" aria-hidden="true">·</span>
            <span className="hidden sm:inline text-xs font-medium text-amber-700 whitespace-nowrap">
              {lang === 'en' ? 'Blank Workspace' : '空白專案'}
            </span>
          </>
        )}
      </div>

      {/* Zone 2: Contextual Stage Title & Active Model */}
      <div className="hidden 2xl:flex items-center gap-3 text-xs text-slate-500 truncate">
        <span className="font-semibold text-slate-800">{currentStageMeta.title}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="text-slate-500">{currentStageMeta.subtitle}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
          {project.aiSettings.provider?.toUpperCase()}: {project.aiSettings.defaultModel || 'default'}
        </span>
      </div>

      {/* Zone 3: Primary Action & Controls */}
      <div className="header-actions flex items-center gap-2 shrink-0">
        {/* Language Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 rounded font-semibold transition-colors ${
              lang === 'en' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-pressed={lang === 'en'}
            title="Switch UI to English"
          >
            EN
          </button>
          <button
            onClick={() => setLang('zh')}
            className={`px-2 py-1 rounded font-semibold transition-colors ${
              lang === 'zh' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-pressed={lang === 'zh'}
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
          aria-label={t.aiSettings}
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Export Center Button */}
        <button
          aria-label={t.exportProduct}
          onClick={() => setActiveView('export_center')}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.exportProduct}</span>
        </button>


      </div>
    </header>
  );
};
