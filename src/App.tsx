import { verifyProjectReferences } from './services/referenceVerification.ts';
import { chapterResearchFingerprint, isRetrievedSource } from './utils/sourceEvidence.ts';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import {
  DigitalProductProject,
  ProductCharter,
  UVZAnalysis,
  TransformationMap,
  ProductBible,
  SalesAssets,
} from './types/project.ts';
import { BLANK_PROJECT } from './data/demoProject.ts';
import { approveGate, revokeApprovals, gateIssues } from './utils/gatePolicy.ts';
import { Header, LocalSaveStatus } from './components/Header.tsx';
import { Sidebar, NavigationItem } from './components/Sidebar.tsx';
import { GoogleSignInGate } from './components/GoogleSignInGate.tsx';
import { calculateOverallProgress } from './utils/workflowEngine.ts';
import { Language } from './utils/i18n.ts';
import {
  runAutomatedMarketDiscovery,
  deriveSynchronizedCandidates,
  propagateTopicToDownstream,
  MarketSyncOptions,
} from './utils/marketDiscoveryEngine.ts';
import {
  loadStoredLang,
  saveStoredLang,
  sanitizeProjectForStorage,
  scrubLegacyApiKeyStorage,
  inspectLegacyLocalProjects,
  markLegacyProjectsMigrated,
} from './utils/projectStorage.ts';
import { auth } from './firebase.ts';
import {
  ensureUserProfile,
  subscribeUserProjects,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
} from './services/firestoreProjects.ts';
import { StudioLogo } from './components/StudioLogo.tsx';

// Views
import { DashboardView } from './components/views/DashboardView.tsx';
import { NewProjectWizard } from './components/views/NewProjectWizard.tsx';
import { MarketIntelligenceView } from './components/views/MarketIntelligenceView.tsx';
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

