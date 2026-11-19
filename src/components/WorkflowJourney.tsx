import React from 'react';
import {ArrowLeft, ArrowRight, Check, LockKeyhole, Loader2} from 'lucide-react';
import type {DigitalProductProject, StageId} from '../types/project.ts';
import {JOURNEY_PHASES, JOURNEY_STAGES, journeyStage, nextJourneyStage, stageFinished, stageName, stageRequirements, stageHandoffCopy} from '../utils/stageJourney.ts';

interface Props {project:DigitalProductProject; current:string; lang:'en'|'zh'; onNavigate:(stage:StageId)=>void;}
export function WorkflowJourney({project,current,lang,onNavigate}:Props) {
  const stage=journeyStage(current);
  if (!stage) return null;
  const phase=JOURNEY_PHASES.findIndex(group=>group.includes(stage));
  const labels=lang==='en'?['Discover & define','Research & plan','Create & review','Package & launch']:['探索與定義','研究與規劃','創作與覆核','組裝與上市'];
  const copy=lang==='en'?{title:'Your product journey',done:'Complete',current:'Current',blocked:'Decision required',upcoming:'Upcoming',edit:'Revisit any finished stage from the sidebar.'}:{title:'您的產品開發流程',done:'已完成',current:'目前階段',blocked:'待完成前置決策',upcoming:'尚未開始',edit:'可隨時從側欄返回已完成階段修改。'};
  return <nav aria-label={copy.title} className="mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4"><h2 className="font-semibold text-slate-900">{copy.title}</h2><p className="text-xs text-slate-600">{copy.edit}</p></div>
    <ol className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
      {JOURNEY_PHASES.map((group,index)=>{const done=group.every(id=>stageFinished(project,id));return <li key={index} className={index===phase?'text-teal-900':'text-slate-600'}>
        <div className={`h-1 mb-2 rounded-full ${done?'bg-teal-700':index===phase?'bg-teal-300':'bg-slate-200'}`} />
        <span className="flex items-center gap-2 text-sm font-semibold">{done&&<Check size={15} aria-hidden="true"/>}{labels[index]}<span className="sr-only"> · {done?copy.done:index===phase?copy.current:copy.upcoming}</span></span>
        <span className="block text-xs mt-1 tabular-nums">{group.filter(id=>stageFinished(project,id)).length}/{group.length} {lang==='en'?'finished':'已完成'}</span>
      </li>;})}
    </ol>
    <ol className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-4 border-t border-slate-100 pt-3">
      {JOURNEY_PHASES[phase].map(id=>{const done=stageFinished(project,id);const blocked=JOURNEY_STAGES.slice(0,JOURNEY_STAGES.indexOf(id)).some(s=>!stageFinished(project,s));return <li key={id}>
        <button type="button" aria-current={id===stage?'step':undefined} disabled={blocked&&!done&&id!==stage} onClick={()=>onNavigate(id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:text-slate-500 ${id===stage?'bg-teal-800 text-white':'text-slate-700 hover:bg-slate-100'}`}>
          {done?<Check size={16} aria-hidden="true"/>:blocked?<LockKeyhole size={14} aria-hidden="true"/>:null}{stageName(id,lang)}<span className="sr-only"> · {done?copy.done:id===stage?copy.current:blocked?copy.blocked:copy.upcoming}</span>
        </button>
      </li>;})}
    </ol>
  </nav>;
}

export function WorkflowHandoff({project,current,lang,onNavigate,onFinish,busy,error,onRetry}:Props&{onFinish:()=>void;busy:boolean;error:string;onRetry:()=>void}) {
  const stage=journeyStage(current);
  if (!stage || stage==='export_center') return null;
  const next=nextJourneyStage(stage)!;
  const previous=JOURNEY_STAGES[JOURNEY_STAGES.indexOf(stage)-1];
  const issues=stageRequirements(project,stage,lang);
  const gate=['topic_selection','product_charter','quality_assurance'].includes(stage);
  const decision=['project_brief','uvz','transformation_map'].includes(stage);
  const localDraft=['project_brief','uvz','transformation_map','brand_design','pricing_launch'].includes(stage);
  const ready=!issues.length && (!decision || stageFinished(project,stage));
  return <section aria-label={lang==='en'?'Stage handoff':'階段交接'} className="mt-6 rounded-xl bg-slate-50 p-4 sm:p-5 border border-slate-200">
    <p className="text-sm font-semibold text-slate-900">{lang==='en'?'Next: ':'下一步：'}{stageName(next,lang)}</p>
    <p className="text-sm text-slate-700 mt-1 max-w-prose">{stageHandoffCopy[lang][stage]}</p>
    {issues.length>0&&<p className="text-sm text-amber-900 mt-3">{issues[0]}</p>}
    {decision&&!ready&&!issues.length&&<p className="text-sm text-amber-900 mt-3">{lang==='en'?'Use the accept or select action above to finish this decision.':'請使用上方的接受或選擇按鈕完成決策。'}</p>}
    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-4">
      {previous?<button type="button" disabled={busy} onClick={()=>onNavigate(previous)} className="inline-flex items-center justify-center gap-2 text-sm text-slate-700 rounded-lg px-3 py-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-teal-800"><ArrowLeft size={16}/>{lang==='en'?'Previous stage':'上一階段'}</button>:<span/>}
      {localDraft&&!error&&!busy?<p className="text-sm text-teal-900">{lang==='en'?'Use the save, accept or select action above to continue automatically.':'請使用上方的儲存、接受或選擇按鈕，即可自動繼續。'}</p>:<button type="button" disabled={busy||!ready} onClick={error?onRetry:onFinish} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-800 text-white text-sm font-semibold hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:bg-slate-200 disabled:text-slate-600">
        {busy?<Loader2 size={16} className="animate-spin motion-reduce:animate-none"/>:<ArrowRight size={16}/>}{busy?(lang==='en'?'Saving before continuing…':'儲存完成後繼續…'):error?(lang==='en'?'Retry save & continue':'重試儲存並繼續'):gate?(lang==='en'?'Continue after approval':'核准後繼續'):(lang==='en'?'Finish stage & continue':'完成階段並繼續')}
      </button>}
    </div>
    <p className="text-xs text-slate-600 mt-3">{lang==='en'?'Progress saves before the next stage opens. Gates and evidence reviews always require your explicit decision.':'儲存進度後才會開啟下一階段；關卡與證據覆核一律需要您的明確決定。'}</p>
  </section>;
}
