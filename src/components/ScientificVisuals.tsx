import React from 'react';
import { DigitalProductProject, TopicCandidate } from '../types/project.ts';
import { isRetrievedSource } from '../utils/sourceEvidence.ts';
import { countManuscriptWords } from '../utils/textMetrics.ts';
import { ProfitabilityResult } from '../utils/commercialMath.ts';
import { Language } from '../utils/i18n.ts';

/**
 * Radial SVG progress gauge derived strictly from actual pipeline percentage (0–100).
 */
export const RadialTelemetryGauge: React.FC<{
  value: number;
  label: string;
  size?: number;
  accentHex?: string;
}> = ({ value, label, size = 112, accentHex = '#0891b2' }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = 42;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 112 112"
        role="img"
        aria-label={`${label}: ${clamped}%`}
        className="shrink-0"
      >
        <defs>
          <linearGradient id="studio-gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="55%" stopColor={accentHex} />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#dce8ec"
          strokeWidth="8"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#studio-gauge-grad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx}
          y={cy + 3}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-mono font-bold fill-slate-900"
          style={{ fontSize: '20px' }}
        >
          {clamped}%
        </text>
      </svg>
      <span className="text-xs font-semibold text-slate-600 text-center">{label}</span>
    </div>
  );
};

/**
 * 5-Axis Scientific Calibration Radar plotting actual project completion telemetry.
 * Zero invented data: every axis is calculated from verified project artifacts.
 */
