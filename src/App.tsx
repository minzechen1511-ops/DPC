import { verifyProjectReferences } from './services/referenceVerification.ts';
import { chapterResearchFingerprint, isRetrievedSource } from './utils/sourceEvidence.ts';
import React, { useState, useEffect, useRef } from 'react';
import {
  DigitalProductProject,
  StageId,
  ProductCharter,
  UVZAnalysis,
  TransformationMap,
  ProductBible,
  SalesAssets,
} from './types/project.ts';
import { BLANK_PROJECT } from './data/demoProject.ts';
import { approveGate, revokeApprovals, gateIssues } from './utils/gatePolicy.ts';
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
import {
  loadInitialProjectFromStorage,
  loadStoredLang,
  saveProjectsToStorage,
  saveStoredLang,
  upsertSavedProject,
  removeSavedProject,
  sanitizeProjectForStorage,
} from './utils/projectStorage.ts';

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
import { SubscriptionDesktopView } from './components/views/SubscriptionDesktopView.tsx';
import {
  AppSubscriptionState,
  loadSubscriptionState,
  normalizeSubscriptionState,
  saveSubscriptionState,
} from './utils/subscriptionLicense.ts';

export default function App() {
  const [initialWorkspace] = useState(() => loadInitialProjectFromStorage(BLANK_PROJECT));
  const [project, setProject] = useState<DigitalProductProject>(initialWorkspace.activeProject);
  const [savedProjects, setSavedProjects] = useState<DigitalProductProject[]>(initialWorkspace.savedProjects);
  const [lang, setLang] = useState<Language>(() => loadStoredLang());
  const [activeView, setActiveView] = useState<NavigationItem>('dashboard');
  const [subscription, setSubscription] = useState<AppSubscriptionState>(() => loadSubscriptionState());

  // Sync manual subscription state with desktop local vault (/api/desktop/subscription)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/desktop/subscription');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const remoteRaw = data?.state ?? data?.subscription;
        if (!remoteRaw || cancelled) return;
        const remote = normalizeSubscriptionState(remoteRaw);
        setSubscription((prev) => {
          const prevIsDefaultTrial =
            prev.activePlan === 'TRIAL' &&
            !prev.licenseKey &&
            prev.issuedRecords.length === 0 &&
            !prev.programConfig.enforceExportGate;
          const remoteHasCustomState =
            remote.activePlan !== 'TRIAL' ||
            Boolean(remote.licenseKey) ||
            remote.issuedRecords.length > 0 ||
            remote.programConfig.enforceExportGate;

          if (prevIsDefaultTrial && remoteHasCustomState) {
            saveSubscriptionState(remote);
            return remote;
          }
          if (!prevIsDefaultTrial && !remoteHasCustomState) {
            fetch('/api/desktop/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(prev),
            }).catch(() => {});
          }
          return prev;
        });
      } catch {
        // offline or non-desktop fallback relies cleanly on localStorage
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdateSubscription = (next: AppSubscriptionState) => {
    const normalized = normalizeSubscriptionState(next);
    setSubscription(normalized);
    saveSubscriptionState(normalized);
    fetch('/api/desktop/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    }).catch(() => {
      // localStorage already updated
    });
  };

  // Persist active project & repository list to localStorage
  useEffect(() => {
    setSavedProjects((prev) => {
      const next = upsertSavedProject(prev, project);
      saveProjectsToStorage(next, project.projectId);
      return next;
    });
  }, [project]);

  useEffect(() => {
    saveStoredLang(lang);
  }, [lang]);

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

  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState('');
  const handleRunMarketDiscovery = async (options?: MarketSyncOptions) => {
    if (researchBusy) return;
    setResearchBusy(true); setResearchError('');
    try {
      const result = await runAutomatedMarketDiscovery(options);
      setProject(prev => revokeApprovals({ ...prev, updatedAt: new Date().toISOString(), marketResearch: { ...prev.marketResearch, platformEvidence: result.observations, topicCandidates: result.candidates, selectedTopicId: result.candidates.some(c => c.id === prev.marketResearch.selectedTopicId) ? prev.marketResearch.selectedTopicId : null, sourceReports: result.sources, researchDate: result.checkedAt, confidence: result.observations.length ? 'MEDIUM' : 'LIMITED' }, workflow: { ...prev.workflow, stageStatuses: { ...prev.workflow.stageStatuses, market_research: result.observations.length ? 'COMPLETED' : 'BLOCKED', topic_selection: 'NEEDS_REVIEW' } } }, 'gateA'));
    } catch (error) { setResearchError(error instanceof Error ? error.message : 'Research failed.'); }
    finally { setResearchBusy(false); }
  };
  const handleSynchronizeMarketToGateA = (options?: MarketSyncOptions) => {
    setProject(prev => revokeApprovals({ ...prev, updatedAt: new Date().toISOString(), marketResearch: { ...prev.marketResearch, topicCandidates: deriveSynchronizedCandidates(prev.marketResearch.platformEvidence, options) } }, 'gateA'));
    setActiveView('topic_selection');
  };
  const handleSelectTopic = (topicId: string) => setProject(prev => propagateTopicToDownstream(prev, topicId, lang));
  const handleApproveGateA = () => setProject(prev => approveGate(prev, 'gateA'));
  const currentProjectRef = useRef(project);
  useEffect(()=>{currentProjectRef.current=project;},[project]);
  const [checkingReferences,setCheckingReferences] = useState(false);
  const [workflowError,setWorkflowError] = useState('');
  const approveWithSourceCheck = async (gate: 'gateB'|'gateC'): Promise<boolean> => {
    if(checkingReferences || gateIssues(project,gate).length) return false;
    setCheckingReferences(true);setWorkflowError('');
    try {
      const result=await verifyProjectReferences(project);
      if(!result.valid){setWorkflowError(result.message);return false;}
      if(currentProjectRef.current!==project){setWorkflowError('The project changed during source checking. Review the current state and approve again.');return false;}
      setProject(prev=>prev===project?approveGate(prev,gate):prev);
      return true;
    } finally {setCheckingReferences(false);}
  };
  const handleApproveGateB = () => approveWithSourceCheck('gateB');
  const handleApproveGateC = () => approveWithSourceCheck('gateC');

  const handleUpdateIntake = (updatedIntake: any) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      intake: updatedIntake,
      charter: { ...prev.charter, isApproved: false, approvedAt: undefined },
      workflow: {
        ...revokeApprovals(prev, 'gateB').workflow,
        stageStatuses: {
          ...revokeApprovals(prev, 'gateB').workflow.stageStatuses,
          project_brief: 'COMPLETED',
        },
      },
    }));
  };

  const handleSelectUVZOption = (optionId: string) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      workflow: revokeApprovals(prev, 'gateB').workflow,
      charter: { ...prev.charter, isApproved: false },
      uvz: {
        ...prev.uvz,
        selectedOptionId: optionId,
      },
    }));
  };

  const handleUpdateUvz = (updatedUvz: UVZAnalysis) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      workflow: revokeApprovals(prev, 'gateB').workflow,
      charter: { ...prev.charter, isApproved: false, approvedAt: undefined },
      uvz: updatedUvz,
    }));
  };

  const handleSelectTitleOption = (titleId: string) => {
    const selected = project.transformationMap.titleOptions.find((t) => t.id === titleId);
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
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

  const handleUpdateTransformationMap = (updatedMap: TransformationMap) => {
    const selected = updatedMap.titleOptions.find((t) => t.id === updatedMap.selectedTitleId);
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      workflow: revokeApprovals(prev, 'gateB').workflow,
      transformationMap: updatedMap,
      charter: selected
        ? {
            ...prev.charter,
            productTitle: selected.title,
            subtitle: selected.subtitle,
            centralPromise: updatedMap.bigPromise || prev.charter.centralPromise,
            isApproved: false,
            approvedAt: undefined,
          }
        : prev.charter,
    }));
  };

  const handleUpdateCharter = (updatedCharter: ProductCharter) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      name: updatedCharter.productTitle || prev.name,
      charter: {
        ...updatedCharter,
        isApproved: false,
        approvedAt: undefined,
      },
      workflow: revokeApprovals(prev, 'gateB').workflow,
    }));
  };

  const handleUpdateChapter = (chapterId: string, content: string, wordCount: number) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
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

  const handleUpdateProductBible = (updatedBible: ProductBible) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      productBible: updatedBible,
    }));
  };

  const handleUpdateBrand = (updatedBrand: DigitalProductProject['brand']) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      brand: updatedBrand,
      intake: {
        ...prev.intake,
        brandStyleAndVoice: {
          ...prev.intake.brandStyleAndVoice,
          primaryColor: updatedBrand.primaryHex,
          secondaryColor: updatedBrand.secondaryHex,
          accentColor: updatedBrand.accentHex,
          typographyDirection: `${updatedBrand.fontDisplay} + ${updatedBrand.fontBody}`,
        },
      },
      workflow: {
        ...prev.workflow,
        stageStatuses: {
          ...prev.workflow.stageStatuses,
          brand_design: 'COMPLETED',
        },
      },
    }));
  };

  const handleUpdatePricingAndSales = (
    pricingReport: DigitalProductProject['pricingReport'],
    salesAssets: SalesAssets
  ) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      pricingReport,
      salesAssets,
      intake: {
        ...prev.intake,
        recommendedPrice: {
          ...prev.intake.recommendedPrice,
          introductoryTest: pricingReport.introductoryPrice,
          regular: pricingReport.regularPrice,
          premiumBundle: pricingReport.bundlePrice,
          currency: pricingReport.currency,
          rationale: pricingReport.rationale,
        },
      },
      workflow: {
        ...prev.workflow,
        stageStatuses: {
          ...prev.workflow.stageStatuses,
          pricing_launch: 'COMPLETED',
        },
      },
    }));
  };

  const handleRecordAiUsage = (usage?: { total_tokens?: number }, model?: string) => {
    const tokens = Number(usage?.total_tokens || 0);
    setProject((prev) => {
      const modelId = (model || prev.aiSettings.defaultModel || '').toLowerCase();
      const isFreeModel =
        modelId.includes(':free') ||
        modelId === 'openrouter/free' ||
        modelId.includes('flash');
      const incrementalCost = isFreeModel ? 0 : Number(((tokens / 1_000_000) * 1.5).toFixed(4));
      return {
        ...prev,
        aiSettings: {
          ...prev.aiSettings,
          usageStats: {
            ...prev.aiSettings.usageStats,
            totalRequests: (prev.aiSettings.usageStats?.totalRequests || 0) + 1,
            totalTokens: (prev.aiSettings.usageStats?.totalTokens || 0) + tokens,
            estimatedCostUsd: Number(
              ((prev.aiSettings.usageStats?.estimatedCostUsd || 0) + incrementalCost).toFixed(4)
            ),
            lastRequestAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  const handleSwitchProject = (target: DigitalProductProject) => {
    setProject(sanitizeProjectForStorage(target));
    setWorkflowError('');
  };

  const handleDuplicateProject = (source: DigitalProductProject) => {
    const now = new Date().toISOString();
    const copyTitle = `${source.charter?.productTitle || source.name || 'Project'} (Copy)`;
    const cloned: DigitalProductProject = sanitizeProjectForStorage({
      ...structuredClone(source),
      projectId: `proj_${Date.now()}`,
      name: copyTitle,
      createdAt: now,
      updatedAt: now,
      charter: {
        ...source.charter,
        productTitle: source.charter?.productTitle ? `${source.charter.productTitle} (Copy)` : copyTitle,
      },
    });
    setProject(cloned);
    setWorkflowError('');
  };

  const handleDeleteProject = (projectId: string) => {
    const remaining = removeSavedProject(savedProjects, projectId);
    if (remaining.length === 0) {
      const freshBlank: DigitalProductProject = {
        ...BLANK_PROJECT,
        projectId: `proj_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSavedProjects([sanitizeProjectForStorage(freshBlank)]);
      saveProjectsToStorage([freshBlank], freshBlank.projectId);
      setProject(freshBlank);
      return;
    }
    setSavedProjects(remaining);
    if (project.projectId === projectId) {
      saveProjectsToStorage(remaining, remaining[0].projectId);
      setProject(remaining[0]);
    } else {
      saveProjectsToStorage(remaining, project.projectId);
    }
  };

  const handleStartNewProject = (params: any) => {
    const now = new Date().toISOString();
    const newProj: DigitalProductProject = {
      ...BLANK_PROJECT,
      projectId: `proj_${Date.now()}`,
      name: params.projectName,
      isBlankProject: false,
      createdAt: now,
      updatedAt: now,
      preferences: {
        ...BLANK_PROJECT.preferences,
        market: params.market,
        language: params.language,
        productFormat: params.productFormat,
        referenceTarget: params.referenceTarget,
      },
      intake: {
        ...BLANK_PROJECT.intake,
        projectName: params.projectName,
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
            progressPercent={progressPercent}
            lang={lang}
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
            onUpdateUvz={handleUpdateUvz}
            lang={lang}
          />
        );
      case 'transformation_map':
        return (
          <TransformationMapView
            project={project}
            setActiveView={setActiveView}
            onSelectTitle={handleSelectTitleOption}
            onUpdateTransformationMap={handleUpdateTransformationMap}
            lang={lang}
          />
        );
      case 'reference_library':
        return (
          <ReferenceLibraryView
            onAddSource={(source, chapterIds) => setProject(prev => revokeApprovals({ ...prev, updatedAt: new Date().toISOString(), referenceLibrary: { ...prev.referenceLibrary, cards: [...prev.referenceLibrary.cards, source], verifiedCount: prev.referenceLibrary.cards.filter(isRetrievedSource).length + Number(isRetrievedSource(source)) }, outline: prev.outline.map(ch => chapterIds.includes(ch.id) ? { ...ch, mappedReferenceIds: [...new Set([...ch.mappedReferenceIds, source.id])] } : ch) }, 'gateB'))}
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
            checkingReferences={checkingReferences}
            onApproveGateB={handleApproveGateB}
            onUpdateCharter={handleUpdateCharter}
            lang={lang}
          />
        );
      case 'outline_builder':
        return (
          <OutlineBuilderView
            project={project}
            setActiveView={setActiveView}
            onUpdateOutline={(out) => setProject(prev => revokeApprovals({...prev, updatedAt: new Date().toISOString(), outline:out},out.length!==prev.outline.length||out.some(ch=>{const old=prev.outline.find(item=>item.id===ch.id);return !old||chapterResearchFingerprint(old)!==chapterResearchFingerprint(ch);})?'gateB':'gateC'))}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'content_studio':
        return (
          <ContentStudioView
            onReviewCitations={(chapterId,citationReviews)=>setProject(prev=>revokeApprovals({...prev, updatedAt: new Date().toISOString(), outline:prev.outline.map(ch=>ch.id===chapterId?{...ch,citationReviews}:ch)},'gateC'))}
            onUpdateIllustrations={(chapterId, illustrations) => setProject(prev => revokeApprovals({ ...prev, updatedAt: new Date().toISOString(), outline: prev.outline.map(ch => ch.id === chapterId ? { ...ch, illustrations } : ch) }, 'gateC'))}
            project={project}
            setActiveView={setActiveView}
            onUpdateChapter={handleUpdateChapter}
            onUpdateProductBible={handleUpdateProductBible}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'workbook_studio':
        return (
          <WorkbookStudioView
            onSaveResource={resource => setProject(prev => revokeApprovals({ ...prev, updatedAt: new Date().toISOString(), resources: [...prev.resources.filter(item => item.id !== resource.id), resource] }, 'gateC'))}
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
            checkingReferences={checkingReferences}
            onApproveGateC={handleApproveGateC}
            lang={lang}
          />
        );
      case 'brand_design':
        return (
          <BrandDesignView
            project={project}
            setActiveView={setActiveView}
            onUpdateBrand={handleUpdateBrand}
            lang={lang}
          />
        );
      case 'pricing_launch':
        return (
          <PricingLaunchView
            project={project}
            setActiveView={setActiveView}
            onUpdatePricingAndSales={handleUpdatePricingAndSales}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'export_center':
        return (
          <ExportCenterView
            onSourceCheckFailed={message=>{setWorkflowError(message);setProject(prev=>revokeApprovals(prev,'gateC'));}}
            project={project}
            subscriptionState={subscription}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'my_projects':
        return (
          <MyProjectsView
            currentProject={project}
            savedProjects={savedProjects}
            onSwitchProject={handleSwitchProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            onLoadProject={(proj) => setProject(revokeApprovals({ ...proj, preferences: { ...proj.preferences, automationMode: 'manual_review', autoApproveNonCritical: false } }, 'gateA'))}
            setActiveView={setActiveView}
            lang={lang}
          />
        );
      case 'ai_settings':
        return (
          <AISettingsView
            project={project}
            onUpdateAiSettings={(newAi) => setProject((prev) => ({ ...prev, updatedAt: new Date().toISOString(), aiSettings: newAi }))}
            lang={lang}
          />
        );
      case 'automation_settings':
        return (
          <AutomationSettingsView
            project={project}
            onSavePreferences={(prefs) => setProject((prev) => ({ ...prev, updatedAt: new Date().toISOString(), preferences: { ...prefs, automationMode: 'manual_review', autoApproveNonCritical: false } }))}
            lang={lang}
          />
        );
      case 'subscription_desktop':
        return (
          <SubscriptionDesktopView
            subscription={subscription}
            onUpdateSubscription={handleUpdateSubscription}
            lang={lang}
          />
        );
      default:
        return (
          <DashboardView
            project={project}
            setActiveView={setActiveView}
            progressPercent={progressPercent}
            lang={lang}
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
          progressPercent={progressPercent}
          lang={lang}
          setLang={setLang}
        />

        {/* Scrollable Main Content */}
        <main id="main-content" tabIndex={-1} className="workspace-main flex-1 min-w-0 overflow-y-auto p-4 md:p-7 xl:p-9">
          {checkingReferences && <p role="status" className="mb-4 p-3 bg-indigo-50 text-indigo-900 rounded-lg text-sm">Checking original source records and retained excerpts. Approval remains pending.</p>}
          {workflowError && <p role="alert" className="mb-4 p-3 bg-amber-50 text-amber-950 rounded-lg text-sm">{workflowError}</p>}
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
