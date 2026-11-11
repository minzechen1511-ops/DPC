import React, { useState, useEffect, useRef } from 'react';
import { DigitalProductProject, StageId } from './types/project.ts';
import { DEMO_PROJECT, BLANK_PROJECT } from './data/demoProject.ts';
import { approveGate, revokeApprovals } from './utils/gatePolicy.ts';
import { Header } from './components/Header.tsx';
import { Sidebar, NavigationItem } from './components/Sidebar.tsx';
import { calculateOverallProgress } from './utils/workflowEngine.ts';
import { Language } from './utils/i18n.ts';
import {
  runAutomatedMarketDiscovery,
  deriveSynchronizedCandidates,
  propagateTopicToDownstream,
  MarketSyncOptions,
} from './utils/marketDiscoveryEngine.ts';

// Views
import { DashboardView } from './components/views/DashboardView.tsx';
import { NewProjectWizard } from './components/views/NewProjectWizard.tsx';
import { MarketIntelligenceView } from './components/views/MarketIntelligenceView.tsx';
import { TopicRecommendationsView } from './components/views/TopicRecommendationsView.tsx';
import { ProjectBriefView } from './components/views/ProjectBriefView.tsx';
import { UVZView } from './components/views/UVZView.tsx';
import { TransformationMapView } from './components/views/TransformationMapView.tsx';
import { ReferenceLibraryView } from './components/views/ReferenceLibraryView.tsx';
import { ProductCharterView } from './components/views/ProductCharterView.tsx';
import { OutlineBuilderView } from './components/views/OutlineBuilderView.tsx';
import { ContentStudioView } from './components/views/ContentStudioView.tsx';
import { WorkbookStudioView } from './components/views/WorkbookStudioView.tsx';
import { QualityAssuranceView } from './components/views/QualityAssuranceView.tsx';
import { BrandDesignView } from './components/views/BrandDesignView.tsx';
import { PricingLaunchView } from './components/views/PricingLaunchView.tsx';
import { ExportCenterView } from './components/views/ExportCenterView.tsx';
import { MyProjectsView } from './components/views/MyProjectsView.tsx';
import { AISettingsView } from './components/views/AISettingsView.tsx';
import { AutomationSettingsView } from './components/views/AutomationSettingsView.tsx';

