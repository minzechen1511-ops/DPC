import { isRetrievedSource } from '../utils/sourceEvidence.ts';
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
import { StudioLogo } from './StudioLogo.tsx';

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
    const status =
      stageId === 'market_research' && project.workflow.gates.gateA.isApproved
        ? 'COMPLETED'
        : project.workflow.stageStatuses[stageId];
    if (status === 'COMPLETED') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (status === 'NEEDS_REVIEW' || status === 'PARTIAL') {
      return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (status === 'RUNNING' || status === 'QUEUED') {
      return <Clock className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />;
    }
    return <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />;
  };

  const getNextRecommendedStep = (): { id: NavigationItem; label: string } => {
    const gates = project.workflow.gates;
    const statuses = project.workflow.stageStatuses;
    if (!gates.gateA.isApproved || !project.marketResearch.selectedTopicId) {
      return { id: 'market_research', label: lang === 'en' ? '1. Pick Niche (Gate A)' : '1. 選題核准 (Gate A)' };
    }
    if (statuses.project_brief !== 'COMPLETED') {
      return { id: 'project_brief', label: lang === 'en' ? '2. 13-Field Brief' : '2. 13項專案設定' };
    }
    if (!gates.gateB.isApproved) {
      const hasRefs = (project.referenceLibrary.cards || []).some(isRetrievedSource);
      return hasRefs
        ? { id: 'product_charter', label: lang === 'en' ? '6. Approve Charter (Gate B)' : '6. 核准產品憲章 (Gate B)' }
        : { id: 'reference_library', label: lang === 'en' ? '5. Add Verified Sources' : '5. 補充真實研究文獻' };
    }
    if (project.outline.some((ch) => !ch.isCompleted)) {
      return { id: 'content_studio', label: lang === 'en' ? '8. Write Chapters' : '8. 撰寫電子書章節' };
    }
    if (!(project.resources || []).some((r) => r.contentMarkdown.trim().length > 150)) {
      return { id: 'workbook_studio', label: lang === 'en' ? '9. Build Worksheets' : '9. 建立實作工具表' };
    }
    if (!gates.gateC.isApproved) {
      return { id: 'quality_assurance', label: lang === 'en' ? '10. Pass QA Audit (Gate C)' : '10. 通過品質稽核 (Gate C)' };
    }
    return { id: 'export_center', label: lang === 'en' ? '13. Export Product Bundle' : '13. 匯出完整商品包' };
  };

  const nextStep = getNextRecommendedStep();

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
        { id: 'project_brief', label: t.navProjectBrief, icon: FileText, isStage: true },
        { id: 'uvz', label: t.navUvz, icon: Target, isStage: true },
        { id: 'transformation_map', label: t.navTransformationMap, icon: GitFork, isStage: true },
      ],
    },
    {
      group: t.groupStrategy,
      items: [
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

  const verifiedRefCount = (project.referenceLibrary?.cards || []).filter(isRetrievedSource).length;
  const completedChapterCount = (project.outline || []).filter((c) => c.isCompleted).length;
  const totalChapterCount = (project.outline || []).length;
  const wordCount = project.qualityReport?.actualWordCount || 0;

  return (
    <aside
      id="workspace-navigation"
      aria-label={lang === 'en' ? 'Workspace navigation' : '工作區導覽'}
      className={`workspace-sidebar ${isOpen ? 'is-open' : ''} text-slate-200 flex flex-col shrink-0 border-r`}
    >
      <div className="sidebar-brand">
        <span className="inline-flex items-center gap-2.5">
          <StudioLogo size={26} className="shrink-0" />
          <span>Digital Product Studio</span>
        </span>
        <button
          onClick={onClose}
          className="navigation-toggle p-2"
          aria-label={lang === 'en' ? 'Close navigation' : '關閉導覽'}
        >
          <X size={20} />
        </button>
      </div>

      <label className="navigation-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">{lang === 'en' ? 'Find a workspace' : '搜尋工作區'}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === 'en' ? 'Find a workspace…' : '搜尋工作區…'}
        />
      </label>

      {/* Overall Telemetry & Next Recommended Step */}
      <div className="px-4 pb-4 pt-1 border-b border-cyan-900/50 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium">{t.pipelineProgress}</span>
            <span className="font-mono font-bold text-cyan-300 tabular-nums">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-900/80 h-2.5 rounded-sm overflow-hidden border border-cyan-900/40">
            <div
              className="bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-300 mt-2.5 font-mono">
            <span>
              {t.sources}: <strong className="text-white">{verifiedRefCount}/{project.referenceLibrary.targetCount}</strong>
            </span>
            <span className="text-center">
              {t.chapters}: <strong className="text-white">{completedChapterCount}/{totalChapterCount}</strong>
            </span>
            <span className="text-right">
              {t.words}: <strong className="text-white">{wordCount.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveView(nextStep.id);
            onClose();
          }}
          className="w-full px-3 py-2.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-left transition-colors flex items-center justify-between gap-2"
        >
          <span className="text-xs font-semibold text-teal-100 truncate">
            {lang === 'en' ? 'Next: ' : '下一步：'}
            {nextStep.label}
          </span>
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups
          .filter((group) =>
            group.items.some((item) => item.label.toLowerCase().includes(query.toLowerCase()))
          )
          .map((group) => (
            <div key={group.group}>
              <div className="px-2.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200/70 mb-1.5">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items
                  .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activeView === item.id ||
                      (item.id === 'market_research' && activeView === 'topic_selection');
                    return (
                      <button
                        key={item.id}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          setActiveView(item.id as NavigationItem);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-200 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-cyan-300/80'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.isStage && getStageStatusIcon(item.id as StageId)}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        {query &&
          !navGroups.some((group) =>
            group.items.some((item) => item.label.toLowerCase().includes(query.toLowerCase()))
          ) && (
            <p className="px-2.5 text-sm text-slate-300">
              {lang === 'en' ? 'No matching workspace.' : '找不到相符的工作區。'}
            </p>
          )}
      </nav>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-cyan-900/50 text-xs text-slate-300 flex items-center justify-between">
        <span>{lang === 'en' ? 'Commercial Cloud' : '商業雲端正式版'}</span>
        <span className="font-mono font-semibold text-cyan-300">GEMINI</span>
      </div>
    </aside>
  );
};
