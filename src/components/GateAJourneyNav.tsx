import React from 'react';
import type { DigitalProductProject, StageId } from '../types/project.ts';
import { GATE_A_STEPS, gateAJourney, setupStage } from '../utils/gateAJourney.ts';
import { gateAJourneyText, Language } from '../utils/i18n.ts';

export function GateAJourneyNav({project, current, onNavigate, lang}: {
  project: DigitalProductProject; current: string; onNavigate: (stage: StageId) => void; lang: Language;
}) {
  const currentStep = setupStage(current);
  if (!GATE_A_STEPS.includes(currentStep as any)) return null;
  const flow = gateAJourney(project);
  const copy = gateAJourneyText[lang];
  return <nav aria-label={copy.journey} className="mb-5 border-b border-slate-200 pb-4">
    <h2 className="font-semibold text-slate-900 mb-3">{copy.journey}</h2>
    <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {GATE_A_STEPS.map((id, index) => {
        const state = currentStep === id ? 'current' : flow.done[index] ? 'completed' : !flow.available[index] ? 'blocked' : 'upcoming';
        return <li key={id}><button type="button" aria-current={currentStep === id ? 'step' : undefined}
          onClick={() => onNavigate(id)} disabled={!flow.available[index] && currentStep !== id}
          className={`w-full h-full text-left rounded-lg border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-70 ${currentStep === id ? 'border-teal-700 bg-teal-50 text-teal-950' : 'border-slate-200 bg-white text-slate-700'}`}>
          <span className="block text-sm font-semibold">{index + 1}. {copy.steps[index]}</span>
          <span className="block text-xs mt-1">{copy[state]}{currentStep === id && flow.done[index] ? ` · ${copy.completed}` : ''}</span>
        </button></li>;
      })}
    </ol>
    <p className="text-sm text-slate-600 mt-3">{copy.control}</p>
  </nav>;
}
