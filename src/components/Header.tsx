import React from 'react';
import { Download, Settings2, Menu, Cloud, RefreshCw, AlertTriangle, LogOut, Sparkles } from 'lucide-react';
import { DigitalProductProject, StageId } from '../types/project.ts';
import { getStageMetadata } from '../utils/workflowEngine.ts';
import { Language, translations } from '../utils/i18n.ts';
import { StudioLogo } from './StudioLogo.tsx';

export type LocalSaveStatus = 'local' | 'saving' | 'saved' | 'error' | 'conflict';

interface HeaderProps {
  onToggleNavigation: () => void;
  navigationOpen: boolean;
  project: DigitalProductProject;
  activeView: StageId | 'dashboard' | 'new_project' | 'my_projects' | 'ai_settings' | 'automation_settings';
  setActiveView: (view: any) => void;
  progressPercent: number;
  lang: Language;
  setLang: (lang: Language) => void;
  saveStatus?: LocalSaveStatus;
  workspaceReady?:boolean;
  workspaceLoading?:boolean;
  activeRevision?: number;
  onRetrySave?: () => void;
  onReloadProject?: () => void;
  userEmail?: string | null;
  userDisplayName?: string | null;
  userPhotoUrl?: string | null;
  onSignOut?: () => void;
  onOpenCopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleNavigation,
  navigationOpen,
  project,
  activeView,
  setActiveView,
  progressPercent: _progressPercent,
  lang,
  setLang,
  saveStatus = 'saved',
  workspaceReady=true,
  workspaceLoading=false,
  activeRevision,
  onRetrySave,
  onReloadProject,
  userEmail,
  userDisplayName,
  userPhotoUrl,
  onSignOut,
  onOpenCopilot,
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
    <header className="workspace-header px-4 lg:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Zone 1: Brand Emblem & Wordmark + Active Workspace */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="navigation-toggle p-2"
          onClick={onToggleNavigation}
          aria-label={lang === 'en' ? 'Toggle navigation' : '切換導覽'}
          aria-expanded={navigationOpen}
          aria-controls="workspace-navigation"
        >
          <Menu size={22} />
        </button>
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2.5 text-base xl:text-lg font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0"
        >
          <StudioLogo size={26} className="shrink-0" />
          <span>{t.appName}</span>
        </button>
        <span className="hidden xl:inline text-sm text-slate-400" aria-hidden="true">/</span>
        <span className="hidden xl:inline text-sm font-medium text-slate-700 whitespace-nowrap truncate max-w-[240px]">
          {project.charter?.productTitle || project.name || t.untitledProject}
        </span>
      </div>

      {/* Zone 2: Stage Context & AI Engine Readout */}
      <div className="hidden 2xl:flex items-center gap-3 text-xs text-slate-600 truncate">
        <span className="font-semibold text-sm text-slate-900">{currentStageMeta.title}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <button
          type="button"
          onClick={() => setActiveView('ai_settings')}
          title={lang === 'en' ? 'Click to switch AI model or Token-Saver mode' : '點擊切換 AI 模型或省 Token 模式'}
          className="font-mono text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {(project.aiSettings?.provider || 'gemini').toUpperCase()}:{' '}
          {project.aiSettings?.defaultModel || 'gemini-4-hydrogen'} ·{' '}
          {(project.aiSettings?.tokenSaverMode || 'economy').toUpperCase()}
        </button>
      </div>

      {/* Zone 3: Cloud Sync, Language Switcher, Settings, Export & Account */}
      <div className="header-actions flex flex-wrap items-center gap-2.5 shrink-0">
        <div className="flex items-center">
          {!workspaceReady && <span role="status" className="px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs">{workspaceLoading?(lang==='en'?'Loading workspace…':'載入工作區中…'):(lang==='en'?'Workspace not loaded':'工作區尚未載入')}</span>}
          {workspaceReady && saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{lang === 'en' ? 'Syncing...' : '同步中...'}</span>
            </span>
          )}
          {workspaceReady && (saveStatus === 'saved' || saveStatus === 'local') && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>
                {saveStatus==='local'?(lang==='en'?'Local draft':'本機草稿'):(lang === 'en' ? 'Cloud Synced' : '雲端已同步')}
                {typeof activeRevision === 'number' ? ` · r${activeRevision}` : ''}
              </span>
            </span>
          )}
          {workspaceReady && saveStatus === 'error' && (
            <button
              type="button"
              onClick={onRetrySave}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Sync Error · Retry' : '同步失敗 · 重試'}</span>
            </button>
          )}
          {workspaceReady && saveStatus === 'conflict' && (
            <button
              type="button"
              onClick={onReloadProject}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold hover:bg-amber-100"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Revision Conflict · Reload' : '版次衝突 · 重新載入'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors whitespace-nowrap ${
              lang === 'en' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={lang === 'en'}
            title="Switch UI to English"
          >
            EN
          </button>
          <button
            onClick={() => setLang('zh')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors whitespace-nowrap ${
              lang === 'zh' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={lang === 'zh'}
            title="切換介面為繁體中文"
          >
            繁中
          </button>
        </div>

        {onOpenCopilot && (
          <button
            type="button"
            onClick={onOpenCopilot}
            aria-label={lang === 'en' ? 'Open Gemini Copilot' : '開啟 Gemini 助理'}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'en' ? 'AI Copilot' : 'Gemini 助理'}</span>
          </button>
        )}

        <button
          onClick={() => setActiveView('ai_settings')}
          className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title={t.aiSettings}
          aria-label={t.aiSettings}
        >
          <Settings2 className="w-4 h-4" />
        </button>

        <button
          aria-label={t.exportProduct}
          onClick={() => setActiveView('export_center')}
          className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{t.exportProduct}</span>
        </button>

        {(userEmail || userDisplayName) && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt={userDisplayName || userEmail || 'User'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-slate-200 object-cover shrink-0"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center justify-center shrink-0">
                {(userDisplayName || userEmail || 'U').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span
              className="hidden md:inline text-xs font-semibold text-slate-700 max-w-[140px] truncate"
              title={userEmail || userDisplayName || ''}
            >
              {userDisplayName || userEmail}
            </span>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title={lang === 'en' ? 'Sign out of Google account' : '登出 Google 帳戶'}
                aria-label={lang === 'en' ? 'Sign out' : '登出'}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
