import React, { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  Code,
  CheckCircle2,
  Layers,
  FileCode,
  Check,
  Archive,
  Loader2,
} from 'lucide-react';
import { gateIssues } from '../../utils/gatePolicy.ts';
import { sanitizeProjectForStorage } from '../../utils/projectStorage.ts';
import { DigitalProductProject } from '../../types/project.ts';
import {
  compileManuscriptMarkdown,
  compileReferenceLibraryMarkdown,
  compileCompanionResourcesMarkdown,
  compileLaunchAssetsMarkdown,
  compileExecutiveSummaryMarkdown,
  compileStyledHtml,
} from '../../utils/markdownCompiler.ts';
import { auditChapter } from '../../utils/styledBook.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { apiFetch } from '../../services/apiClient.ts';

interface ExportCenterViewProps {
  onSourceCheckFailed: (message: string) => void;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const ExportCenterView: React.FC<ExportCenterViewProps> = ({
  onSourceCheckFailed,
  project,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [downloadedItems, setDownloadedItems] = useState<Record<string, boolean>>({});
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipSuccess, setZipSuccess] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exportError, setExportError] = useState('');

  const evidence = useMemo(
    () =>
      project.outline.map((chapter) => ({
        chapter,
        audit: auditChapter(chapter, project.referenceLibrary.cards),
      })),
    [project]
  );
  const publicationIssues = gateIssues(project, 'gateC');
  const buyerReady = !publicationIssues.length && project.workflow.gates.gateC.isApproved;
  const reviewCount = evidence.reduce((sum, item) => sum + item.audit.needsReview, 0);
  const previewHtml = useMemo(() => {
    if (!showPreview) return '';
    const raw = compileStyledHtml(project);
    const previewNavHelper =
      '<script>(function(){document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href^=\\"#\\"]"):null;if(!a)return;var id=a.getAttribute("href").slice(1);if(!id)return;var el=document.getElementById(id);if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth",block:"start"});}});})();</script>';
    return raw.includes('</body>') ? raw.replace('</body>', `${previewNavHelper}</body>`) : `${raw}${previewNavHelper}`;
  }, [showPreview, project]);

