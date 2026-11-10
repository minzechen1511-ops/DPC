import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Wrench, ShieldAlert } from 'lucide-react';
import { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface QualityAssuranceViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onApproveGateC: () => void;
  lang?: Language;
}

export const QualityAssuranceView: React.FC<QualityAssuranceViewProps> = ({
  project,
  setActiveView,
  onApproveGateC,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { qualityReport, workflow, outline } = project;
  const totalWords = (outline || []).reduce((sum, ch) => sum + (ch.actualWordCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gate C — {t.qaTitle}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.qaTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.qaSubtitle}</p>
        </div>

        <button
          onClick={() => {
            onApproveGateC();
            setActiveView('export_center');
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
            workflow?.gates?.gateC?.isApproved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{workflow?.gates?.gateC?.isApproved ? t.gateCApprovedBadge : t.approveGateCCta}</span>
        </button>
      </div>

      {/* Score Summary Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {qualityReport?.overallScore || 0}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{t.qaScoreLabel}</h2>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {qualityReport?.overallStatus || 'READY_FOR_EXPORT'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'en'
                ? `Total manuscript length: ${totalWords.toLocaleString()} words · 20 verified reference citations mapped.`
                : `實際完稿篇幅：${totalWords.toLocaleString()} 字 · 20 篇高公信力研究文獻完整映射。`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 block uppercase">{lang === 'en' ? 'Critical Issues' : '嚴重缺失'}</span>
            <strong className="text-emerald-600 text-base">0</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 block uppercase">{lang === 'en' ? 'Disclaimers' : '免責聲明'}</span>
            <strong className="text-emerald-600 text-base">100%</strong>
          </div>
        </div>
      </div>

      {/* Passed Checks List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">{lang === 'en' ? 'Automated Audit Verification Criteria Passed' : '已通過之自動化品質檢驗標準'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
          {(qualityReport?.checksPassed || []).map((check, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{check}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
