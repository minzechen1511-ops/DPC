import React, { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import type { DigitalProductProject } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
interface Props { project: DigitalProductProject; onSavePreferences: (prefs: any) => void; lang?: Language }
export const AutomationSettingsView: React.FC<Props> = ({project,onSavePreferences,lang='en'}) => {
 const [saved,setSaved]=useState(false); const t=translations[lang];
 return <div className="max-w-5xl mx-auto space-y-6 pb-12">
  <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
   <h1 className="text-xl font-bold">{lang==='en'?'Workflow & Review Settings':'工作流程與審查設定'}</h1>
   <p className="text-sm text-slate-600">{lang==='en'?'Complete each stage deliberately. Research, selections, chapter drafts and evidence reviews remain separate actions. Gates A, B and C require your explicit approval; no stage or gate is automatically approved.':'請逐階段完成研究、選項、稿件與證據審查。Gate A、B、C 都需要您明確核准，不會自動執行或核准任何階段。'}</p>
   <ol className="space-y-3 text-sm list-decimal pl-5"><li>Gate A: inspect marketplace evidence and select a niche.</li><li>Gate B: define the product, research sources, inspect retrieved evidence, and approve the charter.</li><li>Draft each chapter and companion resource; review the support for each cited passage.</li><li>Gate C: resolve citation and quality issues, approve final review, and export.</li></ol>
   <button onClick={()=>{onSavePreferences({...project.preferences,automationMode:'manual_review',autoApproveNonCritical:false});setSaved(true);}} className="px-4 py-2 bg-indigo-700 text-white rounded-lg inline-flex items-center gap-2"><Save size={16}/>{t.saveSettings}</button>
   {saved && <p role="status" className="text-sm text-indigo-800 inline-flex gap-2 items-center"><CheckCircle2 size={16}/>Manual review settings saved.</p>}
  </section>
 </div>;
};
