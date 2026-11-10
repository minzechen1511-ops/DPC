import React, { useState } from 'react';
import { DigitalProductProject, StageId } from './types/project.ts';
import { DEMO_PROJECT, BLANK_PROJECT } from './data/demoProject.ts';
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

  const progressPercent = calculateOverallProgress(project);

  // Switch to the master reference sample
  const handleLoadDemoProject = () => {
    setProject(DEMO_PROJECT);
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

  // Automated Market Discovery & Dynamic Synchronization for Gate A
  const handleRunMarketDiscovery = (options?: MarketSyncOptions) => {
    const { observations, candidates } = runAutomatedMarketDiscovery(options);
    setProject((prev) => ({
      ...prev,
      marketResearch: {
        ...prev.marketResearch,
        platformEvidence: observations,
        topicCandidates: candidates,
        selectedTopicId: candidates[0]?.id || null,
      },
      workflow: {
        ...prev.workflow,
        stageStatuses: {
          ...prev.workflow.stageStatuses,
          market_research: 'COMPLETED',
          topic_selection: 'READY',
        },
      },
    }));
  };

  // Synchronize Market Intelligence Stage signals into Gate A Top Recommendations
  const handleSynchronizeMarketToGateA = (options?: MarketSyncOptions) => {
    const observations =
      project.marketResearch.platformEvidence.length > 0
        ? project.marketResearch.platformEvidence
        : runAutomatedMarketDiscovery().observations;
    const candidates = deriveSynchronizedCandidates(observations, options);
    const topWinnerId = candidates[0]?.id || 'TOPIC-03';

    setProject((prev) => ({
      ...prev,
      marketResearch: {
        ...prev.marketResearch,
        platformEvidence: observations,
        topicCandidates: candidates,
        selectedTopicId: topWinnerId,
      },
      workflow: {
        ...prev.workflow,
        stageStatuses: {
          ...prev.workflow.stageStatuses,
          market_research: 'COMPLETED',
          topic_selection: 'READY',
        },
      },
    }));
    setActiveView('topic_selection');
  };

  // Handle Gate A Topic Selection with full downstream cascading continuity
  const handleSelectTopic = (topicId: string) => {
    const updated = propagateTopicToDownstream(project, topicId, lang);
    setProject(updated);
  };

  // Handle Autopilot Trigger
  const handleRunAutopilot = () => {
    setIsAutopilotRunning(true);
    // If on a blank project, first trigger market discovery and topic propagation
    if (project.marketResearch.topicCandidates.length === 0) {
      const { observations, candidates } = runAutomatedMarketDiscovery();
      const firstId = candidates[0].id;
      const initialWithResearch: DigitalProductProject = {
        ...project,
        marketResearch: {
          ...project.marketResearch,
          platformEvidence: observations,
          topicCandidates: candidates,
          selectedTopicId: firstId,
        },
      };
      const propagated = propagateTopicToDownstream(initialWithResearch, firstId, lang);
      setProject(propagated);
    }

    setTimeout(() => {
      setIsAutopilotRunning(false);
      if (!project.workflow.gates.gateA.isApproved) {
        setActiveView('topic_selection');
      } else if (!project.workflow.gates.gateB.isApproved) {
        setActiveView('product_charter');
      } else if (!project.workflow.gates.gateC.isApproved) {
        setActiveView('quality_assurance');
      } else {
        setActiveView('export_center');
      }
    }, 1200);
  };

  const handleApproveGateA = () => {
    // If no candidate is selected yet, make sure one is populated
    if (project.marketResearch.topicCandidates.length === 0) {
      handleRunMarketDiscovery();
    }
    const targetTopicId = project.marketResearch.selectedTopicId || 'TOPIC-01';
    const updated = propagateTopicToDownstream(project, targetTopicId, lang);
    setProject(updated);
  };

  const handleApproveGateB = () => {
    setProject((prev) => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        stageStatuses: {
          ...prev.workflow.stageStatuses,
          product_charter: 'COMPLETED',
          outline_builder: 'COMPLETED',
        },
        gates: {
          ...prev.workflow.gates,
          gateB: {
            ...prev.workflow.gates.gateB,
            isApproved: true,
            approvedAt: new Date().toISOString(),
          },
        },
      },
      charter: {
        ...prev.charter,
        isApproved: true,
        approvedAt: new Date().toISOString(),
      },
    }));
  };

  const handleApproveGateC = () => {
    setProject((prev) => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        stageStatuses: {
          ...prev.workflow.stageStatuses,
          quality_assurance: 'COMPLETED',
          export_center: 'READY',
        },
        gates: {
          ...prev.workflow.gates,
          gateC: {
            ...prev.workflow.gates.gateC,
            isApproved: true,
            approvedAt: new Date().toISOString(),
          },
        },
      },
    }));
  };

  const handleUpdateIntake = (updatedIntake: any) => {
    setProject((prev) => ({
      ...prev,
      intake: updatedIntake,
    }));
  };

  const handleSelectUVZOption = (optionId: string) => {
    setProject((prev) => ({
      ...prev,
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
      transformationMap: {
        ...prev.transformationMap,
        selectedTitleId: titleId,
      },
      charter: selected
        ? {
            ...prev.charter,
            productTitle: selected.title,
            subtitle: selected.subtitle,
          }
        : prev.charter,
    }));
  };

  const handleUpdateChapter = (chapterId: string, content: string, wordCount: number) => {
    setProject((prev) => ({
      ...prev,
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
            onUpdateOutline={(out) => setProject((prev) => ({ ...prev, outline: out }))}
            lang={lang}
          />
        );
      case 'content_studio':
        return (
          <ContentStudioView
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
            onLoadProject={(proj) => setProject(proj)}
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
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* 260px SaaS Sidebar */}
      <Sidebar
        project={project}
        activeView={activeView}
        setActiveView={setActiveView}
        progressPercent={progressPercent}
        lang={lang}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with 3 zones & language toggle */}
        <Header
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
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