function createFreshBlankProject(): DigitalProductProject {
  const now = new Date().toISOString();
  return sanitizeProjectForStorage({
    ...structuredClone(BLANK_PROJECT),
    projectId: `proj_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  });
}

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [project, setProject] = useState<DigitalProductProject>(() => createFreshBlankProject());
  const [savedProjects, setSavedProjects] = useState<DigitalProductProject[]>([]);
  const [lang, setLang] = useState<Language>(() => loadStoredLang());
  const [activeView, setActiveView] = useState<NavigationItem>('dashboard');

  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const revisionsRef = useRef<Record<string, number>>({});
  const [saveStatus, setSaveStatus] = useState<LocalSaveStatus>('saved');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingLegacyProjects, setPendingLegacyProjects] = useState<DigitalProductProject[]>([]);

  const skipAutosaveProjectIdRef = useRef<string | null>(null);
  const cloudHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const currentProjectRef = useRef(project);
  const langRef = useRef(lang);

  useEffect(() => {
    currentProjectRef.current = project;
  }, [project]);

  useEffect(() => {
    langRef.current = lang;
    saveStoredLang(lang);
  }, [lang]);

  const updateRevision = useCallback((projectId: string, revision: number) => {
    revisionsRef.current = { ...revisionsRef.current, [projectId]: revision };
    setRevisions((prev) => ({ ...prev, [projectId]: revision }));
  }, []);

  // Firebase Google Auth listener
  useEffect(() => {
    scrubLegacyApiKeyStorage();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        setAuthError(
          langRef.current === 'en'
            ? 'Your Google account email must be verified to access Digital Product Studio.'
            : '您的 Google 帳戶電子郵件須完成驗證方可進入數位產品工作室。'
        );
        await signOut(auth);
        setAuthUser(null);
        setAuthReady(true);
        return;
      }

      setAuthError(null);
      setAuthUser(user);
      setAuthReady(true);

      if (!user) {
        cloudHydratedRef.current = false;
        revisionsRef.current = {};
        setRevisions({});
        setSavedProjects([]);
        const blank = createFreshBlankProject();
        skipAutosaveProjectIdRef.current = blank.projectId;
        setProject(blank);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Ensure user profile exists in Firestore BEFORE attaching projects listener
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    let unsubscribeSnapshot: (() => void) | null = null;

    const initCloudWorkspace = async () => {
      setCloudBusy(true);
      setWorkspaceError(null);
      try {
        await ensureUserProfile(authUser, langRef.current);
        if (cancelled) return;

        const legacy = inspectLegacyLocalProjects();
        setPendingLegacyProjects(legacy.hasPendingLegacy ? legacy.projects : []);

        unsubscribeSnapshot = subscribeUserProjects(
          authUser.uid,
          (records) => {
            if (cancelled) return;
            const nextRevs: Record<string, number> = {};
            const cloudList = records.map((r) => {
              nextRevs[r.project.projectId] = r.revision;
              return sanitizeProjectForStorage(r.project);
            });
            revisionsRef.current = nextRevs;
            setRevisions(nextRevs);

            if (cloudList.length > 0) {
              const currentId = currentProjectRef.current.projectId;
              const match = cloudList.find((p) => p.projectId === currentId) || cloudList[0];
              skipAutosaveProjectIdRef.current = match.projectId;
              setSavedProjects(cloudList);
              setProject(match);
              setSaveStatus('saved');
            } else {
              const fresh = currentProjectRef.current.isBlankProject
                ? currentProjectRef.current
                : createFreshBlankProject();
              skipAutosaveProjectIdRef.current = fresh.projectId;
              setSavedProjects([fresh]);
              setProject(fresh);
              setSaveStatus('saved');
            }

            cloudHydratedRef.current = true;
            setCloudBusy(false);
          },
          (err: any) => {
            if (cancelled) return;
            setWorkspaceError(
              err?.message ||
                (langRef.current === 'en'
                  ? 'Could not sync projects from Cloud Firestore.'
                  : '無法從 Cloud Firestore 同步專案資料。')
            );
            setCloudBusy(false);
          }
        );
      } catch (err: any) {
        if (!cancelled) {
          setWorkspaceError(err?.message || 'Failed to initialize cloud user profile.');
          setCloudBusy(false);
        }
      }
    };

    void initCloudWorkspace();

    return () => {
      cancelled = true;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [authUser]);

  const persistProjectNow = useCallback(
    async (targetProject: DigitalProductProject) => {
      if (!authUser) return;
      if (targetProject.isBlankProject && !revisionsRef.current[targetProject.projectId]) {
        return;
      }

      setSaveStatus('saving');
      setWorkspaceError(null);
      try {
        const result = await saveProjectToFirestore(authUser.uid, targetProject);
        updateRevision(result.project.projectId, result.revision);
        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('error');
        setWorkspaceError(err?.message || 'Could not save project to Cloud Firestore.');
      }
    },
    [authUser, updateRevision]
  );

  // Debounced Cloud Firestore autosave on workspace mutations
  useEffect(() => {
    if (!authUser || !cloudHydratedRef.current) return;

    if (skipAutosaveProjectIdRef.current === project.projectId) {
      skipAutosaveProjectIdRef.current = null;
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void persistProjectNow(project);
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [authUser, project, persistProjectNow]);

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
        const items = Array.from(sidebar?.querySelectorAll<HTMLElement>('button, input, a[href]') || []).filter(
          (el) => el.getClientRects().length && !el.hasAttribute('disabled')
        );
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setNavigationOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', handleKey);
      desktop.removeEventListener('change', closeOnDesktop);
      navigationTrigger.current?.focus();
    };
  }, [navigationOpen]);

  const progressPercent = calculateOverallProgress(project);

  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState('');
  const handleRunMarketDiscovery = async (options?: MarketSyncOptions) => {
    if (researchBusy) return;
    setResearchBusy(true);
    setResearchError('');
    try {
      const result = await runAutomatedMarketDiscovery(options);
      setProject((prev) =>
        revokeApprovals(
          {
            ...prev,
            isBlankProject: false,
            updatedAt: new Date().toISOString(),
            marketResearch: {
              ...prev.marketResearch,
              platformEvidence: result.observations,
              topicCandidates: result.candidates,
              selectedTopicId: result.candidates.some((c) => c.id === prev.marketResearch.selectedTopicId)
                ? prev.marketResearch.selectedTopicId
                : null,
              sourceReports: result.sources,
              researchDate: result.checkedAt,
              confidence: result.observations.length ? 'MEDIUM' : 'LIMITED',
            },
            workflow: {
              ...prev.workflow,
              stageStatuses: {
                ...prev.workflow.stageStatuses,
                market_research: result.observations.length ? 'COMPLETED' : 'BLOCKED',
                topic_selection: 'NEEDS_REVIEW',
              },
            },
          },
          'gateA'
        )
      );
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : 'Research failed.');
    } finally {
      setResearchBusy(false);
    }
  };

  const handleSynchronizeMarketToGateA = (options?: MarketSyncOptions) => {
    setProject((prev) =>
      revokeApprovals(
        {
          ...prev,
          isBlankProject: false,
          updatedAt: new Date().toISOString(),
          marketResearch: {
            ...prev.marketResearch,
            topicCandidates: deriveSynchronizedCandidates(prev.marketResearch.platformEvidence, options),
          },
        },
        'gateA'
      )
    );
    setActiveView('market_research');
  };

  const handleSelectTopic = (topicId: string) =>
    setProject((prev) => ({
      ...propagateTopicToDownstream(prev, topicId, lang),
      isBlankProject: false,
    }));
  const handleApproveGateA = () => setProject((prev) => approveGate({ ...prev, isBlankProject: false }, 'gateA'));

  const [checkingReferences, setCheckingReferences] = useState(false);
  const [workflowError, setWorkflowError] = useState('');

  const approveWithSourceCheck = async (gate: 'gateB' | 'gateC'): Promise<boolean> => {
    if (checkingReferences || gateIssues(project, gate).length) return false;
    setCheckingReferences(true);
    setWorkflowError('');
    try {
      const result = await verifyProjectReferences(project);
      if (!result.valid) {
        setWorkflowError(result.message);
        return false;
      }
      if (currentProjectRef.current !== project) {
        setWorkflowError('The project changed during source checking. Review the current state and approve again.');
        return false;
      }
      setProject((prev) => (prev === project ? approveGate(prev, gate) : prev));
      return true;
    } finally {
      setCheckingReferences(false);
    }
  };
  const handleApproveGateB = () => approveWithSourceCheck('gateB');
  const handleApproveGateC = () => approveWithSourceCheck('gateC');

  const handleUpdateIntake = (updatedIntake: any) => {
    setProject((prev) => ({
      ...prev,
      isBlankProject: false,
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
    setProject((prev) => {
      const revoked = revokeApprovals(prev, 'gateB');
      const selected = prev.uvz.positioningOptions.find((o) => o.id === optionId);
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            uvz: optionId ? 'COMPLETED' : 'PARTIAL',
          },
        },
        charter: {
          ...prev.charter,
          targetAudience: selected?.targetPersona || prev.charter.targetAudience,
          centralPromise: selected?.promise || prev.charter.centralPromise,
          isApproved: false,
        },
        uvz: {
          ...prev.uvz,
          selectedOptionId: optionId,
        },
      };
    });
  };

  const handleUpdateUvz = (updatedUvz: UVZAnalysis) => {
    setProject((prev) => {
      const revoked = revokeApprovals(prev, 'gateB');
      const selected = updatedUvz.positioningOptions.find((o) => o.id === updatedUvz.selectedOptionId);
      const hasContent = updatedUvz.positioningOptions.length > 0 && Boolean(updatedUvz.selectedOptionId);
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            uvz: hasContent ? 'COMPLETED' : 'PARTIAL',
          },
        },
        charter: {
          ...prev.charter,
          targetAudience: selected?.targetPersona || prev.charter.targetAudience,
          centralPromise: selected?.promise || prev.charter.centralPromise,
          isApproved: false,
          approvedAt: undefined,
        },
        uvz: updatedUvz,
      };
    });
  };

  const handleSelectTitleOption = (titleId: string) => {
    setProject((prev) => {
      const revoked = revokeApprovals(prev, 'gateB');
      const selected = prev.transformationMap.titleOptions.find((t) => t.id === titleId);
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            transformation_map: titleId ? 'COMPLETED' : 'PARTIAL',
          },
        },
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
      };
    });
  };

  const handleUpdateTransformationMap = (updatedMap: TransformationMap) => {
    setProject((prev) => {
      const revoked = revokeApprovals(prev, 'gateB');
      const selected = updatedMap.titleOptions.find((t) => t.id === updatedMap.selectedTitleId);
      const isComplete =
        updatedMap.titleOptions.length > 0 &&
        (updatedMap.beforeState?.currentPains?.length > 0 || updatedMap.bridgeProcess?.keyMilestones?.length > 0);
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            transformation_map: isComplete ? 'COMPLETED' : 'PARTIAL',
          },
        },
        transformationMap: updatedMap,
        charter: {
          ...prev.charter,
          ...(selected ? { productTitle: selected.title, subtitle: selected.subtitle } : {}),
          centralPromise: updatedMap.bigPromise || prev.charter.centralPromise,
          signatureFramework:
            updatedMap.bridgeProcess?.signatureFrameworkName || prev.charter.signatureFramework,
          isApproved: false,
          approvedAt: undefined,
        },
      };
    });
  };

  const handleUpdateCharter = (updatedCharter: ProductCharter) => {
    setProject((prev) => {
      const revoked = revokeApprovals(prev, 'gateB');
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        name: updatedCharter.productTitle || prev.name,
        charter: {
          ...updatedCharter,
          isApproved: false,
          approvedAt: undefined,
        },
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            product_charter: 'PARTIAL',
          },
        },
      };
    });
  };

  const handleUpdateChapter = (chapterId: string, content: string, wordCount: number) => {
    setProject((prev) => ({
      ...prev,
      isBlankProject: false,
      updatedAt: new Date().toISOString(),
      workflow: {
        ...revokeApprovals(prev, 'gateC').workflow,
        stageStatuses: {
          ...revokeApprovals(prev, 'gateC').workflow.stageStatuses,
          content_studio: prev.outline.every((ch) => ch.id === chapterId || ch.isCompleted) ? 'COMPLETED' : 'PARTIAL',
        },
      },
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
      isBlankProject: false,
      updatedAt: new Date().toISOString(),
      productBible: updatedBible,
    }));
  };

  const handleUpdateBrand = (updatedBrand: DigitalProductProject['brand']) => {
    setProject((prev) => ({
      ...prev,
      isBlankProject: false,
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
      isBlankProject: false,
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

  const handleRecordAiUsage = (usage?: { total_tokens?: number; estimatedCostUsd?: number }, _model?: string) => {
    const tokens = Number(usage?.total_tokens || 0);
    const incrementalCost =
      typeof usage?.estimatedCostUsd === 'number'
        ? usage.estimatedCostUsd
        : Number(((tokens / 1_000_000) * 0.35).toFixed(4));

    setProject((prev) => ({
      ...prev,
      isBlankProject: false,
      aiSettings: {
        ...prev.aiSettings,
        provider: 'gemini',
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
    }));
  };

  const handleSwitchProject = (target: DigitalProductProject) => {
    skipAutosaveProjectIdRef.current = target.projectId;
    setProject(sanitizeProjectForStorage(target));
    setWorkflowError('');
    setWorkspaceError(null);
    if (authUser) {
      void ensureUserProfile(authUser, langRef.current, target.projectId);
    }
  };

  const handleDuplicateProject = async (source: DigitalProductProject) => {
    if (!authUser) return;
    setWorkflowError('');
    setWorkspaceError(null);
    const now = new Date().toISOString();
    const copyTitle = `${source.charter?.productTitle || source.name || 'Project'} (Copy)`;
    const cloned = sanitizeProjectForStorage({
      ...structuredClone(source),
      projectId: `proj_${Date.now()}`,
      isBlankProject: false,
      name: copyTitle,
      createdAt: now,
      updatedAt: now,
      charter: {
        ...source.charter,
        productTitle: source.charter?.productTitle ? `${source.charter.productTitle} (Copy)` : copyTitle,
      },
    });
    skipAutosaveProjectIdRef.current = cloned.projectId;
    setProject(cloned);
    await persistProjectNow(cloned);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!authUser) return;
    setWorkspaceError(null);
    try {
      await deleteProjectFromFirestore(authUser.uid, projectId);
      const nextRevs = { ...revisionsRef.current };
      delete nextRevs[projectId];
      revisionsRef.current = nextRevs;
      setRevisions(nextRevs);

      const remaining = savedProjects.filter((p) => p.projectId !== projectId);
      if (remaining.length === 0) {
        const fresh = createFreshBlankProject();
        skipAutosaveProjectIdRef.current = fresh.projectId;
        setSavedProjects([fresh]);
        setProject(fresh);
      } else if (project.projectId === projectId) {
        skipAutosaveProjectIdRef.current = remaining[0].projectId;
        setProject(remaining[0]);
      }
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Could not delete project from Cloud Firestore.');
    }
  };

  const handleStartNewProject = async (params: any) => {
    if (!authUser) return;
    setWorkspaceError(null);
    const now = new Date().toISOString();
    const newProj = sanitizeProjectForStorage({
      ...structuredClone(BLANK_PROJECT),
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
    });

    skipAutosaveProjectIdRef.current = newProj.projectId;
    setProject(newProj);
    await persistProjectNow(newProj);
    void ensureUserProfile(authUser, langRef.current, newProj.projectId);
  };

  const handleLoadProjectIntoStore = async (loaded: DigitalProductProject) => {
    if (!authUser) return;
    const clean = revokeApprovals(
      {
        ...sanitizeProjectForStorage(loaded),
        isBlankProject: false,
        preferences: {
          ...loaded.preferences,
          automationMode:
            loaded.preferences?.automationMode === 'guided_until_gate'
              ? 'guided_until_gate'
              : 'manual_review',
          autoApproveNonCritical: false,
        },
      },
      'gateA'
    );

    skipAutosaveProjectIdRef.current = clean.projectId;
    setProject(clean);
    await persistProjectNow(clean);
  };

  const handleImportLegacyLocal = async () => {
    if (!authUser || pendingLegacyProjects.length === 0) return;
    setCloudBusy(true);
    try {
      for (const leg of pendingLegacyProjects) {
        const clean = revokeApprovals(
          {
            ...sanitizeProjectForStorage(leg),
            isBlankProject: false,
          },
          'gateA'
        );
        await saveProjectToFirestore(authUser.uid, clean);
      }
      markLegacyProjectsMigrated(true);
      setPendingLegacyProjects([]);
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Failed to migrate local projects to Cloud Firestore.');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleDismissLegacyLocal = () => {
    markLegacyProjectsMigrated(false);
    setPendingLegacyProjects([]);
  };

  const handleRefreshCloud = async () => {
    if (!authUser) return;
    await persistProjectNow(project);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Could not sign out.');
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <StudioLogo size={36} />
        <div className="flex items-center gap-2 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>{lang === 'en' ? 'Initializing Studio Session...' : '正在驗證工作室登入狀態...'}</span>
        </div>
      </div>
    );
  }

  if (!authUser || !authUser.emailVerified) {
    return <GoogleSignInGate lang={lang} setLang={setLang} initialError={authError} />;
  }

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
      case 'topic_selection':
        return (
          <MarketIntelligenceView
            project={project}
            setActiveView={setActiveView}
            researchBusy={researchBusy}
            researchError={researchError}
            onRefreshResearch={handleRunMarketDiscovery}
            onSynchronizeToGateA={handleSynchronizeMarketToGateA}
            onSelectTopic={handleSelectTopic}
            onApproveGateA={handleApproveGateA}
            lang={lang}
          />
        );
      case 'project_brief':
        return (
          <ProjectBriefView
            project={project}
            setActiveView={setActiveView}
            onUpdateIntake={handleUpdateIntake}
            onRecordAiUsage={handleRecordAiUsage}
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
            onRecordAiUsage={handleRecordAiUsage}
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
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'reference_library':
        return (
          <ReferenceLibraryView
            onAddSource={(source, chapterIds) =>
              setProject((prev) =>
                revokeApprovals(
                  {
                    ...prev,
                    isBlankProject: false,
                    updatedAt: new Date().toISOString(),
                    referenceLibrary: {
                      ...prev.referenceLibrary,
                      cards: [...prev.referenceLibrary.cards, source],
                      verifiedCount:
                        prev.referenceLibrary.cards.filter(isRetrievedSource).length +
                        Number(isRetrievedSource(source)),
                    },
                    outline: prev.outline.map((ch) =>
                      chapterIds.includes(ch.id)
                        ? { ...ch, mappedReferenceIds: [...new Set([...ch.mappedReferenceIds, source.id])] }
                        : ch
                    ),
                  },
                  'gateB'
                )
              )
            }
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
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'outline_builder':
        return (
          <OutlineBuilderView
            project={project}
            setActiveView={setActiveView}
            onUpdateOutline={(out) =>
              setProject((prev) =>
                revokeApprovals(
                  { ...prev, isBlankProject: false, updatedAt: new Date().toISOString(), outline: out },
                  out.length !== prev.outline.length ||
                    out.some((ch) => {
                      const old = prev.outline.find((item) => item.id === ch.id);
                      return !old || chapterResearchFingerprint(old) !== chapterResearchFingerprint(ch);
                    })
                    ? 'gateB'
                    : 'gateC'
                )
              )
            }
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'content_studio':
        return (
          <ContentStudioView
            onReviewCitations={(chapterId, citationReviews) =>
              setProject((prev) =>
                revokeApprovals(
                  {
                    ...prev,
                    isBlankProject: false,
                    updatedAt: new Date().toISOString(),
                    outline: prev.outline.map((ch) => (ch.id === chapterId ? { ...ch, citationReviews } : ch)),
                  },
                  'gateC'
                )
              )
            }
            onUpdateIllustrations={(chapterId, illustrations) =>
              setProject((prev) =>
                revokeApprovals(
                  {
                    ...prev,
                    isBlankProject: false,
                    updatedAt: new Date().toISOString(),
                    outline: prev.outline.map((ch) => (ch.id === chapterId ? { ...ch, illustrations } : ch)),
                  },
                  'gateC'
                )
              )
            }
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
            onSaveResource={(resource) =>
              setProject((prev) => {
                const revoked = revokeApprovals(prev, 'gateC');
                return {
                  ...revoked,
                  isBlankProject: false,
                  updatedAt: new Date().toISOString(),
                  resources: [...prev.resources.filter((item) => item.id !== resource.id), resource],
                  workflow: {
                    ...revoked.workflow,
                    stageStatuses: {
                      ...revoked.workflow.stageStatuses,
                      workbook_studio: 'COMPLETED',
                    },
                  },
                };
              })
            }
            onSaveResources={(incomingResources) =>
              setProject((prev) => {
                const revoked = revokeApprovals(prev, 'gateC');
                const incomingIds = new Set(incomingResources.map((r) => r.id));
                const nextResources = [
                  ...prev.resources.filter((item) => !incomingIds.has(item.id)),
                  ...incomingResources,
                ];
                return {
                  ...revoked,
                  isBlankProject: false,
                  updatedAt: new Date().toISOString(),
                  resources: nextResources,
                  workflow: {
                    ...revoked.workflow,
                    stageStatuses: {
                      ...revoked.workflow.stageStatuses,
                      workbook_studio: nextResources.length > 0 ? 'COMPLETED' : 'PARTIAL',
                    },
                  },
                };
              })
            }
            onRecordAiUsage={handleRecordAiUsage}
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
            onRecordAiUsage={handleRecordAiUsage}
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
            onSourceCheckFailed={(message) => {
              setWorkflowError(message);
              setProject((prev) => revokeApprovals(prev, 'gateC'));
            }}
            project={project}
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
            onLoadProject={handleLoadProjectIntoStore}
            setActiveView={setActiveView}
            revisions={revisions}
            onRefreshProjects={handleRefreshCloud}
            localBusy={cloudBusy}
            workspaceError={workspaceError}
            pendingLegacyCount={pendingLegacyProjects.length}
            onImportLegacyLocal={handleImportLegacyLocal}
            onDismissLegacyLocal={handleDismissLegacyLocal}
            lang={lang}
          />
        );
      case 'ai_settings':
        return (
          <AISettingsView
            project={project}
            onUpdateAiSettings={(newAi) =>
              setProject((prev) => ({
                ...prev,
                isBlankProject: false,
                updatedAt: new Date().toISOString(),
                aiSettings: newAi,
              }))
            }
            lang={lang}
          />
        );
      case 'automation_settings':
        return (
          <AutomationSettingsView
            project={project}
            onSavePreferences={(prefs) =>
              setProject((prev) => ({
                ...prev,
                isBlankProject: false,
                updatedAt: new Date().toISOString(),
                preferences: {
                  ...prefs,
                  automationMode:
                    prefs.automationMode === 'guided_until_gate'
                      ? 'guided_until_gate'
                      : 'manual_review',
                  autoApproveNonCritical: false,
                },
              }))
            }
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
      <a href="#main-content" className="skip-link">
        {lang === 'en' ? 'Skip to content' : '跳至內容'}
      </a>
      {navigationOpen && (
        <button
          tabIndex={-1}
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavigationOpen(false)}
        />
      )}
      <Sidebar
        isOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        project={project}
        activeView={activeView}
        setActiveView={setActiveView}
        progressPercent={progressPercent}
        lang={lang}
      />

      <div inert={navigationOpen} className="workspace-body flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          navigationOpen={navigationOpen}
          onToggleNavigation={() => setNavigationOpen((v) => !v)}
          project={project}
          activeView={activeView}
          setActiveView={setActiveView}
          progressPercent={progressPercent}
          lang={lang}
          setLang={setLang}
          saveStatus={saveStatus}
          activeRevision={revisions[project.projectId]}
          onRetrySave={() => void persistProjectNow(project)}
          onReloadProject={() => void handleRefreshCloud()}
          userEmail={authUser.email}
          userDisplayName={authUser.displayName}
          userPhotoUrl={authUser.photoURL}
          onSignOut={() => void handleSignOut()}
        />

        <main id="main-content" tabIndex={-1} className="workspace-main flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 lg:p-5 flex flex-col">
          {checkingReferences && (
            <p role="status" className="mb-3 p-3.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg text-sm font-medium">
              Checking original source records and retained excerpts. Approval remains pending.
            </p>
          )}
          {workflowError && (
            <p role="alert" className="mb-3 p-3.5 bg-amber-50 text-amber-950 border border-amber-200 rounded-lg text-sm font-medium">
              {workflowError}
            </p>
          )}
          {workspaceError && (
            <div role="alert" className="mb-3 p-3.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg text-sm font-medium">
              <span>{workspaceError}</span>
            </div>
          )}
          <div className="flex-1 w-full">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}
