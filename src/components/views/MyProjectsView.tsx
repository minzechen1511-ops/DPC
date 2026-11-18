import React, { useRef, useState } from 'react';
import {
  FolderKanban,
  Download,
  Upload,
  Sparkles,
  Copy,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { BLANK_PROJECT } from '../../data/demoProject.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { sanitizeProjectForStorage } from '../../utils/projectStorage.ts';

interface MyProjectsViewProps {
  currentProject: DigitalProductProject;
  savedProjects: DigitalProductProject[];
  onSwitchProject: (project: DigitalProductProject) => void;
  onDuplicateProject: (project: DigitalProductProject) => void;
  onDeleteProject: (projectId: string) => void;
  onLoadProject: (project: DigitalProductProject) => void;
  setActiveView: (view: any) => void;
  revisions?: Record<string, number>;
  onRefreshProjects?: () => Promise<void>;
  localBusy?: boolean;
  workspaceError?: string | null;
  pendingLegacyCount?: number;
  onImportLegacyLocal?: () => Promise<void>;
  onDismissLegacyLocal?: () => void;
  lang?: Language;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({
  currentProject,
  savedProjects,
  onSwitchProject,
  onDuplicateProject,
  onDeleteProject,
  onLoadProject,
  setActiveView,
  revisions = {},
  onRefreshProjects,
  localBusy = false,
  workspaceError = null,
  pendingLegacyCount = 0,
  onImportLegacyLocal,
  onDismissLegacyLocal,
  lang = 'en',
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleExportBackup = (proj: DigitalProductProject = currentProject) => {
    const clean = sanitizeProjectForStorage(proj);
    const jsonStr = JSON.stringify(clean, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${clean.projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.projectId && (parsed.charter || parsed.name)) {
          onLoadProject(sanitizeProjectForStorage(parsed));
          setNotice({
            type: 'success',
            text: lang === 'en' ? 'Sanitized project restored to your cloud library.' : '已安全去識別化並匯入至您的雲端專案庫。',
          });
          setActiveView('dashboard');
        } else {
          setNotice({
            type: 'error',
            text: lang === 'en' ? 'Invalid project backup JSON file.' : '匯入的檔案不是有效的專案備份檔。',
          });
        }
      } catch (err: any) {
        setNotice({ type: 'error', text: lang === 'en' ? `Parse error: ${err.message}` : `解析失敗: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetBlank = () => {
    const now = new Date().toISOString();
    onLoadProject({
      ...BLANK_PROJECT,
      projectId: `proj_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    });
    setNotice({
      type: 'success',
      text: lang === 'en' ? 'Created a clean blank cloud workspace.' : '已建立全新空白雲端工作區。',
    });
    setActiveView('dashboard');
  };

  const projectsList = savedProjects.length ? savedProjects : [currentProject];

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Header */}
      <div className="lab-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <FolderKanban className="w-4 h-4" />
            <span>{t.navMyProjects}</span>
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono">
              <Cloud className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Cloud Synced' : '雲端即時同步'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'en' ? 'My Cloud Projects Repository' : '個人雲端數位商品專案庫'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {lang === 'en'
              ? 'All projects are securely isolated to your Google account in Cloud Firestore with automatic revision snapshots and sanitized JSON export.'
              : '所有專案均依您的 Google 帳戶安全隔離並保存於雲端工作區，支援自動版次紀錄與無金鑰 JSON 備份。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onRefreshProjects && (
            <button
              type="button"
              disabled={localBusy}
              onClick={() => void onRefreshProjects()}
              className="px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${localBusy ? 'animate-spin' : ''}`} />
              <span>{lang === 'en' ? 'Sync Cloud' : '同步雲端'}</span>
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{lang === 'en' ? 'Import JSON' : '匯入專案 JSON'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportBackup(currentProject)}
            className="px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'en' ? 'Export Backup' : '匯出專案備份'}</span>
          </button>
          <button
            type="button"
            onClick={handleResetBlank}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            + {lang === 'en' ? 'New Blank Project' : '建立全新空白專案'}
          </button>
        </div>
      </div>

      {pendingLegacyCount > 0 && onImportLegacyLocal && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-indigo-950 space-y-1">
            <strong className="block font-bold">
              {lang === 'en'
                ? `Found ${pendingLegacyCount} prior browser-saved project(s)`
                : `偵測到 ${pendingLegacyCount} 筆先前瀏覽器暫存專案`}
            </strong>
            <span className="text-indigo-800">
              {lang === 'en'
                ? 'Import your local drafts securely into your Cloud Firestore account, or dismiss.'
                : '可一鍵將本機暫存草稿安全匯入至您的雲端帳戶，或略過。'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void onImportLegacyLocal()}
              disabled={localBusy}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              {lang === 'en' ? 'Import to Cloud' : '匯入雲端帳戶'}
            </button>
            {onDismissLegacyLocal && (
              <button
                type="button"
                onClick={onDismissLegacyLocal}
                className="px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 rounded-lg"
              >
                {lang === 'en' ? 'Dismiss' : '略過'}
              </button>
            )}
          </div>
        </div>
      )}

      {(notice || workspaceError) && (
        <p
          role={notice?.type === 'error' || workspaceError ? 'alert' : 'status'}
          className={`px-4 py-3 rounded-lg text-sm font-medium border ${
            notice?.type === 'error' || workspaceError
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {workspaceError || notice?.text}
        </p>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
        {projectsList.map((proj) => {
          const isActive = proj.projectId === currentProject.projectId;
          const completedChapters = (proj.outline || []).filter((c) => c.isCompleted).length;
          const sourceCount = proj.referenceLibrary?.verifiedCount || (proj.referenceLibrary?.cards || []).length;
          const qaScore = proj.qualityReport?.overallScore || 0;
          const regularPrice = proj.pricingReport?.regularPrice || 29;
          const currency = proj.pricingReport?.currency || 'USD';
          const rev = revisions[proj.projectId];

          return (
            <div
              key={proj.projectId}
              className={`bg-white rounded-xl p-6 space-y-5 flex flex-col justify-between transition-all ${
                isActive ? 'border-2 border-indigo-600 shadow-sm' : 'border border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-mono font-bold inline-flex items-center gap-1.5 ${
                      isActive ? 'text-indigo-700' : 'text-slate-500'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    {isActive
                      ? lang === 'en'
                        ? 'Active Workspace'
                        : '目前啟用中專案'
                      : lang === 'en'
                      ? 'Saved Cloud Workspace'
                      : '雲端已存檔專案'}
                    {typeof rev === 'number' && (
                      <span className="ml-1.5 font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        rev {rev}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    {currency} ${regularPrice}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    {proj.charter?.productTitle || proj.name || t.untitledProject}
                  </h2>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {proj.charter?.subtitle ||
                      proj.charter?.centralPromise ||
                      (lang === 'en' ? 'Custom commercial product workspace' : '自訂商業數位產品工作區')}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-3 py-3 px-4 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase">{t.sources}</span>
                    <strong className="text-base tabular-nums">{sourceCount}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase">{t.chapters}</span>
                    <strong className="text-base tabular-nums">
                      {completedChapters}/{(proj.outline || []).length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase">QA</span>
                    <strong className="text-base text-emerald-700 tabular-nums">{qaScore}/100</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicateProject(proj);
                        setNotice({
                          type: 'success',
                          text: lang === 'en' ? 'Duplicated project into a new cloud workspace.' : '已複製專案至新雲端工作區。',
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Duplicate' : '複製'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportBackup(proj)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>

                    {confirmDeleteId === proj.projectId ? (
                      <span className="inline-flex items-center gap-1.5 ml-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(proj.projectId);
                            setConfirmDeleteId(null);
                            setNotice({
                              type: 'success',
                              text: lang === 'en' ? 'Project removed from cloud repository.' : '已從雲端移除專案。',
                            });
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                        >
                          {lang === 'en' ? 'Confirm Delete' : '確認刪除'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          {lang === 'en' ? 'Cancel' : '取消'}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={lang === 'en' ? `Delete ${proj.name}` : `刪除 ${proj.name}`}
                        onClick={() => setConfirmDeleteId(proj.projectId)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="text-sm text-indigo-700 font-semibold hover:text-indigo-900 inline-flex items-center gap-1.5"
                    >
                      <span>{lang === 'en' ? 'Open Dashboard' : '進入工作台'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchProject(proj);
                        setActiveView('dashboard');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                      {lang === 'en' ? 'Switch Active' : '切換使用'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Clean Slate Launcher Card */}
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 space-y-4 flex flex-col justify-between hover:border-indigo-500 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
                {lang === 'en' ? 'Starter Template' : '全新空白起點'}
              </span>
              <span className="font-mono text-xs text-slate-500">clean-workspace</span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                {lang === 'en' ? 'Start a New Digital Product Workspace' : '開啟全新空白數位產品工作區'}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'en'
                  ? 'Initialize a clean cloud pipeline ready for fresh multi-platform discovery in Stage 1.'
                  : '建立空白雲端工作區並從第一階段多平台市場情報探索開始。'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-slate-600 text-xs font-medium">
              {lang === 'en' ? 'Zero Pre-filled Sample Data' : '無任何預填範本資料'}
            </span>
            <button
              type="button"
              onClick={handleResetBlank}
              className="px-4 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'en' ? 'Create Blank' : '建立空白專案'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