export const StudioCalibrationRadar: React.FC<{
  project: DigitalProductProject;
  lang?: Language;
}> = ({ project, lang = 'en' }) => {
  const verifiedRefs = (project.referenceLibrary?.cards || []).filter(isRetrievedSource).length;
  const targetRefs = Math.max(1, project.referenceLibrary?.targetCount || 20);
  const evidencePct = Math.min(100, Math.round((verifiedRefs / targetRefs) * 100));

  const obsCount = (project.marketResearch?.platformEvidence || []).length;
  const marketPct = project.workflow?.gates?.gateA?.isApproved
    ? 100
    : Math.min(90, Math.round((obsCount / 6) * 100));

  const outlineCount = (project.outline || []).length;
  const structurePct = project.workflow?.gates?.gateB?.isApproved
    ? 100
    : Math.min(85, Math.round((outlineCount / 5) * 85));

  const totalTargetWords = Math.max(
    1,
    (project.outline || []).reduce((s, c) => s + (c.targetWordCount || 1500), 0)
  );
  const actualWords = (project.outline || []).reduce(
    (s, c) => s + countManuscriptWords(c.contentMarkdown || ''),
    0
  );
  const manuscriptPct = outlineCount === 0 ? 0 : Math.min(100, Math.round((actualWords / totalTargetWords) * 100));

  const resourcesCount = (project.resources || []).filter((r) => (r.contentMarkdown || '').trim().length > 120).length;
  const commercialPct = Math.min(
    100,
    Math.round(
      (resourcesCount > 0 ? 40 : 0) +
        (project.pricingReport?.regularPrice > 0 ? 30 : 0) +
        (project.workflow?.gates?.gateC?.isApproved ? 30 : 0)
    )
  );

  const axes = [
    { key: 'market', label: lang === 'en' ? 'Market' : '市場實證', value: marketPct },
    { key: 'evidence', label: lang === 'en' ? 'Sources' : '文獻證據', value: evidencePct },
    { key: 'structure', label: lang === 'en' ? 'Charter' : '架構憲章', value: structurePct },
    { key: 'manuscript', label: lang === 'en' ? 'Prose' : '章節完稿', value: manuscriptPct },
    { key: 'commercial', label: lang === 'en' ? 'Launch' : '商業套件', value: commercialPct },
  ];

  const cx = 140;
  const cy = 128;
  const maxR = 82;
  const angleStep = (2 * Math.PI) / axes.length;

  const pointAt = (index: number, pct: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const radius = (pct / 100) * maxR;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const ringLevels = [25, 50, 75, 100];
  const dataPoints = axes.map((a, idx) => pointAt(idx, Math.max(8, a.value)));
  const polygonPoints = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg
        width="280"
        height="256"
        viewBox="0 0 280 256"
        role="img"
        aria-label={lang === 'en' ? 'Project calibration radar across 5 studio dimensions' : '專案五維科學成熟度雷達圖'}
        className="shrink-0 max-w-full"
      >
        <defs>
          <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.34" />
          </linearGradient>
        </defs>

        {ringLevels.map((lvl) => {
          const pts = axes
            .map((_, idx) => {
              const p = pointAt(idx, lvl);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke={lvl === 100 ? '#94b8c3' : '#d5e4e9'}
              strokeWidth={lvl === 100 ? '1.3' : '1'}
              strokeDasharray={lvl === 50 ? '3 3' : undefined}
            />
          );
        })}

        {axes.map((a, idx) => {
          const outer = pointAt(idx, 100);
          const labelPt = pointAt(idx, 124);
          return (
            <g key={a.key}>
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="#cbdce2"
                strokeWidth="1"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-700 font-semibold"
                style={{ fontSize: '11.5px' }}
              >
                {a.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygonPoints}
          fill="url(#radar-fill)"
          stroke="#0284c7"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {dataPoints.map((pt, idx) => (
          <circle
            key={axes[idx].key}
            cx={pt.x}
            cy={pt.y}
            r="4"
            fill="#0f766e"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="flex-1 w-full space-y-2.5">
        {axes.map((a) => (
          <div key={a.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>{a.label}</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">{a.value}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-md overflow-hidden border border-slate-200/70">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{
                  width: `${a.value}%`,
                  background: 'linear-gradient(90deg, #0f766e 0%, #0284c7 100%)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Calibrated Score Spectrum Bar Set for Gate A Topic Candidates.
 */
export const ScoreSpectrumBars: React.FC<{
  breakdown: TopicCandidate['scoreBreakdown'];
  factorAssessments?: TopicCandidate['factorAssessments'];
  lang?: Language;
}> = ({ breakdown, factorAssessments, lang = 'en' }) => {
  const byKey = new Map((factorAssessments || []).map((f) => [f.key, f]));

  const rows: Array<{
    key: keyof TopicCandidate['scoreBreakdown'];
    label: string;
    val: number;
    max: number;
    color: string;
  }> = [
    {
      key: 'demandSignal',
      label: lang === 'en' ? 'Demand Signal' : '市場需求',
      val: breakdown.demandSignal,
      max: 25,
      color: '#0284c7',
    },
    {
      key: 'problemUrgency',
      label: lang === 'en' ? 'Urgency' : '痛點急迫',
      val: breakdown.problemUrgency,
      max: 15,
      color: '#0f766e',
    },
    {
      key: 'competitionEntry',
      label: lang === 'en' ? 'Entry Window' : '切入空間',
      val: breakdown.competitionEntry,
      max: 15,
      color: '#059669',
    },
    {
      key: 'differentiation',
      label: lang === 'en' ? 'Differentiation' : '差異化度',
      val: breakdown.differentiation,
      max: 15,
      color: '#d97706',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {rows.map((r) => {
        const assessment = byKey.get(r.key);
        const isUnmeasured = assessment ? assessment.status === 'UNMEASURED' : r.key !== 'demandSignal' && r.val === 0;
        const pct = isUnmeasured ? 0 : Math.max(0, Math.min(100, Math.round((r.val / r.max) * 100)));
        return (
          <div key={r.key} className="p-3 bg-slate-50/90 rounded-lg border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between gap-1 text-xs">
              <span className="font-medium text-slate-600 truncate">{r.label}</span>
              {isUnmeasured ? (
                <span className="font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  {lang === 'en' ? 'Unmeasured' : '未實測'}
                </span>
              ) : (
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {r.val}/{r.max}
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-slate-200/70 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: r.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Unit Economics Revenue Breakdown Bar for Pricing & Launch Simulator.
 */
export const UnitEconomicsChart: React.FC<{
  metrics: ProfitabilityResult;
  monthlyOverheadUsd: number;
  monthlyAcquisitionCostUsd?: number;
  lang?: Language;
}> = ({ metrics, monthlyOverheadUsd, monthlyAcquisitionCostUsd = 0, lang = 'en' }) => {
  const gross = Math.max(1, metrics.grossMonthlyRevenue);
  const net = Math.max(0, metrics.netMonthlyProfit);
  const overhead = Math.max(0, monthlyOverheadUsd);
  const acquisition = Math.max(0, monthlyAcquisitionCostUsd);
  const fees = Math.max(0, metrics.monthlyPlatformFees);

  const netPct = Math.round((net / gross) * 100);
  const feesPct = Math.round((fees / gross) * 100);
  const acqPct = Math.round((acquisition / gross) * 100);
  const overheadPct = Math.max(0, Math.min(100 - netPct - feesPct - acqPct, Math.round((overhead / gross) * 100)));

  return (
    <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-800">
          {lang === 'en' ? 'Monthly Revenue Allocation Spectrum' : '月營收分配與淨利潤光譜圖'}
        </span>
        <span className="font-mono text-slate-600 tabular-nums">
          ${metrics.grossMonthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Gross
        </span>
      </div>

      <div className="w-full h-4 rounded-md overflow-hidden flex bg-slate-200">
        {netPct > 0 && (
          <div
            style={{ width: `${netPct}%`, backgroundColor: '#059669' }}
            title={`Net Profit: ${netPct}%`}
          />
        )}
        {feesPct > 0 && (
          <div
            style={{ width: `${feesPct}%`, backgroundColor: '#0284c7' }}
            title={`Platform Fees: ${feesPct}%`}
          />
        )}
        {acqPct > 0 && (
          <div
            style={{ width: `${acqPct}%`, backgroundColor: '#7c3aed' }}
            title={`Acquisition Spend: ${acqPct}%`}
          />
        )}
        {overheadPct > 0 && (
          <div
            style={{ width: `${overheadPct}%`, backgroundColor: '#d97706' }}
            title={`Monthly Overhead: ${overheadPct}%`}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-5 text-xs font-mono text-slate-700">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
          {lang === 'en' ? 'Net Profit' : '淨利潤'}: {netPct}%
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block" />
          {lang === 'en' ? 'Platform Fees' : '通路手續費'}: {feesPct}%
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-xs bg-violet-600 inline-block" />
          {lang === 'en' ? 'Acquisition Spend' : '獲客投放成本'}: {acqPct}%
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block" />
          {lang === 'en' ? 'Overhead' : '固定成本'}: {overheadPct}%
        </span>
      </div>
    </div>
  );
};

/**
 * Geometric Scientific Pipeline Schematic shown on the Sign-In Landing View.
 */
export const ScientificWorkflowDiagram: React.FC<{ lang?: Language }> = ({ lang = 'en' }) => {
  const nodes = [
    { id: '01', title: lang === 'en' ? 'Live Charts' : '市場實證情報', sub: 'Gate A', color: '#0284c7' },
    { id: '02', title: lang === 'en' ? 'Source Citations' : '文獻逐段驗證', sub: 'Gate B', color: '#0f766e' },
    { id: '03', title: lang === 'en' ? 'Manuscript & Tools' : '專書與工具套件', sub: 'Gemini Engine', color: '#2563eb' },
    { id: '04', title: lang === 'en' ? 'Buyer Bundle .ZIP' : '商業交付成品包', sub: 'Gate C', color: '#059669' },
  ];

  return (
    <div className="bg-white/95 border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-500 border-b border-slate-100 pb-2.5">
        <span className="font-bold text-slate-800 uppercase tracking-wider">
          {lang === 'en' ? 'Verified Production Pipeline Architecture' : '科學實證數位商品產線架構'}
        </span>
        <span className="text-sky-700 font-semibold">4-PHASE PROTOCOL</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold" style={{ color: node.color }}>
                PHASE {node.id}
              </span>
              <span className="text-slate-500">{node.sub}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">{node.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
