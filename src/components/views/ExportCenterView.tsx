import React, { useState, useMemo } from 'react';
import { Download, FileText, Code, CheckCircle2, ShieldCheck, Layers, FileCode, Check, Archive, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { DigitalProductProject } from '../../types/project.ts';
import {
  compileManuscriptMarkdown,
  compileReferenceLibraryMarkdown,
  compileCompanionResourcesMarkdown,
  compileLaunchAssetsMarkdown,
  compileStyledHtml,
} from '../../utils/markdownCompiler.ts';
import { auditChapter } from '../../utils/styledBook.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ExportCenterViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const ExportCenterView: React.FC<ExportCenterViewProps> = ({
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
  const evidence = useMemo(() => project.outline.map(chapter => ({ chapter, audit: auditChapter(chapter, project.referenceLibrary.cards) })), [project]);
  const reviewCount = evidence.reduce((sum, item) => sum + item.audit.needsReview, 0);
  const previewHtml = useMemo(() => showPreview ? compileStyledHtml(project) : '', [showPreview, project]);

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
      id: 'manuscript_md',
      title: lang === 'en' ? 'Complete Manuscript (Markdown)' : '完整電子書專書稿件 (Complete Manuscript)',
      filename: `manuscript-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc: lang === 'en'
        ? `Clean Markdown manuscript containing all ${(project.outline || []).length} structured chapters with chapter deliverables and takeaways tables.`
        : '收錄全部章節完整正文、實作指引與交付物檢核表之標準 Markdown 檔案。',
      getContent: () => compileManuscriptMarkdown(project),
      icon: FileText,
      badge: 'Markdown',
    },
    {
      id: 'reference_md',
      title: lang === 'en' ? 'Verified Reference Library (ARCE)' : '自動研究文獻庫 (Reference Library MD)',
      filename: `reference-library-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc: lang === 'en'
        ? `Export all ${project.referenceLibrary.cards.length} source records, including their recorded verification status.`
        : `收錄 ${project.referenceLibrary.cards.length} 篇文獻紀錄與各自的驗證狀態。`,
      getContent: () => compileReferenceLibraryMarkdown(project),
      icon: FileText,
      badge: 'Markdown',
    },
    {
      id: 'resources_md',
      title: lang === 'en' ? 'Companion Toolkits & Templates' : '實作伴隨工具與工作表 (Toolkits MD)',
      filename: `companion-toolkits-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc: lang === 'en'
        ? 'Fillable worksheets, execution trackers, and decision matrices ready for distribution.'
        : '收錄即開即用之填空工作表、追蹤矩陣與備忘卡。',
      getContent: () => compileCompanionResourcesMarkdown(project),
      icon: Layers,
      badge: 'Markdown',
    },
    {
      id: 'sales_assets_md',
      title: lang === 'en' ? 'Sales Copy & Launch Suite' : '定價策略與銷售文案 (Sales Assets MD)',
      filename: `sales-assets-${project.projectId}.md`,
      mime: 'text/markdown;charset=utf-8',
      desc: lang === 'en'
        ? 'Sales page headline copy, bullet points, FAQ list, and 3-part email launch sequence.'
        : '收錄銷售頁標題、效益重點、FAQ 與 3 封發布電郵。',
      getContent: () => compileLaunchAssetsMarkdown(project),
      icon: FileCode,
      badge: 'Markdown',
    },
    {
      id: 'project_json',
      title: lang === 'en' ? 'Structured Project Backup (JSON)' : '全專案備份檔 (Project Backup JSON)',
      filename: `project-backup-${project.projectId}.json`,
      mime: 'application/json;charset=utf-8',
      desc: lang === 'en'
        ? 'Lossless structured project schema (compatible with 1-click import into Digital Product Creator).'
        : '符合 V4.0 規格之無損結構化 JSON 備份，可於「我的專案庫」一鍵重新載入。',
      getContent: () => JSON.stringify(project, null, 2),
      icon: Code,
      badge: 'JSON',
    },
    {
      id: 'styled_html',
      title: lang === 'en' ? 'Executive E-Book Layout (Styled HTML)' : '精裝出版電子書 (Styled HTML)',
      filename: `ebook-${project.projectId}.html`,
      mime: 'text/html;charset=utf-8',
      desc: lang === 'en'
        ? 'Formatted chapters, contextual figures, linked numbered citations, a reference list, and print-to-PDF styling.'
        : '包含章節圖解、段落編號引用、文末參考文獻，可於瀏覽器列印成 PDF。',
      getContent: () => compileStyledHtml(project),
      icon: FileText,
      badge: 'HTML / PDF Ready',
    },
  ];

  // One-click simultaneous download as a single complete .zip archive
  const handleDownloadZip = async () => {
    setExportError('');
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add README.txt
      const readmeText = `========================================================================
DIGITAL PRODUCT CREATOR — COMPLETE ASSET PACKAGE
Project Name: ${project.intake?.projectName || project.marketResearch?.topicCandidates?.[0]?.title || 'Digital Product Package'}
Target Audience: ${project.intake?.targetAudience || 'General Audience'}
Generated At: ${new Date().toISOString()}
Standard: V4.0 Full Autopilot Architecture
========================================================================

CONTENTS OF THIS PACKAGE:
1. manuscript-${project.projectId}.md
   - Complete manuscript with all structured chapters, chapter deliverables tables, and key takeaway bullet points.
   - 100% English formatting.

2. reference-library-${project.projectId}.md
   - 20 verified 7-part reference cards (ARCE standard).

3. companion-toolkits-${project.projectId}.md
   - Fillable companion toolkits, calculation spreadsheets, checklists, and templates.

4. sales-assets-${project.projectId}.md
   - 3-tier pricing ladder, sales page headlines, bullet points, FAQ, and 30-day launch roadmap.

5. ebook-${project.projectId}.html
   - Publication-grade styled e-book HTML. Open in Chrome or Safari and select File -> Print -> Save as PDF.

6. project-backup-${project.projectId}.json
   - Full lossless structured schema backup.

For customer support or updates, refer to the author charter in the project metadata.
`;
      zip.file('README.txt', readmeText);

      // Add each export file into zip
      for (const item of exportFiles) {
        zip.file(item.filename, item.getContent());
      }

      // Generate blob
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Trigger download
      const zipFilename = `${(project.intake?.projectName || 'digital-product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-package.zip`;
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
    } catch (err) {
      setExportError(lang === 'en' ? 'Package creation failed. Please try downloading the files individually.' : '建立壓縮包失敗，請嘗試逐一下載檔案。');
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Download className="w-3.5 h-3.5" />
            <span>{t.navExportCenter}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.exportTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.exportSubtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Primary CTA: Download All as ZIP */}
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm whitespace-nowrap active:scale-95 ${
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
              <Archive className="w-4 h-4 text-indigo-200" />
            )}
            <span>
              {isZipping
                ? (lang === 'en' ? 'Archiving Package (.ZIP)...' : '正在壓縮打包 (.ZIP)...')
                : zipSuccess
                ? (lang === 'en' ? 'ZIP Package Downloaded!' : 'ZIP 壓縮包已下載！')
                : (lang === 'en' ? 'Download All as ZIP Archive (.zip)' : '一鍵下載全部檔案 (.ZIP 壓縮包)')}
            </span>
          </button>

          {/* Secondary: Individual Sequential Download */}
          <button
            onClick={handleDownloadAll}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Download Individually' : '分開逐一儲存'}</span>
          </button>
        </div>
      </div>

      {exportError && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">{exportError}</p>}
      <section className="export-review space-y-4" aria-label={lang === 'en' ? 'E-book evidence review' : '電子書證據審查'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-base font-semibold text-slate-900">{lang === 'en' ? 'Review the research edition' : '研究版電子書審查'}</h2>
            <p className="text-sm text-slate-700">{lang === 'en' ? `${reviewCount} passages need citation or source review. Library verification labels do not independently validate a claim. Review the highlighted passages before publication.` : `${reviewCount} 個段落需要引用或來源審查。文獻庫的驗證標籤不代表已獨立查核論點，出版前請審查標記段落。`}</p>
            <p className="text-xs text-slate-600">{lang === 'en' ? 'Place [REF-01] next to the claim in Content Studio. Concept diagrams summarize the manuscript; data charts require an explicitly cited numeric table.' : '在內容工作室的論點旁加入 [REF-01]。概念圖彙整稿件內容；數據圖表必須有明確引用的數值表格。'}</p>
          </div>
          <button onClick={() => setShowPreview(v => !v)} aria-expanded={showPreview} aria-controls="ebook-preview" className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-md text-sm font-medium">{showPreview ? (lang === 'en' ? 'Close preview' : '關閉預覽') : (lang === 'en' ? 'Preview e-book' : '預覽電子書')}</button>
        </div>
        <details className="text-sm text-slate-700">
          <summary className="cursor-pointer font-medium">{lang === 'en' ? 'Chapter citation coverage' : '章節引用涵蓋率'}</summary>
          <ul className="mt-3 space-y-2">{evidence.map(({chapter, audit}) => <li key={chapter.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-300 pb-2"><span>{chapter.title}</span><span className="font-mono text-xs">{audit.cited}/{audit.passages} {lang === 'en' ? 'passages cited to full-text records' : '段落引用完整文獻紀錄'}</span></li>)}</ul>
          <button onClick={() => setActiveView('content_studio')} className="mt-3 text-indigo-700 underline">{lang === 'en' ? 'Edit manuscript and citations' : '編輯稿件與引用'}</button>
        </details>
        {showPreview && <iframe id="ebook-preview" title={lang === 'en' ? 'Executive e-book preview' : '精裝電子書預覽'} className="export-preview" sandbox="allow-scripts allow-modals" srcDoc={previewHtml} />}
      </section>

      {/* Export Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportFiles.map((file) => {
          const Icon = file.icon;
          const isDownloaded = downloadedItems[file.id];

          return (
            <div
              key={file.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs space-y-3"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">{file.title}</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {file.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{file.desc}</p>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  Filename: {file.filename}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {isDownloaded ? (lang === 'en' ? 'Downloaded' : '已下載') : (lang === 'en' ? 'Ready for export' : '就緒可匯出')}
                </span>

                <button
                  onClick={() => downloadFile(file.getContent(), file.filename, file.mime, file.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isDownloaded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  {isDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
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
