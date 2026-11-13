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
          setNotice({ type: 'success', text: lang === 'en' ? 'Project restored successfully.' : '專案備份檔已成功還原。' });
          setActiveView('dashboard');
        } else {
          setNotice({ type: 'error', text: lang === 'en' ? 'Invalid project backup JSON file.' : '匯入的檔案不是有效的專案備份檔。' });
        }
      } catch (err: any) {
        setNotice({ type: 'error', text: lang === 'en' ? `Parse error: ${err.message}` : `解析失敗: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const handleResetBlank = () => {
    const now = new Date().toISOString();
    onLoadProject({
      ...BLANK_PROJECT,
      projectId: `proj_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    });
    setNotice({ type: 'success', text: lang === 'en' ? 'Created a clean blank project.' : '已建立全新空白專案。' });
    setActiveView('dashboard');
  };

  const projectsList = savedProjects.length ? savedProjects : [currentProject];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>{t.navMyProjects}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {lang === 'en' ? 'Digital Product Projects Repository' : '我的數位產品專案庫'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? 'All studio workspaces auto-save locally. Switch active products, clone editions, or export sanitized JSON backups.'
              : '所有開發專案均自動儲存於本地瀏覽器。可自由切換產品、複製版本或匯出無金鑰安全 JSON 備份。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Import JSON' : '匯入專案 JSON'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportBackup(currentProject)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Export Backup' : '匯出專案備份'}</span>
          </button>
          <button
            type="button"
            onClick={handleResetBlank}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            + {lang === 'en' ? 'New Blank Project' : '建立全新空白專案'}
          </button>
        </div>
      </div>

      {notice && (
        <p
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`px-4 py-3 rounded-lg text-xs font-medium border ${
            notice.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectsList.map((proj) => {
          const isActive = proj.projectId === currentProject.projectId;
          const completedChapters = (proj.outline || []).filter((c) => c.isCompleted).length;
          const sourceCount = proj.referenceLibrary?.verifiedCount || (proj.referenceLibrary?.cards || []).length;
          const qaScore = proj.qualityReport?.overallScore || 0;
          const regularPrice = proj.pricingReport?.regularPrice || 29;
          const currency = proj.pricingReport?.currency || 'USD';

          return (
            <div
              key={proj.projectId}
              className={`bg-white rounded-xl p-6 space-y-4 flex flex-col justify-between transition-all ${
                isActive ? 'border-2 border-indigo-600 shadow-xs' : 'border border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                      isActive ? 'text-indigo-700' : 'text-slate-500'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    {isActive
                      ? lang === 'en' ? 'Active Workspace' : '目前啟用中專案'
                      : lang === 'en' ? 'Saved Workspace' : '已存檔專案'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currency} ${regularPrice}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900">
                    {proj.charter?.productTitle || proj.name || t.untitledProject}
                  </h2>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {proj.charter?.subtitle ||
                      proj.charter?.centralPromise ||
                      (lang === 'en' ? 'Custom commercial product workspace' : '自訂商業數位產品工作區')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.sources}</span>
                    <strong className="tabular-nums">{sourceCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.chapters}</span>
                    <strong className="tabular-nums">{completedChapters}/{(proj.outline || []).length}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">QA</span>
                    <strong className="text-emerald-600 tabular-nums">{qaScore}/100</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicateProject(proj);
                        setNotice({ type: 'success', text: lang === 'en' ? 'Duplicated project into a new workspace.' : '已複製專案至新工作區。' });
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{lang === 'en' ? 'Duplicate' : '複製'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportBackup(proj)}
                      className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>JSON</span>
                    </button>

                    {confirmDeleteId === proj.projectId ? (
                      <span className="inline-flex items-center gap-1.5 ml-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(proj.projectId);
                            setConfirmDeleteId(null);
                            setNotice({ type: 'success', text: lang === 'en' ? 'Project removed from repository.' : '已移除專案。' });
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded"
                        >
                          {lang === 'en' ? 'Confirm Delete' : '確認刪除'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                        >
                          {lang === 'en' ? 'Cancel' : '取消'}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={lang === 'en' ? `Delete ${proj.name}` : `刪除 ${proj.name}`}
                        onClick={() => setConfirmDeleteId(proj.projectId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => setActiveView('dashboard')}
                      className="text-indigo-600 font-semibold hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      <span>{lang === 'en' ? 'Open Dashboard' : '進入工作台'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchProject(proj);
                        setActiveView('dashboard');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
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
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 space-y-3 flex flex-col justify-between hover:border-indigo-400 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {lang === 'en' ? 'Starter Template' : '全新空白起點'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">clean-workspace</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Start a New Digital Product Workspace' : '開啟全新空白數位產品工作區'}
              </h2>
              <p className="text-xs text-slate-600">
                {lang === 'en'
                  ? 'Initialize a clean pipeline ready for fresh multi-platform discovery in Stage 1.'
                  : '建立空白工作區並從第一階段多平台市場情報探索開始。'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">{lang === 'en' ? 'Zero Pre-filled Sample Data' : '無任何預填範本資料'}</span>
            <button
              type="button"
              onClick={handleResetBlank}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>{lang === 'en' ? 'Create Blank' : '建立空白專案'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