  const downloadFile = (content: string, filename: string, mimeType: string, key: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedItems((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setDownloadedItems((prev) => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const exportFiles = [
    {
      id: 'executive_summary_md',
      title:
        lang === 'en'
          ? 'Executive Summary & Quick-Start Playbook (Markdown)'
          : '執行摘要與快速啟動手冊 (Executive Summary MD)',
      filename: `executive-summary-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc:
        lang === 'en'
          ? 'Concise topic purpose, Before → Bridge → After transformation roadmap, chapter takeaways table, and quick-start action steps.'
          : '精煉整理商品核心價值、轉變路徑、各章重點摘要與行動啟動步驟。',
      getContent: () => compileExecutiveSummaryMarkdown(project),
      icon: FileText,
      badge: 'Summary MD',
    },
    {
      id: 'manuscript_md',
      title:
        lang === 'en'
          ? 'Complete Manuscript (Markdown)'
          : '完整電子書專書稿件 (Complete Manuscript)',
      filename: `manuscript-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc:
        lang === 'en'
          ? `Clean Markdown manuscript containing all ${(project.outline || []).length} structured chapters with chapter deliverables and takeaways tables.`
          : '收錄全部章節完整正文、實作指引與交付物檢核表之標準 Markdown 檔案。',
      getContent: () => compileManuscriptMarkdown(project),
      icon: FileText,
      badge: 'Markdown',
    },
    {
      id: 'reference_md',
      title:
        lang === 'en'
          ? 'Source Research Library & Evidence Notes'
          : '來源研究與證據筆記 (Reference Library MD)',
      filename: `reference-library-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc:
        lang === 'en'
          ? `Export all ${project.referenceLibrary.cards.length} source records, including their recorded verification status.`
          : `收錄 ${project.referenceLibrary.cards.length} 篇文獻紀錄與各自的驗證狀態。`,
      getContent: () => compileReferenceLibraryMarkdown(project),
      icon: FileText,
      badge: 'Markdown',
    },
    {
      id: 'resources_md',
      title:
        lang === 'en'
          ? 'Companion Toolkits & Templates'
          : '實作伴隨工具與工作表 (Toolkits MD)',
      filename: `companion-toolkits-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc:
        lang === 'en'
          ? 'Fillable worksheets, execution trackers, and decision matrices ready for distribution.'
          : '收錄即開即用之填空工作表、追蹤矩陣與備忘卡。',
      getContent: () => compileCompanionResourcesMarkdown(project),
      icon: Layers,
      badge: 'Markdown',
    },
    {
      id: 'sales_assets_md',
      title:
        lang === 'en'
          ? 'Sales Copy & Launch Suite'
          : '定價策略與銷售文案 (Sales Assets MD)',
      filename: `sales-assets-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc:
        lang === 'en'
          ? 'Sales page headline copy, bullet points, FAQ list, and 3-part email launch sequence.'
          : '收錄銷售頁標題、效益重點、FAQ 與 3 封發布電郵。',
      getContent: () => compileLaunchAssetsMarkdown(project),
      icon: FileCode,
      badge: 'Markdown',
    },
    {
      id: 'project_json',
      title:
        lang === 'en'
          ? 'Sanitized Project Backup (JSON)'
          : '無金鑰安全專案備份檔 (Sanitized Backup JSON)',
      filename: `project-backup-${project.projectId}.json`,
      mime: 'application/json;charset=utf-8',
      desc:
        lang === 'en'
          ? 'Secret-free structured project schema (strips all API keys & non-portable tokens).'
          : '完全清除金鑰與敏感憑證之結構化 JSON 備份，可安全分享與重新匯入。',
      getContent: () => JSON.stringify(sanitizeProjectForStorage(project), null, 2),
      icon: Code,
      badge: 'JSON (Sanitized)',
    },
    {
      id: 'styled_html',
      title:
        lang === 'en'
          ? 'Executive E-Book Layout (Styled HTML)'
          : '精裝出版電子書 (Styled HTML)',
      filename: `ebook-${project.projectId}.html`,
      mime: 'text/html;charset=utf-8',
      desc:
        lang === 'en'
          ? 'Formatted chapters, contextual figures, linked numbered citations, a reference list, and print-to-PDF styling.'
          : '包含章節圖解、段落編號引用、文末參考文獻，可於瀏覽器列印成 PDF。',
      getContent: () => compileStyledHtml(project),
      icon: FileText,
      badge: 'HTML / PDF Ready',
    },
  ];

  const handleDownloadZip = async () => {
    setExportError('');
    const mode = buyerReady ? 'buyer_bundle' : 'author_review';

    setIsZipping(true);
    try {
      const response = await apiFetch('/api/projects/export-bundle', {
        method: 'POST',
        body: JSON.stringify({
          project: sanitizeProjectForStorage(project),
          mode,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.code === 'SOURCE_CHECK_FAILED' || errJson.code === 'MARKET_SOURCE_CHECK_FAILED') {
          onSourceCheckFailed(errJson.error || 'Source verification failed.');
        }
        throw new Error(errJson.error || `Export failed (${response.status}).`);
      }

      const zipBlob = await response.blob();
      const slug =
        (project.intake?.projectName || project.name || 'digital-product')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'digital-product';
      const zipFilename = `${slug}${
        mode === 'buyer_bundle' ? '-learning-bundle' : '-author-review'
      }.zip`;

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 3000);
    } catch (err: any) {
      setExportError(
        err?.message ||
          (lang === 'en'
            ? 'Package creation failed. Please sign in again and retry.'
            : '建立雲端壓縮包失敗，請確認登入狀態後重試。')
      );
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadAll = () => {
    exportFiles.forEach((f, idx) => {
      setTimeout(() => {
        downloadFile(f.getContent(), f.filename, f.mime, f.id);
      }, idx * 250);
    });
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Top Banner */}
      <div className="lab-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-indigo-700 mb-1">
            <Download className="w-4 h-4" />
            <span>{t.navExportCenter}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.exportTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.exportSubtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isZipping}
            className={`px-5 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap active:scale-95 ${
              zipSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isZipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : zipSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4 text-teal-100" />
            )}
            <span>
              {isZipping
                ? lang === 'en'
                  ? 'Packaging (.ZIP)...'
                  : '正在打包 (.ZIP)...'
                : zipSuccess
                ? lang === 'en'
                  ? 'ZIP Package Downloaded!'
                  : 'ZIP 壓縮包已下載！'
                : buyerReady
                ? lang === 'en'
                  ? 'Download Buyer Learning Bundle (.zip)'
                  : '下載商業買家學習套件 (.zip)'
                : lang === 'en'
                ? 'Download Author Review Bundle (.zip)'
                : '下載作者審查套件 (.zip)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAll}
            className="px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'en' ? 'Download Individually' : '分開逐一儲存'}</span>
          </button>
        </div>
      </div>

      <section className="lab-panel p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          {lang === 'en' ? 'An organized learning collection' : '結構化學習套件'}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {lang === 'en'
            ? 'The ZIP opens with a branded START-HERE.html buyer welcome portal and includes an Executive Summary & Action Playbook, bestseller-formatted Executive E-Book (styled with your imprint fonts & 60-30-10 palette), individual chapter readers, printable practice worksheets, progress CSV, companion workbooks & checklists, Storefront Listing Kit (for Gumroad/Etsy/Payhip), creator launch & margin scenarios, topic reading room, sanitized project backup, and a SHA-256 manifest.'
            : 'ZIP 包含品牌化 START-HERE.html 顧客歡迎入口、執行摘要與行動手冊、依您品牌字體與 60-30-10 配色排版之精裝電子書、各章閱讀器、可列印練習工作表、進度追蹤 CSV、伴隨實作工具與檢核表、商店街直接上架文案套件 (Storefront Listing Kit)、利潤試算與上市腳本、主題文獻閱讀室、無金鑰專案備份與 SHA-256 驗證清單。'}
        </p>
        <p className={`text-sm font-semibold ${buyerReady ? 'text-emerald-800' : 'text-amber-900'}`}>
          {buyerReady
            ? 'Gates A, B and C currently pass.'
            : 'Author review edition: buyer delivery remains blocked until all gates and evidence checks pass.'}
        </p>
        {!buyerReady && (
          <details className="text-sm text-slate-700">
            <summary className="cursor-pointer font-semibold">
              Review publication requirements ({publicationIssues.length})
            </summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {publicationIssues.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {!project.workflow.gates.gateC.isApproved && (
                <li>Approve Gate C after resolving review requirements.</li>
              )}
            </ul>
          </details>
        )}
      </section>

      {exportError && (
        <p role="alert" className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm font-medium">
          {exportError}
        </p>
      )}

      <section
        className="export-review space-y-4"
        aria-label={lang === 'en' ? 'E-book evidence review' : '電子書證據審查'}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'en' ? 'Review the research edition' : '研究版電子書審查'}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {lang === 'en'
                ? `${reviewCount} passages need citation or source review. Source retrieval alone does not validate a claim; each passage needs an explicit support decision.`
                : `${reviewCount} 個段落需要引用或來源審查。文獻庫的驗證標籤不代表已獨立查核論點，出版前請審查標記段落。`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            aria-expanded={showPreview}
            aria-controls="ebook-preview"
            className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-semibold shadow-xs"
          >
            {showPreview
              ? lang === 'en'
                ? 'Close preview'
                : '關閉預覽'
              : lang === 'en'
              ? 'Preview e-book'
              : '預覽電子書'}
          </button>
        </div>

        <details className="text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold">
            {lang === 'en' ? 'Chapter citation coverage' : '章節引用涵蓋率'}
          </summary>
          <ul className="mt-3 space-y-2">
            {evidence.map(({ chapter, audit }) => (
              <li
                key={chapter.id}
                className="flex flex-wrap justify-between gap-2 border-b border-slate-300/80 pb-2"
              >
                <span className="font-medium text-slate-900">{chapter.title}</span>
                <span className="font-mono text-xs text-slate-700">
                  {audit.cited}/{audit.passages}{' '}
                  {lang === 'en'
                    ? 'passages with reviewed source support'
                    : '段落已審查來源支持'}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setActiveView('content_studio')}
            className="mt-3 text-indigo-700 font-semibold underline"
          >
            {lang === 'en' ? 'Edit manuscript and citations' : '編輯稿件與引用'}
          </button>
        </details>

        {showPreview && (
          <iframe
            id="ebook-preview"
            title={lang === 'en' ? 'Executive e-book preview' : '精裝電子書預覽'}
            className="export-preview"
            sandbox="allow-scripts allow-modals"
            srcDoc={previewHtml}
          />
        )}
      </section>

      {/* Export Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {exportFiles.map((file) => {
          const Icon = file.icon;
          const isDownloaded = downloadedItems[file.id];

          return (
            <div
              key={file.id}
              className="lab-panel p-5 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-900">{file.title}</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {file.badge}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{file.desc}</p>
                <div className="text-xs font-mono text-slate-500 truncate">
                  Filename: {file.filename}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {isDownloaded
                    ? lang === 'en'
                      ? 'Downloaded'
                      : '已下載'
                    : lang === 'en'
                    ? 'Ready for export'
                    : '就緒可匯出'}
                </span>

                <button
                  type="button"
                  onClick={() => downloadFile(file.getContent(), file.filename, file.mime, file.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isDownloaded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  {isDownloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  <span>{isDownloaded ? (lang === 'en' ? 'Downloaded' : '已下載') : t.downloadFile}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
