import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  TrendingUp,
  Sparkles,
  FileText,
  Target,
  GitFork,
  BookOpen,
  Compass,
  ListTree,
  Feather,
  Layers,
  ShieldCheck,
  Palette,
  Tag,
  Download,
  FolderKanban,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  X,
} from 'lucide-react';
import { DigitalProductProject, StageId } from '../types/project.ts';
import { Language, translations } from '../utils/i18n.ts';

export type NavigationItem =
  | StageId
  | 'dashboard'
  | 'new_project'
  | 'my_projects'
  | 'ai_settings'
  | 'automation_settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  project: DigitalProductProject;
  activeView: NavigationItem;
  setActiveView: (view: NavigationItem) => void;
  progressPercent: number;
  lang?: Language;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isStage?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  project,
  activeView,
  setActiveView,
  progressPercent,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [query, setQuery] = useState('');

  const getStageStatusIcon = (stageId: StageId) => {
    const status = project.workflow.stageStatuses[stageId];
    if (status === 'COMPLETED') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (status === 'NEEDS_REVIEW' || status === 'PARTIAL') {
      return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (status === 'RUNNING' || status === 'QUEUED') {
      return <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-spin" />;
    }
    return <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />;
  };

  const navGroups: NavGroup[] = [
    {
      group: t.groupStart,
      items: [
        { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
        { id: 'new_project', label: t.navNewProject, icon: PlusCircle },
      ],
    },
    {
      group: t.groupResearch,
      items: [
        { id: 'market_research', label: t.navMarketResearch, icon: TrendingUp, isStage: true },
        { id: 'topic_selection', label: t.navTopicSelection, icon: Sparkles, isStage: true },
      ],
    },
    {
      group: t.groupStrategy,
      items: [
        { id: 'project_brief', label: t.navProjectBrief, icon: FileText, isStage: true },
        { id: 'uvz', label: t.navUvz, icon: Target, isStage: true },
        { id: 'transformation_map', label: t.navTransformationMap, icon: GitFork, isStage: true },
        { id: 'reference_library', label: t.navReferenceLibrary, icon: BookOpen, isStage: true },
        { id: 'product_charter', label: t.navProductCharter, icon: Compass, isStage: true },
        { id: 'outline_builder', label: t.navOutlineBuilder, icon: ListTree, isStage: true },
      ],
    },
    {
      group: t.groupContent,
      items: [
        { id: 'content_studio', label: t.navContentStudio, icon: Feather, isStage: true },
        { id: 'workbook_studio', label: t.navWorkbookStudio, icon: Layers, isStage: true },
      ],
    },
    {
      group: t.groupPolish,
      items: [
        { id: 'quality_assurance', label: t.navQualityAssurance, icon: ShieldCheck, isStage: true },
        { id: 'brand_design', label: t.navBrandDesign, icon: Palette, isStage: true },
        { id: 'pricing_launch', label: t.navPricingLaunch, icon: Tag, isStage: true },
        { id: 'export_center', label: t.navExportCenter, icon: Download, isStage: true },
      ],
    },
    {
      group: t.groupSettings,
      items: [
        { id: 'my_projects', label: t.navMyProjects, icon: FolderKanban },
        { id: 'ai_settings', label: t.navAiSettings, icon: Cpu },
        { id: 'automation_settings', label: t.navAutomationSettings, icon: Sliders },
      ],
    },
  ];

  const verifiedRefCount = (project.referenceLibrary?.cards || []).filter(card => card.status === 'VERIFIED_FULL_TEXT').length;
  const completedChapterCount = (project.outline || []).filter((c) => c.isCompleted).length;
  const totalChapterCount = (project.outline || []).length;
  const wordCount = project.qualityReport?.actualWordCount || 0;

  return (
    <aside id="workspace-navigation" aria-label={lang === 'en' ? 'Workspace navigation' : '工作區導覽'} className={`workspace-sidebar ${isOpen ? 'is-open' : ''} w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800`}>
      <div className="sidebar-brand"><span>Digital Product Studio</span><button onClick={onClose} className="navigation-toggle p-2" aria-label={lang === 'en' ? 'Close navigation' : '關閉導覽'}><X size={20} /></button></div>
      <label className="navigation-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{lang === 'en' ? 'Find a workspace' : '搜尋工作區'}</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={lang === 'en' ? 'Find a workspace…' : '搜尋工作區…'} /></label>
      {/* Overall Progress Widget */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium">{t.pipelineProgress}</span>
          <span className="font-mono font-semibold text-emerald-400 tabular-nums">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span>{t.sources}: <strong className="text-slate-200">{verifiedRefCount}/{project.referenceLibrary.targetCount}</strong></span>
          <span>{t.chapters}: <strong className="text-slate-200">{completedChapterCount}/{totalChapterCount}</strong></span>
          <span>{t.words}: <strong className="text-slate-200">{wordCount.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.filter(group => group.items.some(item => item.label.toLowerCase().includes(query.toLowerCase()))).map((group) => (
          <div key={group.group}>
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {group.group}
            </div>
            <div className="space-y-0.5">
              {group.items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { setActiveView(item.id as NavigationItem); onClose(); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.isStage && getStageStatusIcon(item.id as StageId)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {query && !navGroups.some(group => group.items.some(item => item.label.toLowerCase().includes(query.toLowerCase()))) && <p className="px-2 text-sm text-slate-300">{lang === 'en' ? 'No matching workspace.' : '找不到相符的工作區。'}</p>}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>V4.0 Autopilot</span>
        <span className="font-mono text-emerald-400">{project.aiSettings.provider.toUpperCase()}</span>
      </div>
    </aside>
  );
};
