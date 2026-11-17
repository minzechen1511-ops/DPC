import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Save,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { DigitalProductProject, MarketRegion, ProductFormat, UserPreferences } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { apiJson } from '../../services/apiClient.ts';

interface Props {
  project: DigitalProductProject;
  onSavePreferences: (prefs: UserPreferences) => void;
  lang?: Language;
}

interface JobStepItem {
  id: string;
  stepOrder: number;
  stepKey: string;
  status: string;
  errorMessage?: string | null;
}

interface WorkflowJobItem {
  id: string;
  projectId: string;
  mode: 'manual_review' | 'guided_until_gate';
  stopAtGate: 'gateA' | 'gateB' | 'gateC';
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const AutomationSettingsView: React.FC<Props> = ({
  project,
  onSavePreferences,
  lang = 'en',
}) => {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>(project.preferences);
  const [jobs, setJobs] = useState<WorkflowJobItem[]>([]);
  const [selectedJobSteps, setSelectedJobSteps] = useState<JobStepItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [stopAtGate, setStopAtGate] = useState<'gateA' | 'gateB' | 'gateC'>('gateA');
  const [jobBusy, setJobBusy] = useState(false);
  const [jobNotice, setJobNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const t = translations[lang];

  useEffect(() => {
    setPrefs(project.preferences);
  }, [project.projectId, project.preferences]);

  const loadJobs = useCallback(async () => {
    const res = await apiJson<{ jobs: WorkflowJobItem[] }>(
      `/api/jobs?projectId=${encodeURIComponent(project.projectId)}`
    );
    if (res.ok && Array.isArray(res.data?.jobs)) {
      setJobs(res.data.jobs);
      if (res.data.jobs.length > 0 && !selectedJobId) {
        const firstId = res.data.jobs[0].id;
        setSelectedJobId(firstId);
        const detail = await apiJson<{ steps: JobStepItem[] }>(`/api/jobs/${encodeURIComponent(firstId)}`);
        if (detail.ok && Array.isArray(detail.data?.steps)) {
          setSelectedJobSteps(detail.data.steps);
        }
      }
    }
  }, [project.projectId, selectedJobId]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const inspectJob = async (jobId: string) => {
    setSelectedJobId(jobId);
    const detail = await apiJson<{ steps: JobStepItem[] }>(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (detail.ok && Array.isArray(detail.data?.steps)) {
      setSelectedJobSteps(detail.data.steps);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedMode: UserPreferences['automationMode'] =
      prefs.automationMode === 'guided_until_gate' ? 'guided_until_gate' : 'manual_review';

    onSavePreferences({
      ...prefs,
      automationMode: resolvedMode,
      autoApproveNonCritical: false,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCreateJob = async () => {
    setJobBusy(true);
    setJobNotice(null);
    try {
      const mode = prefs.automationMode === 'guided_until_gate' ? 'guided_until_gate' : 'manual_review';
      const res = await apiJson<{ job?: WorkflowJobItem; steps?: JobStepItem[]; error?: string }>('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.projectId,
          mode,
          stopAtGate,
        }),
      });
      if (!res.ok) {
        setJobNotice({
          type: 'error',
          text: res.data?.error || 'Could not queue guided workflow job.',
        });
      } else {
        setJobNotice({
          type: 'success',
          text:
            lang === 'en'
              ? `Guided job queued and paused safely ahead of ${stopAtGate}.`
              : `已建立引導式工作任務，並將在 ${stopAtGate} 審查閘門前安全暫停等待確認。`,
        });
        if (res.data?.job?.id) {
          setSelectedJobId(res.data.job.id);
          setSelectedJobSteps(res.data.steps || []);
        }
        await loadJobs();
      }
    } finally {
      setJobBusy(false);
    }
  };

  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'retry' | 'cancel') => {
    setJobBusy(true);
    setJobNotice(null);
    try {
      const res = await apiJson<{ error?: string }>(`/api/jobs/${encodeURIComponent(jobId)}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setJobNotice({ type: 'error', text: res.data?.error || `Job ${action} failed.` });
      } else {
        await loadJobs();
        await inspectJob(jobId);
      }
    } finally {
      setJobBusy(false);
    }
  };

  const lockedCount = (project.outline || []).filter((c) => c.isLocked || c.isCompleted).length;

  return (
    <div className="w-full space-y-5 pb-3">
      <form onSubmit={handleSave} className="lab-panel p-5 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <Sliders className="w-4 h-4" />
            <span>{t.navAutomationSettings}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'en' ? 'Workflow, Guided Queue & Review Settings' : '工作流程、引導式排程與審查設定'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {lang === 'en'
              ? 'Choose explicit stage-by-stage review or guided workflow execution up to the next human Gate checkpoint. Gates A, B, and C always require manual approval.'
              : '可選擇逐階段手動審查，或使用引導式流程執行至下一道人類品質閘門（Gate A、B、C 永遠需要本人明確核准）。'}
          </p>
        </div>

        {/* Execution Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label
            className={`p-5 rounded-xl border cursor-pointer transition-colors ${
              prefs.automationMode !== 'guided_until_gate'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Manual Stage-by-Stage Review' : '逐階段嚴格手動審查 (Manual Review)'}
              </span>
              <input
                type="radio"
                name="automationMode"
                checked={prefs.automationMode !== 'guided_until_gate'}
                onChange={() => setPrefs({ ...prefs, automationMode: 'manual_review', autoApproveNonCritical: false })}
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Trigger each research, draft, and export action individually with full editorial control.'
                : '每個研究、撰寫與匯出動作皆由您手動觸發與確認。'}
            </p>
          </label>

          <label
            className={`p-5 rounded-xl border cursor-pointer transition-colors ${
              prefs.automationMode === 'guided_until_gate'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Guided Workflow Until Gate' : '引導式執行至品質閘門'}
              </span>
              <input
                type="radio"
                name="automationMode"
                checked={prefs.automationMode === 'guided_until_gate'}
                onChange={() => setPrefs({ ...prefs, automationMode: 'guided_until_gate', autoApproveNonCritical: false })}
              />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Queue durable preparation steps locally and pause automatically at Gate A/B/C. Never overwrites locked chapters.'
                : '於本機紀錄準備步驟並自動於 Gate A/B/C 前暫停等待審查；已鎖定或完成章節將保留不覆寫。'}
            </p>
          </label>
        </div>

        {/* Editable Commercial Workspace Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Target Market' : '目標銷售市場'}</span>
            <select
              value={prefs.market}
              onChange={(e) => setPrefs({ ...prefs, market: e.target.value as MarketRegion })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            >
              <option value="US">United States (US)</option>
              <option value="UK">United Kingdom (UK)</option>
              <option value="CA">Canada (CA)</option>
              <option value="AU">Australia (AU)</option>
              <option value="TW">Taiwan (TW)</option>
              <option value="GLOBAL_EN">Global English</option>
              <option value="CUSTOM">Custom Region</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Publication Language' : '出版語言方向'}</span>
            <select
              value={prefs.language}
              onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            >
              <option value="English">English</option>
              <option value="Traditional Chinese">Traditional Chinese (繁體中文)</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Product Deliverable Format' : '預設產品交付形式'}</span>
            <select
              value={prefs.productFormat}
              onChange={(e) => setPrefs({ ...prefs, productFormat: e.target.value as ProductFormat })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            >
              <option value="ebook_toolkit">E-Book + Companion Toolkit</option>
              <option value="ebook">Flagship E-Book Only</option>
              <option value="workbook">Interactive Workbook</option>
              <option value="template_bundle">Template & SOP Bundle</option>
              <option value="mini_course">Self-Paced Mini Course</option>
              <option value="challenge">Guided 28-Day Challenge</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">{lang === 'en' ? 'Evidence Source Target' : '目標參考文獻篇數'}</span>
            <select
              value={prefs.referenceTarget}
              onChange={(e) => setPrefs({ ...prefs, referenceTarget: Number(e.target.value) as 8 | 20 | 30 })}
              className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900"
            >
              <option value={8}>8 sources (Compact Guide)</option>
              <option value={20}>20 sources (Standard Flagship)</option>
              <option value={30}>30 sources (Authoritative Edition)</option>
            </select>
          </label>
        </div>

        {/* Bilingual Gate Protocol Checklist */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h2 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'en' ? 'Publication Gate Governance' : '三道人類品質閘門審查規範'}</span>
          </h2>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5 leading-relaxed">
            <li>
              {lang === 'en'
                ? 'Gate A: Inspect live marketplace signals and explicitly approve a product niche.'
                : 'Gate A：審查多平台市場排行與消費者信號後，核准明確的選題方向。'}
            </li>
            <li>
              {lang === 'en'
                ? 'Gate B: Define the 13-field brief, research primary sources, inspect retrieved excerpts, and approve the Product Charter.'
                : 'Gate B：定義 13 項簡報、建立具備原文擷取證據的來源庫，並核准不可更動產品憲章。'}
            </li>
            <li>
              {lang === 'en'
                ? 'Manuscript & Toolkit: Draft each chapter and companion resource; verify passage-level support in Content Studio.'
                : '內容與工具套件：撰寫各章內文與伴隨工具模板，逐段落審查引用與來源對應。'}
            </li>
            <li>
              {lang === 'en'
                ? 'Gate C: Resolve citation and quality issues, customize brand & pricing, approve final review, and export the buyer ZIP.'
                : 'Gate C：解決所有品質檢查項目、配置品牌識別與商業定價後，核准出口並打包完整買家套件。'}
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <Save size={16} />
            <span>{t.saveSettings}</span>
          </button>

          {saved && (
            <p role="status" className="text-sm font-medium text-emerald-700 inline-flex gap-2 items-center">
              <CheckCircle2 size={16} />
              <span>
                {lang === 'en'
                  ? 'Workflow & workspace preferences saved.'
                  : '工作流程與專案偏好設定已儲存。'}
              </span>
            </p>
          )}
        </div>
      </form>

      {/* Local Durable Guided Workflow Queue */}
      <div className="lab-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {lang === 'en' ? 'Local Guided Workflow Queue' : '本機引導式任務排程紀錄'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {lang === 'en'
                ? `Jobs pause before Gates A/B/C for explicit human review. ${lockedCount} locked/completed chapter(s) in this project are protected.`
                : `所有排程任務皆會在 Gate A/B/C 前自動暫停。目前專案有 ${lockedCount} 個已鎖定/完成章節受到保護不予覆寫。`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <select
              value={stopAtGate}
              onChange={(e) => setStopAtGate(e.target.value as 'gateA' | 'gateB' | 'gateC')}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 font-medium text-slate-800"
            >
              <option value="gateA">{lang === 'en' ? 'Pause at Gate A' : '於 Gate A 暫停'}</option>
              <option value="gateB">{lang === 'en' ? 'Pause at Gate B' : '於 Gate B 暫停'}</option>
              <option value="gateC">{lang === 'en' ? 'Pause at Gate C' : '於 Gate C 暫停'}</option>
            </select>

            <button
              type="button"
              disabled={jobBusy}
              onClick={() => void handleCreateJob()}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{lang === 'en' ? 'Queue Guided Job' : '建立引導任務'}</span>
            </button>

            <button
              type="button"
              onClick={() => void loadJobs()}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg"
              title={lang === 'en' ? 'Refresh job queue' : '重新整理任務列表'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {jobNotice && (
          <p
            role={jobNotice.type === 'error' ? 'alert' : 'status'}
            className={`px-4 py-3 rounded-lg text-sm font-medium border ${
              jobNotice.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {jobNotice.text}
          </p>
        )}

        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
            {lang === 'en'
              ? 'No workflow jobs queued yet for the active project.'
              : '目前工作區尚無引導式排程任務紀錄。'}
          </p>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  selectedJobId === job.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void inspectJob(job.id)}
                  className="text-left space-y-1 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-slate-900">{job.id}</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold uppercase text-xs">
                      {job.status}
                    </span>
                    <span className="text-xs font-mono text-indigo-700 font-semibold">stop: {job.stopAtGate}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {lang === 'en' ? 'Mode' : '模式'}: {job.mode} · {new Date(job.createdAt).toLocaleString()}
                  </p>
                </button>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={jobBusy}
                    onClick={() => void handleJobAction(job.id, 'pause')}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Pause' : '暫停'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={jobBusy}
                    onClick={() => void handleJobAction(job.id, 'resume')}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Resume' : '繼續'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={jobBusy}
                    onClick={() => void handleJobAction(job.id, 'retry')}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Retry' : '重試'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={jobBusy}
                    onClick={() => void handleJobAction(job.id, 'cancel')}
                    className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Cancel' : '取消'}</span>
                  </button>
                </div>
              </div>
            ))}

            {selectedJobSteps.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold">#</th>
                      <th className="py-3 px-4 font-semibold">{lang === 'en' ? 'Pipeline Step' : '流程步驟'}</th>
                      <th className="py-3 px-4 font-semibold">{lang === 'en' ? 'Status' : '狀態'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedJobSteps.map((step) => (
                      <tr key={step.id}>
                        <td className="py-3 px-4 font-mono text-slate-500">{step.stepOrder}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">{step.stepKey}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              step.status === 'skipped_locked'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : step.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {step.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
