import { addAiUsage } from './utils/aiSettings.ts';
import { WorkflowJourney, WorkflowHandoff } from './components/WorkflowJourney.tsx';
import {handoffContextCurrent, journeyStage, nextJourneyStage, prepareStageHandoff, StageHandoffRunner, stageName, stageRequirements, workflowSaveError, markLaterStagesForReview, preserveChapterDraftsOnOutlineEdit} from './utils/stageJourney.ts';
import { GATE_A_STEPS, gateAJourney, selectJourneyTopic, setupStage, usableMap } from './utils/gateAJourney.ts';
import { verifyProjectReferences } from './services/referenceVerification.ts';
import { isRetrievedSource } from './utils/sourceEvidence.ts';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import {
  DigitalProductProject,
  MarketplaceObservation,
  ProductCharter,
  UVZAnalysis,
  TransformationMap,
  ProductBible,
  SalesAssets,
  StageId,
} from './types/project.ts';
import { BLANK_PROJECT } from './data/demoProject.ts';
import { approveGate, revokeApprovals, gateIssues } from './utils/gatePolicy.ts';
import { Header, LocalSaveStatus } from './components/Header.tsx';
import { Sidebar, NavigationItem } from './components/Sidebar.tsx';
import { GoogleSignInGate } from './components/GoogleSignInGate.tsx';
import { calculateOverallProgress, computeOutlineStageStatus } from './utils/workflowEngine.ts';
import { Language } from './utils/i18n.ts';
import {
  runAutomatedMarketDiscovery,
  checkSeedResourceDirectory,
  deriveSynchronizedCandidates,
  isGateAQualifiedEvidence,
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
  fetchProjectFromFirestore,
  subscribeUserProjects,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  isProjectRevisionConflictError,
} from './services/firestoreProjects.ts';
import { SerializedProjectSaveQueue } from './utils/projectSaveQueue.ts';
import { StudioLogo } from './components/StudioLogo.tsx';
import { StudioGeminiChat } from './components/StudioGeminiChat.tsx';

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
  const activeViewRef=useRef(activeView);
  activeViewRef.current=activeView;
  useEffect(() => {const main=document.getElementById('main-content'); main?.scrollTo({top:0}); main?.focus();}, [activeView]);
  const [pendingHandoff,setPendingHandoff] = useState<{projectId:string;stage:StageId;navigation:number}|null>(null);
  const [handoffBusy,setHandoffBusy] = useState(false);
  const [handoffError,setHandoffError] = useState('');
  const [handoffNotice,setHandoffNotice] = useState<{from:StageId;to:StageId}|null>(null);
  const handoffRunner = useRef(new StageHandoffRunner());
  const navigationRevision = useRef(0);

  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const revisionsRef = useRef<Record<string, number>>({});
  const [saveStatus, setSaveStatus] = useState<LocalSaveStatus>('saved');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [workspaceLoadAttempt,setWorkspaceLoadAttempt] = useState(0);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingLegacyProjects, setPendingLegacyProjects] = useState<DigitalProductProject[]>([]);

  const skipAutosaveProjectIdRef = useRef<string | null>(null);
  const cloudHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const dirtyProjectIdRef = useRef<string | null>(null);
  const saveStatusRef = useRef<LocalSaveStatus>('saved');
  const saveQueueRef = useRef(
    new SerializedProjectSaveQueue<
      DigitalProductProject,
      { project: DigitalProductProject; revision: number }
    >()
  );
  const currentProjectRef = useRef(project);
  const langRef = useRef(lang);

  useEffect(() => {
    currentProjectRef.current = project;
  }, [project]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    langRef.current = lang;
    saveStoredLang(lang);
  }, [lang]);

  const updateRevision = useCallback((projectId: string, revision: number) => {
    revisionsRef.current = { ...revisionsRef.current, [projectId]: revision };
    saveQueueRef.current.setRevision(projectId, revision);
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
        dirtyProjectIdRef.current = null;
        saveQueueRef.current.reset();
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
        await ensureUserProfile(authUser, langRef.current,'',{readOnlyIfExists:true});
        if (cancelled) return;

        const legacy = inspectLegacyLocalProjects();
        setPendingLegacyProjects(legacy.hasPendingLegacy ? legacy.projects : []);

        unsubscribeSnapshot = subscribeUserProjects(
          authUser.uid,
          (records) => {
            if (cancelled) return;
            const currentId = currentProjectRef.current.projectId;
            const hasUnsavedCurrent =
              dirtyProjectIdRef.current === currentId ||
              saveQueueRef.current.hasPending(currentId) ||
              saveStatusRef.current === 'conflict';
            const knownCurrentRev = revisionsRef.current[currentId];
            const remoteCurrentRecord = records.find((r) => r.project.projectId === currentId);
            const hasRemoteConflictOnActive =
              Boolean(
                hasUnsavedCurrent &&
                  remoteCurrentRecord &&
                  knownCurrentRev !== undefined &&
                  remoteCurrentRecord.revision > knownCurrentRev
              );

            const nextRevs: Record<string, number> = {};
            const cloudList = records.map((r) => {
              const rev =
                r.project.projectId === currentId && hasRemoteConflictOnActive
                  ? knownCurrentRev!
                  : r.revision;
              nextRevs[r.project.projectId] = rev;
              saveQueueRef.current.setRevision(r.project.projectId, rev);
              return sanitizeProjectForStorage(r.project);
            });
            revisionsRef.current = nextRevs;
            setRevisions(nextRevs);

            if (hasRemoteConflictOnActive) {
              setSavedProjects(cloudList);
              setSaveStatus('conflict');
              setWorkspaceError(
                langRef.current === 'en'
                  ? 'A newer revision exists in Cloud Firestore. Reload from Cloud before overwriting.'
                  : '雲端已有較新版次（於其他工作階段更新），請先重新載入雲端版本以免覆寫。'
              );
              cloudHydratedRef.current = true;
              setCloudBusy(false);
              return;
            }

            if (cloudList.length > 0) {
              const match = cloudList.find((p) => p.projectId === currentId) || cloudList[0];
              if (!cloudHydratedRef.current && journeyStage(match.workflow.activeStage)) setActiveView(setupStage(match.workflow.activeStage) as NavigationItem);
              if (!hasUnsavedCurrent || match.projectId !== currentId) {
                skipAutosaveProjectIdRef.current = match.projectId;
                dirtyProjectIdRef.current = null;
                setProject(match);
                setSaveStatus('saved');
              }
              setSavedProjects(cloudList);
            } else {
              const fresh = currentProjectRef.current.isBlankProject
                ? currentProjectRef.current
                : createFreshBlankProject();
              skipAutosaveProjectIdRef.current = fresh.projectId;
              dirtyProjectIdRef.current = null;
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
              workflowSaveError(err,langRef.current) ||
                (langRef.current === 'en'
                  ? 'Could not sync projects from Cloud Firestore.'
                  : '無法從 Cloud Firestore 同步專案資料。')
            );
            setCloudBusy(false);
          }
        );
      } catch (err: any) {
        if (!cancelled) {
          setWorkspaceError(workflowSaveError(err,langRef.current));
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
  }, [authUser,workspaceLoadAttempt]);

  const persistProjectNow = useCallback(
    async (targetProject: DigitalProductProject) => {
      if (!authUser) return false;
      if (targetProject.isBlankProject && !revisionsRef.current[targetProject.projectId]) {
        return true;
      }
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      const initialExpected =
        revisionsRef.current[targetProject.projectId] !== undefined
          ? revisionsRef.current[targetProject.projectId]
          : 0;

      setSaveStatus('saving');
      setWorkspaceError(null);
      try {
        const result = await saveQueueRef.current.enqueue(
          targetProject,
          (snapshot, expectedRevision) =>
            saveProjectToFirestore(authUser.uid, snapshot, { expectedRevision }),
          initialExpected
        );
        updateRevision(result.project.projectId, result.revision);
        if (dirtyProjectIdRef.current === result.project.projectId) {
          dirtyProjectIdRef.current = null;
        }
        setSaveStatus('saved');
        return true;
      } catch (err: any) {
        if (isProjectRevisionConflictError(err)) {
          setSaveStatus('conflict');
          setWorkspaceError(
            langRef.current === 'en'
              ? `Save blocked by revision conflict (expected r${err.expectedRevision}, cloud is at r${err.actualRevision}). Reload from Cloud to inspect the latest version.`
              : `版次衝突，已阻止舊資料覆蓋雲端（本機預期 r${err.expectedRevision}，雲端為 r${err.actualRevision}）。請先點擊重新載入雲端版本。`
          );
          return false;
        }
        setSaveStatus('error');
        setWorkspaceError(workflowSaveError(err,langRef.current));
        return false;
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

    dirtyProjectIdRef.current = project.projectId;

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
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [researchError, setResearchError] = useState('');

  const updateProjectObservations = (
    updater: (prevObs: MarketplaceObservation[]) => MarketplaceObservation[],
    options?: MarketSyncOptions
  ) => {
    setProject((prev) => {
      const nextEvidence = updater(prev.marketResearch.platformEvidence || []);
      const nextCandidates = deriveSynchronizedCandidates(nextEvidence, options);
      const hasQualified = nextEvidence.some((o) => isGateAQualifiedEvidence(o));
      return revokeApprovals(
        {
          ...prev,
          isBlankProject: false,
          updatedAt: new Date().toISOString(),
          marketResearch: {
            ...prev.marketResearch,
            platformEvidence: nextEvidence,
            topicCandidates: nextCandidates,
            selectedTopicId: nextCandidates.some((c) => c.id === prev.marketResearch.selectedTopicId)
              ? prev.marketResearch.selectedTopicId
              : null,
            confidence: hasQualified ? 'MEDIUM' : 'LIMITED',
          },
          workflow: {
            ...prev.workflow,
            stageStatuses: {
              ...prev.workflow.stageStatuses,
              market_research: hasQualified ? 'COMPLETED' : 'PARTIAL',
              topic_selection: 'NEEDS_REVIEW',
            },
          },
        },
        'gateA'
      );
    });
  };

  const setGateAProject = (update: (current: DigitalProductProject) => DigitalProductProject) => {
    setProject(current => current.projectId === project.projectId ? update(current) : current);
  };
  const navigateJourney = (view: NavigationItem) => {
    const destination = setupStage(view) as NavigationItem;
    navigationRevision.current += 1;
    setPendingHandoff(null);
    setHandoffNotice(null);
    setHandoffError('');
    setActiveView(destination);
    if (journeyStage(destination)) {
      setProject(current => ({...current, workflow: {...current.workflow, activeStage: destination as any}}));
    }
  };
  const requestHandoff = (stage:StageId) => {
    if (handoffRunner.current.busy) return;
    if (journeyStage(activeViewRef.current)!==stage || currentProjectRef.current.projectId!==project.projectId) return;
    setHandoffError('');
    setPendingHandoff({projectId:project.projectId,stage,navigation:navigationRevision.current});
  };
  const downloadRecoveryBackup = () => {
    const current=currentProjectRef.current;
    const url=URL.createObjectURL(new Blob([JSON.stringify(sanitizeProjectForStorage(current),null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download=`DPC-recovery-${current.projectId}.json`;
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  };
  const navigateFromStage = (view:NavigationItem) => {
    const from=journeyStage(activeView);
    if (from && nextJourneyStage(from) === view) requestHandoff(from);
    else navigateJourney(view);
  };
  useEffect(() => {
    if (!pendingHandoff || handoffRunner.current.busy) return;
    const current=currentProjectRef.current;
    const contextCurrent=()=>handoffContextCurrent(pendingHandoff,{projectId:currentProjectRef.current.projectId,view:activeViewRef.current,navigation:navigationRevision.current});
    if (!contextCurrent()) {setPendingHandoff(null);return;}
    const snapshot=prepareStageHandoff(current,pendingHandoff.stage);
    if (!snapshot) {
      setHandoffError(stageRequirements(current,pendingHandoff.stage,langRef.current)[0] || (langRef.current==='en'?'Complete the earlier stages on the recommended path first.':'請先依推薦流程完成前置階段。'));
      setPendingHandoff(null); return;
    }
    setHandoffBusy(true);
    skipAutosaveProjectIdRef.current=snapshot.projectId;
    dirtyProjectIdRef.current=snapshot.projectId;
    currentProjectRef.current=snapshot;
    setProject(snapshot);
    const isCurrent=()=>contextCurrent() && JSON.stringify(currentProjectRef.current)===JSON.stringify(snapshot);
    void handoffRunner.current.run(snapshot,persistProjectNow,isCurrent).then(moved=>{
      if (moved) {
        setActiveView(snapshot.workflow.activeStage);
        setHandoffNotice({from:pendingHandoff.stage,to:snapshot.workflow.activeStage});
      } else if (isCurrent()) {
        skipAutosaveProjectIdRef.current=snapshot.projectId;
        setProject(prev=>({...prev,workflow:{...prev.workflow,activeStage:pendingHandoff.stage}}));
        setHandoffError(langRef.current==='en'?'Your work remains open. Cloud save did not complete; retry save & continue.':'已保留目前工作。雲端儲存未完成，請重試儲存並繼續。');
      }
    }).catch(()=>setHandoffError(langRef.current==='en'?'The handoff failed. Your current work remains open; retry.':'階段交接失敗，已保留目前工作，請重試。')).finally(()=>{
      setHandoffBusy(false);setPendingHandoff(null);
    });
  },[pendingHandoff,persistProjectNow]);

  const handleRunMarketDiscovery = async (options?: MarketSyncOptions) => {
    if (researchBusy) return;
    setResearchBusy(true);
    setResearchError('');
    setGateAProject(prev => ({...prev, marketResearch: {...prev.marketResearch, scanState: 'running', lastScanError: ''}}));
    try {
      const result = await runAutomatedMarketDiscovery(options);
      setGateAProject((prev) => {
        const preservedManual = (prev.marketResearch.platformEvidence || []).filter(
          (obs) =>
            !obs.isSample &&
            obs.collector !== 'apple-chart-v1' &&
            obs.collector !== 'amazon-chart-v1'
        );
        const liveIds = new Set(result.observations.map((o) => o.id));
        const mergedEvidence = [
          ...result.observations,
          ...preservedManual.filter((o) => !liveIds.has(o.id)),
        ];
        const candidates = deriveSynchronizedCandidates(mergedEvidence, options);
        const hasQualified = mergedEvidence.some((o) => isGateAQualifiedEvidence(o));
        return revokeApprovals(
          {
            ...prev,
            isBlankProject: false,
            updatedAt: new Date().toISOString(),
            marketResearch: {
              ...prev.marketResearch,
              resourceDirectory: result.resourceDirectory,
              platformEvidence: mergedEvidence,
              topicCandidates: candidates,
              selectedTopicId: candidates.some((c) => c.id === prev.marketResearch.selectedTopicId)
                ? prev.marketResearch.selectedTopicId
                : null,
              sourceReports: result.sources,
              researchDate: result.checkedAt,
              scanState: 'complete', lastScanError: '',
              confidence: hasQualified ? 'MEDIUM' : 'LIMITED',
            },
            workflow: {
              ...prev.workflow,
              stageStatuses: {
                ...prev.workflow.stageStatuses,
                market_research: hasQualified ? 'COMPLETED' : mergedEvidence.length ? 'PARTIAL' : 'BLOCKED',
                topic_selection: 'NEEDS_REVIEW',
              },
            },
          },
          'gateA'
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Research failed.';
      setResearchError(message);
      setGateAProject(prev => ({...prev, marketResearch: {...prev.marketResearch, scanState: 'error', lastScanError: message}}));
    } finally {
      setResearchBusy(false);
    }
  };

  const handleCheckResources = async () => {
    if (directoryBusy) return;
    setDirectoryBusy(true);
    setResearchError('');
    try {
      const res = await checkSeedResourceDirectory();
      setProject((prev) => ({
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        marketResearch: {
          ...prev.marketResearch,
          resourceDirectory: res.resources,
          researchDate: res.checkedAt,
        },
      }));
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : 'Resource directory check failed.');
    } finally {
      setDirectoryBusy(false);
    }
  };

  const handleAddManualObservation = (obs: MarketplaceObservation) => {
    updateProjectObservations((prev) => [obs, ...prev]);
  };

  const handleImportObservations = (obsList: MarketplaceObservation[]) => {
    const incomingIds = new Set(obsList.map((o) => o.id));
    updateProjectObservations((prev) => [
      ...obsList,
      ...prev.filter((o) => !incomingIds.has(o.id)),
    ]);
  };

  const handleReviewObservation = (updated: MarketplaceObservation) => {
    updateProjectObservations((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleEditObservation = (updated: MarketplaceObservation) => {
    updateProjectObservations((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleDeleteObservation = (obsId: string) => {
    updateProjectObservations((prev) => prev.filter((item) => item.id !== obsId));
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
    setActiveView('topic_selection');
  };

  const handleSelectTopic = (topicId: string, selectedAudienceHypothesisId?: string) =>
    setProject((prev) => {
      const next = selectJourneyTopic(prev, topicId, lang, selectedAudienceHypothesisId);
      if (next === prev) return prev;
      const revoked = markLaterStagesForReview(revokeApprovals({ ...next, isBlankProject: false }, 'gateA'),'topic_selection');
      return {
        ...revoked,
        workflow: {
          ...revoked.workflow,
          activeStage: prev.workflow.activeStage,
        },
      };
    });
  const handleApproveGateA = () => {
    if (gateIssues(project, 'gateA').length) return;
    setProject(prev => prev.projectId === project.projectId
      ? {...approveGate({...prev, isBlankProject: false}, 'gateA'), workflow: {
        ...approveGate({...prev, isBlankProject: false}, 'gateA').workflow, activeStage: 'project_brief'}} : prev);
    requestHandoff('topic_selection');
  };

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

  const handleUpdateIntake = (updatedIntake: any, accept=false) => {
    setGateAProject((prev) => JSON.stringify(prev.intake) === JSON.stringify(updatedIntake) && prev.workflow.stageStatuses.project_brief === 'COMPLETED' ? prev : ({
      ...prev,
      isBlankProject: false,
      updatedAt: new Date().toISOString(),
      intake: updatedIntake,
      charter: { ...prev.charter, isApproved: false, approvedAt: undefined },
      workflow: {
        ...markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'project_brief').workflow,
        stageStatuses: {
          ...markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'project_brief').workflow.stageStatuses,
          project_brief: accept ? 'COMPLETED' : 'NEEDS_REVIEW',
          uvz: JSON.stringify(prev.intake) === JSON.stringify(updatedIntake) ? prev.workflow.stageStatuses.uvz : 'NEEDS_REVIEW',
          transformation_map: JSON.stringify(prev.intake) === JSON.stringify(updatedIntake) ? prev.workflow.stageStatuses.transformation_map : 'NEEDS_REVIEW',
        },
      },
    }));
    if (accept) requestHandoff('project_brief');
  };

  const handleSelectUVZOption = (optionId: string) => {
    setGateAProject((prev) => {
      const revoked = markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'uvz');
      const selected = prev.uvz.positioningOptions.find((o) => o.id === optionId);
      if (!selected || (prev.uvz.selectedOptionId === optionId && prev.workflow.stageStatuses.uvz === 'COMPLETED')) return prev;
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            uvz: optionId ? 'COMPLETED' : 'PARTIAL',
            transformation_map: prev.uvz.selectedOptionId === optionId ? prev.workflow.stageStatuses.transformation_map : 'NEEDS_REVIEW',
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
    requestHandoff('uvz');
  };

  const handleUpdateUvz = (updatedUvz: UVZAnalysis) => {
    setGateAProject((prev) => {
      if (prev.marketResearch.selectedTopicId !== project.marketResearch.selectedTopicId || JSON.stringify(prev.intake) !== JSON.stringify(project.intake)) return prev;
      const revoked = markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'uvz');
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
            transformation_map: 'NEEDS_REVIEW',
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
    setGateAProject((prev) => {
      const revoked = markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'transformation_map');
      const selected = prev.transformationMap.titleOptions.find((t) => t.id === titleId);
      if (!selected || (prev.transformationMap.selectedTitleId === titleId && prev.workflow.stageStatuses.transformation_map === 'COMPLETED')) return prev;
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        workflow: {
          ...revoked.workflow,
          stageStatuses: {
            ...revoked.workflow.stageStatuses,
            transformation_map: selected && usableMap({...prev, transformationMap: {...prev.transformationMap, selectedTitleId: titleId}}) ? 'COMPLETED' : 'PARTIAL',
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
    requestHandoff('transformation_map');
  };

  const handleUpdateTransformationMap = (updatedMap: TransformationMap) => {
    setGateAProject((prev) => {
      if (JSON.stringify(prev.uvz) !== JSON.stringify(project.uvz) || JSON.stringify(prev.intake) !== JSON.stringify(project.intake)) return prev;
      const revoked = markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'transformation_map');
      const selected = updatedMap.titleOptions.find((t) => t.id === updatedMap.selectedTitleId);
      const isComplete = usableMap({...prev, transformationMap: updatedMap});
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
      const revoked = markLaterStagesForReview(revokeApprovals(prev, 'gateB'),'product_charter');
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
    if (project.outline.length && project.outline.every(ch=>ch.id===chapterId || ch.isCompleted) && wordCount >= 100) requestHandoff('content_studio');
  };

  const handleUpdateProductBible = (updatedBible: ProductBible) => {
    setProject((prev) => {
      const revoked = revokeApprovals(prev, 'gateC');
      return {
        ...prev,
        isBlankProject: false,
        updatedAt: new Date().toISOString(),
        productBible: updatedBible,
        workflow: revoked.workflow,
      };
    });
  };

  const handleUpdateBrand = (updatedBrand: DigitalProductProject['brand'], finish=false) => {
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
          brand_design: finish ? 'COMPLETED' : 'NEEDS_REVIEW',
        },
      },
    }));
    if (finish) requestHandoff('brand_design');
  };

  const handleUpdatePricingAndSales = (
    pricingReport: DigitalProductProject['pricingReport'],
    salesAssets: SalesAssets,
    finish=false
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
          pricing_launch: finish ? 'COMPLETED' : 'NEEDS_REVIEW',
        },
      },
    }));
    if (finish) requestHandoff('pricing_launch');
  };

  const handleUpdateAiSettings = (newAi: any) => {
    setProject((prev) => ({
      ...prev,
      isBlankProject: false,
      updatedAt: new Date().toISOString(),
      aiSettings: newAi,
    }));
  };

  const handleRecordAiUsage = (
    usage?: { total_tokens?: number; estimatedCostUsd?: number },
    modelArg?: string,
    providerArg?: 'gemini' | 'openrouter' | 'openai'
  ) => {
    setProject(prev => prev.projectId !== project.projectId ? prev : ({...prev,isBlankProject:false,aiSettings:addAiUsage(prev.aiSettings,usage)}));
  };

  const handleSwitchProject = (target: DigitalProductProject) => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    dirtyProjectIdRef.current = null;
    skipAutosaveProjectIdRef.current = target.projectId;
    setProject(sanitizeProjectForStorage(target));
    setSaveStatus('saved');
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
      saveQueueRef.current.clearProject(projectId);
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
    if (!authUser) throw new Error('Sign in before creating a project.');
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
        activeStage: 'topic_selection',
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
    if (!(await persistProjectNow(newProj))) throw new Error('Project creation could not be saved. Your draft remains open; retry cloud sync before continuing.');
    navigateJourney('topic_selection');
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

  const handleReloadFromCloud = async () => {
    if (!authUser) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const targetId = currentProjectRef.current.projectId;
    dirtyProjectIdRef.current = null;
    saveQueueRef.current.clearProject(targetId);
    setCloudBusy(true);
    setWorkspaceError(null);
    try {
      const record = await fetchProjectFromFirestore(authUser.uid, targetId);
      if (record) {
        skipAutosaveProjectIdRef.current = record.project.projectId;
        updateRevision(record.project.projectId, record.revision);
        setProject(sanitizeProjectForStorage(record.project));
        setSavedProjects((prev) =>
          prev.some((p) => p.projectId === record.project.projectId)
            ? prev.map((p) => (p.projectId === record.project.projectId ? record.project : p))
            : [record.project, ...prev]
        );
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setWorkspaceError(err?.message || 'Failed to reload latest project revision from Cloud Firestore.');
    } finally {
      setCloudBusy(false);
    }
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
    if (!cloudHydratedRef.current) return <section role="status" className="lab-panel p-6 space-y-3">
      <h1 className="text-xl font-semibold">{cloudBusy?(lang==='en'?'Loading your saved workspace…':'正在載入已儲存工作區…'):(lang==='en'?'Workspace has not loaded':'工作區尚未載入')}</h1>
      <p className="text-sm text-slate-700">{lang==='en'?'Your existing projects have not been replaced. Wait for cloud loading or retry if it failed.':'既有專案未被取代；請等待雲端載入，若失敗可重試。'}</p>
      {!cloudBusy&&<button type="button" onClick={()=>setWorkspaceLoadAttempt(attempt=>attempt+1)} className="px-4 py-2 rounded-lg bg-teal-800 text-white">{lang==='en'?'Retry workspace loading':'重試載入工作區'}</button>}
    </section>;
    const flow = gateAJourney(project);
    const index = GATE_A_STEPS.indexOf(setupStage(activeView) as any);
    if (index >= 1 && !flow.available[index]) return <section className="lab-panel p-6 space-y-3" role="status">
      <h1 className="text-xl font-semibold">{lang === 'en' ? 'Complete the previous decision first' : '請先完成前一項決策'}</h1>
      <p>{lang === 'en' ? 'Your saved drafts remain available. Follow the recommended path to approve the niche, accept the brief, or choose positioning before continuing.' : '已保留您的草稿。請依推薦流程核准題材、接受簡報或選擇定位後再繼續。'}</p>
      <button type="button" onClick={() => navigateJourney(flow.next as NavigationItem)} className="px-4 py-2 rounded-lg bg-teal-800 text-white">{lang === 'en' ? 'Continue recommended path' : '繼續推薦流程'}</button>
    </section>;
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            project={project}
            setActiveView={navigateFromStage}
            progressPercent={progressPercent}
            lang={lang}
          />
        );
      case 'new_project':
        return (
          <NewProjectWizard
            onStartProject={handleStartNewProject}
            setActiveView={navigateFromStage}
            lang={lang}
          />
        );
      case 'market_research':
        return (
          <MarketIntelligenceView
            project={project}
            setActiveView={navigateFromStage}
            researchBusy={researchBusy}
            directoryBusy={directoryBusy}
            researchError={researchError}
            onRefreshResearch={handleRunMarketDiscovery}
            onCheckResources={handleCheckResources}
            onAddManualObservation={handleAddManualObservation}
            onEditObservation={handleEditObservation}
            onImportObservations={handleImportObservations}
            onReviewObservation={handleReviewObservation}
            onDeleteObservation={handleDeleteObservation}
            onSynchronizeToGateA={handleSynchronizeMarketToGateA}
            onSelectTopic={handleSelectTopic}
            onApproveGateA={handleApproveGateA}
            onRecordAiUsage={handleRecordAiUsage}
            initialTab="discover"
            lang={lang}
          />
        );
      case 'topic_selection':
        return (
          <MarketIntelligenceView
            project={project}
            setActiveView={navigateFromStage}
            researchBusy={researchBusy}
            directoryBusy={directoryBusy}
            researchError={researchError}
            onRefreshResearch={handleRunMarketDiscovery}
            onCheckResources={handleCheckResources}
            onAddManualObservation={handleAddManualObservation}
            onEditObservation={handleEditObservation}
            onImportObservations={handleImportObservations}
            onReviewObservation={handleReviewObservation}
            onDeleteObservation={handleDeleteObservation}
            onSynchronizeToGateA={handleSynchronizeMarketToGateA}
            onSelectTopic={handleSelectTopic}
            onApproveGateA={handleApproveGateA}
            onRecordAiUsage={handleRecordAiUsage}
            initialTab="discover"
            lang={lang}
          />
        );
      case 'project_brief':
        return (
          <ProjectBriefView
            project={project}
            setActiveView={navigateFromStage}
            onUpdateIntake={handleUpdateIntake}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'uvz':
        return (
          <UVZView
            project={project}
            setActiveView={navigateFromStage}
            onSelectOption={handleSelectUVZOption}
            onUpdateUvz={handleUpdateUvz}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'transformation_map':
        return (
          <TransformationMapView
            project={project}
            setActiveView={navigateFromStage}
            onSelectTitle={handleSelectTitleOption}
            onUpdateTransformationMap={handleUpdateTransformationMap}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'reference_library':
        return (
          <ReferenceLibraryView
            onAddSource={(source, chapterIds) =>
              setProject((prev) => {
                const nextCards = [...prev.referenceLibrary.cards, source];
                const nextOutline = prev.outline.map((ch) =>
                  chapterIds.includes(ch.id)
                    ? { ...ch, mappedReferenceIds: [...new Set([...ch.mappedReferenceIds, source.id])] }
                    : ch
                );
                const revoked = revokeApprovals(
                  {
                    ...prev,
                    isBlankProject: false,
                    updatedAt: new Date().toISOString(),
                    referenceLibrary: {
                      ...prev.referenceLibrary,
                      cards: nextCards,
                      verifiedCount:
                        prev.referenceLibrary.cards.filter(isRetrievedSource).length +
                        Number(isRetrievedSource(source)),
                    },
                    outline: nextOutline,
                  },
                  'gateB'
                );
                return {
                  ...revoked,
                  workflow: {
                    ...revoked.workflow,
                    stageStatuses: {
                      ...markLaterStagesForReview(revoked,'reference_library').workflow.stageStatuses,
                      outline_builder:
                        nextOutline.length > 0
                          ? computeOutlineStageStatus(nextOutline, nextCards)
                          : revoked.workflow.stageStatuses.outline_builder,
                    },
                  },
                };
              })
            }
            project={project}
            setActiveView={navigateFromStage}
            lang={lang}
          />
        );
      case 'product_charter':
        return (
          <ProductCharterView
            project={project}
            setActiveView={navigateFromStage}
            checkingReferences={checkingReferences}
            onApproveGateB={handleApproveGateB}
            onUpdateCharter={handleUpdateCharter}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'outline_builder':
        return (
          <OutlineBuilderView
            project={project}
            setActiveView={navigateFromStage}
            onUpdateOutline={(out) => {
              if(JSON.stringify(out)===JSON.stringify(project.outline)) {requestHandoff('outline_builder');return;}
              setProject((prev) => {
                const revoked = revokeApprovals(
                  { ...prev, isBlankProject: false, updatedAt: new Date().toISOString(), outline: preserveChapterDraftsOnOutlineEdit(prev.outline,out) },
                  'gateC'
                );
                return {
                  ...revoked,
                  workflow: {
                    ...revoked.workflow,
                    stageStatuses: {
                      ...markLaterStagesForReview(revoked,'outline_builder').workflow.stageStatuses,
                      outline_builder: computeOutlineStageStatus(out, prev.referenceLibrary.cards),
                    },
                  },
                };
              });
              if (computeOutlineStageStatus(out,project.referenceLibrary.cards) === 'COMPLETED') requestHandoff('outline_builder');
            }}
            onUpdateAiSettings={handleUpdateAiSettings}
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
            setActiveView={navigateFromStage}
            onUpdateChapter={handleUpdateChapter}
            onUpdateProductBible={handleUpdateProductBible}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'workbook_studio':
        return (
          <WorkbookStudioView
            onSaveResource={(resource) => {
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
              });
              if(resource.contentMarkdown.trim().length > 150 && resource.instructions.trim()) requestHandoff('workbook_studio');
            }}
            onSaveResources={(incomingResources) => {
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
              });
              if(incomingResources.some(resource=>resource.contentMarkdown.trim().length > 150 && resource.instructions.trim())) requestHandoff('workbook_studio');
            }}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            project={project}
            setActiveView={navigateFromStage}
            lang={lang}
          />
        );
      case 'quality_assurance':
        return (
          <QualityAssuranceView
            project={project}
            setActiveView={navigateFromStage}
            checkingReferences={checkingReferences}
            onApproveGateC={handleApproveGateC}
            lang={lang}
          />
        );
      case 'brand_design':
        return (
          <BrandDesignView
            project={project}
            setActiveView={navigateFromStage}
            onUpdateBrand={handleUpdateBrand}
            onUpdateAiSettings={handleUpdateAiSettings}
            onRecordAiUsage={handleRecordAiUsage}
            lang={lang}
          />
        );
      case 'pricing_launch':
        return (
          <PricingLaunchView
            project={project}
            setActiveView={navigateFromStage}
            onUpdatePricingAndSales={handleUpdatePricingAndSales}
            onUpdateAiSettings={handleUpdateAiSettings}
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
            setActiveView={navigateFromStage}
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
            setActiveView={navigateFromStage}
            revisions={revisions}
            onRefreshProjects={handleReloadFromCloud}
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
            onUpdateAiSettings={handleUpdateAiSettings}
            lang={lang}
          />
        );
      case 'automation_settings':
        return (
          <AutomationSettingsView
            setActiveView={navigateFromStage}
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
            setActiveView={navigateFromStage}
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
        setActiveView={navigateJourney}
        progressPercent={progressPercent}
        lang={lang}
      />

      <div inert={navigationOpen} className="workspace-body flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          navigationOpen={navigationOpen}
          onToggleNavigation={() => setNavigationOpen((v) => !v)}
          project={project}
          activeView={activeView}
          setActiveView={navigateJourney}
          progressPercent={progressPercent}
          lang={lang}
          setLang={setLang}
          saveStatus={saveStatus}
          workspaceReady={cloudHydratedRef.current}
          workspaceLoading={cloudBusy}
          activeRevision={revisions[project.projectId]}
          onRetrySave={() => void persistProjectNow(project)}
          onReloadProject={() => void handleReloadFromCloud()}
          userEmail={authUser.email}
          userDisplayName={authUser.displayName}
          userPhotoUrl={authUser.photoURL}
          onSignOut={() => void handleSignOut()}
          onOpenCopilot={() => setCopilotOpen(true)}
        />

        <main id="main-content" tabIndex={-1} className="workspace-main flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 lg:p-5 flex flex-col">
          <WorkflowJourney project={project} current={activeView} onNavigate={navigateJourney} lang={lang} />
          {handoffNotice && <div role="status" className="mb-4 rounded-lg bg-teal-50 text-teal-950 p-4 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>{lang==='en'?`Saved ${stageName(handoffNotice.from,lang)}. Now: ${stageName(handoffNotice.to,lang)}.`:`已儲存${stageName(handoffNotice.from,lang)}。目前：${stageName(handoffNotice.to,lang)}。`}</span>
            <button type="button" onClick={()=>navigateJourney(handoffNotice.from)} className="underline underline-offset-4 font-semibold focus-visible:outline-2">{lang==='en'?'Revisit previous stage':'返回上一階段修改'}</button>
          </div>}
          {handoffError && <div role="alert" className="mb-3 rounded-lg bg-amber-50 text-amber-950 p-4 text-sm">
            <p>{handoffError}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <button type="button" disabled={handoffBusy} onClick={()=>{const stage=journeyStage(activeView);if(stage) requestHandoff(stage);}} className="rounded-lg px-3 py-2 bg-amber-900 text-white font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">{lang==='en'?'Retry save & continue':'重試儲存並繼續'}</button>
              <button type="button" onClick={downloadRecoveryBackup} className="rounded-lg px-3 py-2 underline underline-offset-4 font-semibold focus-visible:outline-2">{lang==='en'?'Download recovery backup':'下載復原備份'}</button>
            </div>
          </div>}
          {handoffBusy && <p role="status" className="mb-3 text-sm text-teal-900">{lang==='en'?'Saving your finished stage before opening the next…':'正在儲存已完成階段，接著開啟下一階段…'}</p>}
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
            <div role="alert" className="mb-3 p-3.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg text-sm font-medium flex flex-wrap items-center justify-between gap-3">
              <span>{workspaceError}</span>
              {saveStatus === 'conflict' && (
                <button
                  type="button"
                  onClick={() => void handleReloadFromCloud()}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shrink-0"
                >
                  {lang === 'en' ? 'Reload Latest from Cloud' : '重新載入雲端最新版本'}
                </button>
              )}
            </div>
          )}
          <div key={project.projectId} inert={handoffBusy} className="flex-1 w-full">
            {renderActiveView()}
          </div>
          <WorkflowHandoff project={project} current={activeView} lang={lang} onNavigate={navigateJourney} onFinish={()=>{const stage=journeyStage(activeView);if(stage) requestHandoff(stage);}} busy={handoffBusy} error={handoffError} onRetry={()=>{const stage=journeyStage(activeView);if(stage) requestHandoff(stage);}} />
        </main>
      </div>

      <StudioGeminiChat
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        project={project}
        activeView={activeView}
        onRecordAiUsage={handleRecordAiUsage}
        lang={lang}
      />
    </div>
  );
}
