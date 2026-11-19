import React, { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Language } from '../utils/i18n.ts';
import {
  formatElapsedClock,
  getActiveSynthesisStepIndex,
  getSynthesisVisualSteps,
  SynthesisStageKind,
} from '../utils/synthesisVisualizer.ts';

interface SynthesisProgressVisualizerProps {
  stage: SynthesisStageKind;
  model?: string;
  contextTitle?: string;
  lang?: Language;
}

const StageSchematicSvg: React.FC<{
  stage: SynthesisStageKind;
  activeStepIndex: number;
  lang: Language;
}> = ({ stage, activeStepIndex, lang }) => {
  if (stage === 'uvz') {
    const nodes = [
      { id: 'A', y: 42, label: lang === 'en' ? 'Angle 01' : '切角 01', active: activeStepIndex >= 1 },
      { id: 'B', y: 98, label: lang === 'en' ? 'Angle 02' : '切角 02', active: activeStepIndex >= 2 },
      { id: 'C', y: 154, label: lang === 'en' ? 'Angle 03' : '切角 03', active: activeStepIndex >= 3 },
    ];

    return (
      <svg
        viewBox="0 0 360 196"
        role="img"
        aria-label={
          lang === 'en'
            ? 'Animated UVZ positioning synthesis schematic'
            : 'UVZ 定位分析動態推演示意圖'
        }
        className="w-full h-auto max-h-48 select-none"
      >
        <defs>
          <linearGradient id="uvz-flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Subtle reference grid lines */}
        <line x1="20" y1="98" x2="340" y2="98" stroke="#e2edf0" strokeWidth="1" />
        <line x1="180" y1="20" x2="180" y2="176" stroke="#e2edf0" strokeWidth="1" />

        {/* Flowing signal paths from Topic Hub to 3 Positioning Angles */}
        {nodes.map((node) => (
          <g key={node.id}>
            <path
              d={`M 98 98 C 155 98, 165 ${node.y}, 228 ${node.y}`}
              fill="none"
              stroke="#cbdce2"
              strokeWidth="2"
            />
            <path
              d={`M 98 98 C 155 98, 165 ${node.y}, 228 ${node.y}`}
              fill="none"
              stroke="url(#uvz-flow-grad)"
              strokeWidth="2.2"
              className="signal-dash-animated"
              opacity={node.active ? 1 : 0.45}
            />
          </g>
        ))}

        {/* Left Topic / Brief Anchor Node */}
        <g>
          <motion.circle
            cx="62"
            cy="98"
            r="34"
            fill="#f0fdfa"
            stroke="#0f766e"
            strokeWidth="1.5"
            animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="62" cy="98" r="24" fill="#ffffff" stroke="#0f766e" strokeWidth="2" />
          <text
            x="62"
            y="94"
            textAnchor="middle"
            className="fill-teal-900 font-mono font-bold"
            style={{ fontSize: '10px' }}
          >
            GATE A
          </text>
          <text
            x="62"
            y="108"
            textAnchor="middle"
            className="fill-slate-600 font-semibold"
            style={{ fontSize: '9.5px' }}
          >
            {lang === 'en' ? 'BRIEF' : '核准脈絡'}
          </text>
        </g>

        {/* Right 3 UVZ Positioning Option Nodes */}
        {nodes.map((node, idx) => (
          <g key={node.id}>
            <motion.rect
              x="228"
              y={node.y - 19}
              width="116"
              height="38"
              rx="8"
              fill={node.active ? '#ffffff' : '#f8fafc'}
              stroke={node.active ? '#0284c7' : '#cbd5e1'}
              strokeWidth={node.active ? '1.8' : '1.2'}
              animate={
                activeStepIndex === idx || (activeStepIndex >= 2 && idx === 2)
                  ? { opacity: [0.72, 1, 0.72] }
                  : { opacity: node.active ? 1 : 0.65 }
              }
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.25 }}
            />
            <circle
              cx="246"
              cy={node.y}
              r="7"
              fill={node.active ? '#0f766e' : '#94a3b8'}
            />
            <text
              x="246"
              y={node.y + 3}
              textAnchor="middle"
              className="fill-white font-mono font-bold"
              style={{ fontSize: '8.5px' }}
            >
              {idx + 1}
            </text>
            <text
              x="262"
              y={node.y + 3.5}
              className="fill-slate-800 font-semibold"
              style={{ fontSize: '11px' }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  if (stage === 'transformation_full' || stage === 'transformation_titles') {
    const pillars = [
      {
        x: 22,
        title: 'BEFORE',
        sub: lang === 'en' ? 'Pains & Drain' : '轉變前痛點',
        stroke: '#be123c',
        fill: '#fff1f2',
        active: activeStepIndex >= 0,
      },
      {
        x: 132,
        title: 'BRIDGE',
        sub: lang === 'en' ? 'Method & Kit' : '方法論橋樑',
        stroke: '#0f766e',
        fill: '#f0fdfa',
        active: activeStepIndex >= 1,
      },
      {
        x: 242,
        title: 'AFTER',
        sub: lang === 'en' ? '3 Titles & KPI' : '成果與書名',
        stroke: '#0284c7',
        fill: '#f0f9ff',
        active: activeStepIndex >= 2,
      },
    ];

    return (
      <svg
        viewBox="0 0 360 196"
        role="img"
        aria-label={
          lang === 'en'
            ? 'Animated Transformation Map pathway schematic'
            : '轉變地圖 Before Bridge After 動態建置示意圖'
        }
        className="w-full h-auto max-h-48 select-none"
      >
        <defs>
          <linearGradient id="map-bridge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#be123c" />
            <stop offset="50%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Continuous Transformation Arc */}
        <path
          d="M 70 68 Q 180 18 290 68"
          fill="none"
          stroke="#d5e4e9"
          strokeWidth="2.5"
        />
        <path
          d="M 70 68 Q 180 18 290 68"
          fill="none"
          stroke="url(#map-bridge-grad)"
          strokeWidth="2.8"
          className="signal-dash-animated"
        />

        {/* Horizontal connector arrows */}
        <line x1="118" y1="108" x2="132" y2="108" stroke="#0f766e" strokeWidth="2" className="signal-dash-animated" />
        <line x1="228" y1="108" x2="242" y2="108" stroke="#0284c7" strokeWidth="2" className="signal-dash-animated" />

        {pillars.map((pillar, idx) => (
          <motion.g
            key={pillar.title}
            animate={
              activeStepIndex === idx || (stage === 'transformation_titles' && idx === 2)
                ? { y: [0, -3, 0] }
                : { y: 0 }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.2 }}
          >
            <rect
              x={pillar.x}
              y="68"
              width="96"
              height="80"
              rx="10"
              fill={pillar.active ? pillar.fill : '#f8fafc'}
              stroke={pillar.active ? pillar.stroke : '#cbd5e1'}
              strokeWidth={pillar.active ? '1.8' : '1.2'}
            />
            <text
              x={pillar.x + 48}
              y="92"
              textAnchor="middle"
              className="font-mono font-bold"
              fill={pillar.active ? pillar.stroke : '#64748b'}
              style={{ fontSize: '10.5px' }}
            >
              {pillar.title}
            </text>
            <text
              x={pillar.x + 48}
              y="110"
              textAnchor="middle"
              className="fill-slate-800 font-semibold"
              style={{ fontSize: '10px' }}
            >
              {pillar.sub}
            </text>
            {/* Internal progress line bars */}
            <rect x={pillar.x + 16} y="122" width="64" height="5" rx="2.5" fill="#cbd5e1" opacity="0.55" />
            <rect x={pillar.x + 16} y="132" width="46" height="5" rx="2.5" fill="#cbd5e1" opacity="0.4" />
          </motion.g>
        ))}

        {/* Bottom 3 Title Hook Anchors */}
        {[0, 1, 2].map((slot) => (
          <g key={slot}>
            <rect
              x={44 + slot * 94}
              y="162"
              width="82"
              height="22"
              rx="6"
              fill={activeStepIndex >= 2 ? '#ffffff' : '#f8fafc'}
              stroke={activeStepIndex >= 2 ? '#0284c7' : '#cbd5e1'}
              strokeWidth="1.2"
            />
            <text
              x={85 + slot * 94}
              y="176"
              textAnchor="middle"
              className="fill-slate-700 font-mono font-semibold"
              style={{ fontSize: '9px' }}
            >
              TITLE 0{slot + 1}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 360 176"
      role="img"
      aria-label={lang === 'en' ? 'Animated brief synthesis schematic' : '專案簡報潤飾動態示意圖'}
      className="w-full h-auto max-h-44 select-none"
    >
      {[
        { x: 24, label: lang === 'en' ? 'Audience' : '受眾設定' },
        { x: 132, label: lang === 'en' ? 'Friction' : '痛點問題' },
        { x: 240, label: lang === 'en' ? 'Guardrails' : '邊界定價' },
      ].map((block, idx) => (
        <motion.g
          key={block.label}
          animate={{ opacity: activeStepIndex >= idx ? [0.75, 1, 0.75] : 0.55 }}
          transition={{ duration: 1.7, repeat: Infinity, delay: idx * 0.25 }}
        >
          <rect
            x={block.x}
            y="42"
            width="96"
            height="92"
            rx="10"
            fill="#ffffff"
            stroke={activeStepIndex >= idx ? '#0f766e' : '#cbd5e1'}
            strokeWidth="1.8"
          />
          <text
            x={block.x + 48}
            y="74"
            textAnchor="middle"
            className="fill-teal-900 font-semibold"
            style={{ fontSize: '11px' }}
          >
            {block.label}
          </text>
          <rect x={block.x + 14} y="88" width="68" height="6" rx="3" fill="#cce7e4" />
          <rect x={block.x + 14} y="102" width="52" height="6" rx="3" fill="#e2edf0" />
        </motion.g>
      ))}
    </svg>
  );
};

export const SynthesisProgressVisualizer: React.FC<SynthesisProgressVisualizerProps> = ({
  stage,
  model = 'gemini-4-hydrogen',
  contextTitle,
  lang = 'en',
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    setElapsedMs(0);
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 400);
    return () => window.clearInterval(interval);
  }, [stage]);

  const steps = getSynthesisVisualSteps(stage);
  const activeIndex = getActiveSynthesisStepIndex(steps, elapsedMs);
  const elapsedClock = formatElapsedClock(elapsedMs);

  const stageHeadline =
    stage === 'uvz'
      ? lang === 'en'
        ? 'Synthesizing 3 UVZ Positioning Options & Pain Matrix'
        : '正在推演 3 組 UVZ 定位方案與買家痛點矩陣'
      : stage === 'transformation_titles'
      ? lang === 'en'
        ? 'Refreshing 3 Commercial Title & Subtitle Angles'
        : '正在重新發想 3 組商業書名與副標題切角'
      : stage === 'transformation_full'
      ? lang === 'en'
        ? 'Architecting Before → Bridge → After Map & Titles'
        : '正在建構 Before → Bridge → After 轉變地圖與書名'
      : lang === 'en'
      ? 'Polishing 13-Field Project Brief Draft'
      : '正在智能潤飾 13 項專案簡報草稿';

  const skeletonLabels =
    stage === 'uvz'
      ? [
          lang === 'en' ? 'Positioning Option 01' : '定位方案 01',
          lang === 'en' ? 'Positioning Option 02' : '定位方案 02',
          lang === 'en' ? 'Positioning Option 03' : '定位方案 03',
        ]
      : stage === 'transformation_full'
      ? [
          lang === 'en' ? 'Before State Pains' : '轉變前痛點',
          lang === 'en' ? 'Signature Bridge' : '核心方法橋樑',
          lang === 'en' ? 'After Outcomes & Titles' : '轉變成果與書名',
        ]
      : stage === 'transformation_titles'
      ? [
          lang === 'en' ? 'Title Concept 01' : '書名建議 01',
          lang === 'en' ? 'Title Concept 02' : '書名建議 02',
          lang === 'en' ? 'Title Concept 03' : '書名建議 03',
        ]
      : [
          lang === 'en' ? 'Audience Profile' : '目標受眾輪廓',
          lang === 'en' ? 'Core Friction Hook' : '核心痛點切入',
          lang === 'en' ? 'Voice & Pricing Ladder' : '語調與定價階梯',
        ];

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="status"
        data-testid={`synthesis-visualizer-${stage}`}
        className="lab-panel overflow-hidden border-teal-300 bg-white"
      >
        {/* Top animated progress track */}
        <div className="relative h-1.5 w-full bg-slate-100 overflow-hidden">
          <div
            className="synthesis-sweep-bar h-full w-2/5 rounded-full"
            style={{ background: 'linear-gradient(90deg, #0f766e 0%, #0284c7 55%, #14b8a6 100%)' }}
          />
        </div>

        <div className="p-5 lg:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3.5">
              {/* Orbital SVG calibration mark */}
              <div className="relative w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-teal-50 border border-teal-200">
                <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    fill="none"
                    stroke="#99f6e4"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="24 58"
                    className="synthesis-orbital-ring"
                  />
                  <circle cx="18" cy="18" r="3.5" fill="#0284c7" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {stageHeadline}
                </h3>
                <p className="text-xs text-slate-600">
                  {lang === 'en'
                    ? 'Generating a draft… Existing work is retained until this request succeeds.'
                    : '正在生成草稿… 請求成功前會保留現有內容。'}
                  {contextTitle ? ` · ${contextTitle}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-600 shrink-0 tabular-nums">
              <span>{model}</span>
              <span aria-hidden="true">·</span>
              <span className="font-bold text-teal-800">{elapsedClock}</span>
            </div>
          </div>

          {/* Schematic SVG + Live Step Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-2">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                {stage === 'uvz'
                  ? lang === 'en' ? 'Stage 3 Vector Convergence' : '階段 3 定位收斂路徑'
                  : stage === 'transformation_full' || stage === 'transformation_titles'
                  ? lang === 'en' ? 'Stage 4 Transformation Bridge' : '階段 4 轉變路徑橋樑'
                  : lang === 'en' ? 'Stage 2 Brief Calibration' : '階段 2 簡報校準圖'}
              </div>
              <div className="flex-1 flex items-center justify-center">
                <StageSchematicSvg stage={stage} activeStepIndex={activeIndex} lang={lang} />
              </div>
            </div>

            <ol className="lg:col-span-7 space-y-2.5">
              {steps.map((step, idx) => {
                const isDone = idx < activeIndex;
                const isCurrent = idx === activeIndex;
                return (
                  <li
                    key={step.id}
                    className={`rounded-xl border px-3.5 py-2.5 transition-colors flex items-start gap-3 ${
                      isCurrent
                        ? 'border-teal-300 bg-teal-50/55'
                        : isDone
                        ? 'border-slate-200 bg-slate-50/70'
                        : 'border-slate-200/70 bg-white opacity-70'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-teal-700 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 inline-block" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {String(idx + 1).padStart(2, '0')}. {lang === 'en' ? step.labelEn : step.labelZh}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {lang === 'en' ? step.detailEn : step.detailZh}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Target Structure Shimmer Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1" aria-hidden="true">
            {skeletonLabels.map((title, idx) => (
              <motion.div
                key={title}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5"
                animate={{ opacity: [0.55, 0.95, 0.55] }}
                transition={{
                  duration: 1.65,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: idx * 0.22,
                }}
              >
                <div className="text-[11px] font-mono font-semibold text-teal-800">{title}</div>
                <div
                  className="synthesis-skeleton-bar h-3.5 w-4/5 rounded bg-slate-200/90"
                  style={{ animationDelay: `${idx * 180}ms` }}
                />
                <div
                  className="synthesis-skeleton-bar h-2.5 w-full rounded bg-slate-200/75"
                  style={{ animationDelay: `${idx * 180 + 140}ms` }}
                />
                <div
                  className="synthesis-skeleton-bar h-2.5 w-2/3 rounded bg-slate-200/65"
                  style={{ animationDelay: `${idx * 180 + 280}ms` }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
};