export default function App() {
  // Initial state is blank project as requested by user
  const [project, setProject] = useState<DigitalProductProject>(BLANK_PROJECT);
  // Default UI language is English ('en') as requested by user
  const [lang, setLang] = useState<Language>('en');
  const [activeView, setActiveView] = useState<NavigationItem>('dashboard');
  const [isAutopilotRunning, setIsAutopilotRunning] = useState<boolean>(false);

  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!navigationOpen) return;
    const sidebar = document.getElementById('workspace-navigation');
    navigationTrigger.current = document.activeElement as HTMLElement;
    sidebar?.querySelector<HTMLElement>('button, input')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavigationOpen(false);
      if (event.key === 'Tab') {
        const items = Array.from(sidebar?.querySelectorAll<HTMLElement>('button, input, a[href]') || []).filter(el => el.getClientRects().length && !el.hasAttribute('disabled'));
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setNavigationOpen(false); };
    document.addEventListener('keydown', handleKey);
    desktop.addEventListener('change', closeOnDesktop);
    return () => { document.removeEventListener('keydown', handleKey); desktop.removeEventListener('change', closeOnDesktop); navigationTrigger.current?.focus(); };
  }, [navigationOpen]);

  const progressPercent = calculateOverallProgress(project);

  // Switch to the master reference sample
  const handleLoadDemoProject = () => {
    setProject(revokeApprovals({ ...structuredClone(DEMO_PROJECT), marketResearch: { ...DEMO_PROJECT.marketResearch, platformEvidence: DEMO_PROJECT.marketResearch.platformEvidence.map(obs => ({ ...obs, isSample: true })) } }, 'gateA'));
  };

  // Reset to clean blank project
  const handleResetToBlank = () => {
    setProject({
      ...BLANK_PROJECT,
      projectId: `proj_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState('');
  const handleRunMarketDiscovery = async (options?: MarketSyncOptions) => {
    if (researchBusy) return;
    setResearchBusy(true); setResearchError('');
    try {
      const result = await runAutomatedMarketDiscovery(options);
      setProject(prev => revokeApprovals({ ...prev, marketResearch: { ...prev.marketResearch, platformEvidence: result.observations, topicCandidates: result.candidates, selectedTopicId: result.candidates.some(c => c.id === prev.marketResearch.selectedTopicId) ? prev.marketResearch.selectedTopicId : null, sourceReports: result.sources, researchDate: result.checkedAt, confidence: result.observations.length ? 'MEDIUM' : 'LIMITED' }, workflow: { ...prev.workflow, stageStatuses: { ...prev.workflow.stageStatuses, market_research: result.observations.length ? 'COMPLETED' : 'BLOCKED', topic_selection: 'NEEDS_REVIEW' } } }, 'gateA'));
    } catch (error) { setResearchError(error instanceof Error ? error.message : 'Research failed.'); }
    finally { setResearchBusy(false); }
  };
  const handleSynchronizeMarketToGateA = (options?: MarketSyncOptions) => {
    setProject(prev => revokeApprovals({ ...prev, marketResearch: { ...prev.marketResearch, topicCandidates: deriveSynchronizedCandidates(prev.marketResearch.platformEvidence, options) } }, 'gateA'));
    setActiveView('topic_selection');
  };
  const handleSelectTopic = (topicId: string) => setProject(prev => propagateTopicToDownstream(prev, topicId, lang));
  const handleRunAutopilot = async () => {
    setIsAutopilotRunning(true);
    try {
      if (!project.marketResearch.topicCandidates.length) await handleRunMarketDiscovery();
      setActiveView(!project.workflow.gates.gateA.isApproved ? 'topic_selection' : !project.workflow.gates.gateB.isApproved ? 'product_charter' : !project.workflow.gates.gateC.isApproved ? 'quality_assurance' : 'export_center');
    } finally { setIsAutopilotRunning(false); }
  };
  const handleApproveGateA = () => setProject(prev => approveGate(prev, 'gateA'));
  const handleApproveGateB = () => setProject(prev => approveGate(prev, 'gateB'));
  const handleApproveGateC = () => setProject(prev => approveGate(prev, 'gateC'));

  const handleUpdateIntake = (updatedIntake: any) => {
    setProject((prev) => ({
      ...prev,
      intake: updatedIntake,
      charter: { ...prev.charter, isApproved: false, approvedAt: undefined },
      workflow: revokeApprovals(prev, 'gateB').workflow,
    }));
  };

  const handleSelectUVZOption = (optionId: string) => {
    setProject((prev) => ({
      ...prev,
      workflow: revokeApprovals(prev, 'gateB').workflow,
      charter: { ...prev.charter, isApproved: false },
      uvz: {
        ...prev.uvz,
        selectedOptionId: optionId,
      },
    }));
  };

  const handleSelectTitleOption = (titleId: string) => {
    const selected = project.transformationMap.titleOptions.find((t) => t.id === titleId);
    setProject((prev) => ({
      ...prev,
      workflow: revokeApprovals(prev, 'gateB').workflow,
      transformationMap: {
        ...prev.transformationMap,
        selectedTitleId: titleId,
      },
      charter: selected
        ? {
            ...prev.charter,
            productTitle: selected.title,
            subtitle: selected.subtitle,
            isApproved: false,
            approvedAt: undefined,
          }
        : prev.charter,
    }));
  };

  const handleUpdateChapter = (chapterId: string, content: string, wordCount: number) => {
    setProject((prev) => ({
      ...prev,
      workflow: { ...revokeApprovals(prev, 'gateC').workflow, stageStatuses: { ...revokeApprovals(prev, 'gateC').workflow.stageStatuses, content_studio: prev.outline.every(ch => ch.id === chapterId || ch.isCompleted) ? 'COMPLETED' : 'PARTIAL' } },
      outline: prev.outline.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              contentMarkdown: content,
              actualWordCount: wordCount,
              isCompleted: true,
              lastGeneratedAt: new Date().toISOString(),
            }
          : ch
      ),
      qualityReport: {
        ...prev.qualityReport,
        actualWordCount: prev.outline.reduce(
          (sum, c) => sum + (c.id === chapterId ? wordCount : c.actualWordCount || 0),
          0
        ),
      },
    }));
  };

  const handleStartNewProject = (params: any) => {
    const newProj: DigitalProductProject = {
      ...BLANK_PROJECT,
      projectId: `proj_${Date.now()}`,
      name: params.projectName,
      preferences: {
        ...BLANK_PROJECT.preferences,
        market: params.market,
        language: params.language,
        productFormat: params.productFormat,
        referenceTarget: params.referenceTarget,
      },
      charter: {
        ...BLANK_PROJECT.charter,
        productTitle: params.projectName,
        deliveryFormat: params.productFormat,
      },
      workflow: {
        ...BLANK_PROJECT.workflow,
        activeStage: 'market_research',
        stageStatuses: {
          market_research: 'READY',
          topic_selection: 'READY',
          project_brief: 'NOT_STARTED',
          uvz: 'NOT_STARTED',
          transformation_map: 'NOT_STARTED',
          reference_library: 'NOT_STARTED',
          product_charter: 'NOT_STARTED',
          outline_builder: 'NOT_STARTED',
          content_studio: 'NOT_STARTED',
          workbook_studio: 'NOT_STARTED',
          quality_assurance: 'NOT_STARTED',
          brand_design: 'NOT_STARTED',
          pricing_launch: 'NOT_STARTED',
          export_center: 'NOT_STARTED',
        },
        gates: {
          gateA: { gate: 'GATE_A_TOPIC', isApproved: false, requiredFor: [] },
          gateB: { gate: 'GATE_B_STRATEGY', isApproved: false, requiredFor: [] },
          gateC: { gate: 'GATE_C_QUALITY', isApproved: false, requiredFor: [] },
        },
      },
    };
    setProject(newProj);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            project={project}
            setActiveView={setActiveView}
            onRunAutopilot={handleRunAutopilot}
            isAutopilotRunning={isAutopilotRunning}
            progressPercent={progressPercent}
            lang={lang}
            onLoadDemoProject={handleLoadDemoProject}
          />
        );
      case 'new_project':
        return (
          <NewProjectWizard
            onStartProject={handleStartNewProject}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'market_research':
        return (
          <MarketIntelligenceView
            project={project}
            setActiveView={setActiveView}
            researchBusy={researchBusy}
            researchError={researchError}
            onRefreshResearch={handleRunMarketDiscovery}
            onSynchronizeToGateA={handleSynchronizeMarketToGateA}
            lang={lang}
          />
        );
      case 'topic_selection':
        return (
          <TopicRecommendationsView
            project={project}
            setActiveView={setActiveView}
            onSelectTopic={handleSelectTopic}
            onApproveGateA={handleApproveGateA}
            researchBusy={researchBusy}
            researchError={researchError}
            onRunMarketDiscovery={handleRunMarketDiscovery}
            lang={lang}
          />
        );
      case 'project_brief':
        return (
          <ProjectBriefView
            project={project}
            setActiveView={setActiveView}
            onUpdateIntake={handleUpdateIntake}
            lang={lang}
          />
        );
      case 'uvz':
        return (
          <UVZView
            project={project}
            setActiveView={setActiveView}
            onSelectOption={handleSelectUVZOption}
            lang={lang}
          />
        );
      case 'transformation_map':
        return (
          <TransformationMapView
            project={project}
            setActiveView={setActiveView}
            onSelectTitle={handleSelectTitleOption}
            lang={lang}
          />
        );
      case 'reference_library':
        return (
          <ReferenceLibraryView
          onAddSource={(source, chapterIds) => setProject(prev => revokeApprovals({ ...prev, referenceLibrary: { ...prev.referenceLibrary, cards: [...prev.referenceLibrary.cards, source], verifiedCount: prev.referenceLibrary.cards.filter(c => c.status === 'VERIFIED_FULL_TEXT').length + Number(source.status === 'VERIFIED_FULL_TEXT') }, outline: prev.outline.map(ch => chapterIds.includes(ch.id) ? { ...ch, mappedReferenceIds: [...new Set([...ch.mappedReferenceIds, source.id])] } : ch) }, 'gateB'))}
            project={project}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'product_charter':
        return (
          <ProductCharterView
            project={project}
            setActiveView={setActiveView}
            onApproveGateB={handleApproveGateB}
            lang={lang}
          />
        );
      case 'outline_builder':
        return (
          <OutlineBuilderView
            project={project}
            setActiveView={setActiveView}
            onUpdateOutline={(out) => setProject((prev) => revokeApprovals({ ...prev, outline: out }, 'gateC'))}
            lang={lang}
          />
        );
      case 'content_studio':
        return (
          <ContentStudioView
            onUpdateIllustrations={(chapterId, illustrations) => setProject(prev => revokeApprovals({ ...prev, outline: prev.outline.map(ch => ch.id === chapterId ? { ...ch, illustrations } : ch) }, 'gateC'))}
            project={project}
            setActiveView={setActiveView}
            onUpdateChapter={handleUpdateChapter}
            onRunAutopilot={handleRunAutopilot}
            isAutopilotRunning={isAutopilotRunning}
            lang={lang}
          />
        );
      case 'workbook_studio':
        return (
          <WorkbookStudioView
            onSaveResource={resource => setProject(prev => revokeApprovals({ ...prev, resources: [...prev.resources.filter(item => item.id !== resource.id), resource] }, 'gateC'))}
            project={project}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'quality_assurance':
        return (
          <QualityAssuranceView
            project={project}
            setActiveView={setActiveView}
            onApproveGateC={handleApproveGateC}
            lang={lang}
          />
        );
      case 'brand_design':
        return (
          <BrandDesignView
            project={project}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'pricing_launch':
        return (
          <PricingLaunchView
            project={project}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'export_center':
        return (
          <ExportCenterView
            project={project}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'my_projects':
        return (
          <MyProjectsView
            currentProject={project}
            onLoadProject={(proj) => setProject(revokeApprovals(proj, 'gateA'))}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'ai_settings':
        return (
          <AISettingsView
            project={project}
            onUpdateAiSettings={(newAi) => setProject((prev) => ({ ...prev, aiSettings: newAi }))}
            lang={lang}
          />
        );
      case 'automation_settings':
        return (
          <AutomationSettingsView
            project={project}
            onSavePreferences={(prefs) => setProject((prev) => ({ ...prev, preferences: prefs }))}
            lang={lang}
          />
        );
      default:
        return (
          <DashboardView
            project={project}
            setActiveView={setActiveView}
            onRunAutopilot={handleRunAutopilot}
            isAutopilotRunning={isAutopilotRunning}
            progressPercent={progressPercent}
            lang={lang}
            onLoadDemoProject={handleLoadDemoProject}
          />
        );
    }
  };

  return (
    <div className="workspace-shell flex h-dvh bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <a href="#main-content" className="skip-link">{lang === 'en' ? 'Skip to content' : '跳至內容'}</a>
      {navigationOpen && <button tabIndex={-1} className="navigation-backdrop" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />}
      {/* 260px SaaS Sidebar */}
      <Sidebar
        isOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        project={project}
        activeView={activeView}
        setActiveView={setActiveView}
        progressPercent={progressPercent}
        lang={lang}
      />

      {/* Main Viewport Container */}
      <div inert={navigationOpen} className="workspace-body flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with 3 zones & language toggle */}
        <Header
          navigationOpen={navigationOpen}
          onToggleNavigation={() => setNavigationOpen(v => !v)}
          project={project}
          activeView={activeView}
          setActiveView={setActiveView}
          onRunAutopilot={handleRunAutopilot}
          isAutopilotRunning={isAutopilotRunning}
          progressPercent={progressPercent}
          lang={lang}
          setLang={setLang}
          onLoadDemoProject={handleLoadDemoProject}
        />

        {/* Scrollable Main Content */}
        <main id="main-content" tabIndex={-1} className="workspace-main flex-1 min-w-0 overflow-y-auto p-4 md:p-7 xl:p-9">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
