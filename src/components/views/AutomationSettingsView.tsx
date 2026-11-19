import React, {useEffect, useState} from 'react';
import {Save, ShieldCheck} from 'lucide-react';
import type {DigitalProductProject, UserPreferences, StageId} from '../../types/project.ts';
import {Language, gateAJourneyText} from '../../utils/i18n.ts';
import {GATE_A_STEPS, GUIDED_GENERATION_AVAILABLE} from '../../utils/gateAJourney.ts';

interface Props {
  project: DigitalProductProject;
  onSavePreferences: (prefs: UserPreferences) => void;
  setActiveView?: (view: StageId) => void;
  lang?: Language;
}

export const AutomationSettingsView: React.FC<Props> = ({project, onSavePreferences, setActiveView, lang = 'en'}) => {
  const [prefs, setPrefs] = useState(project.preferences);
  const [updated, setUpdated] = useState(false);
  const copy = gateAJourneyText[lang];
  useEffect(() => {setPrefs(project.preferences); setUpdated(false);}, [project.projectId, project.preferences]);
  return <div className="w-full space-y-5 pb-3">
    <section className="lab-panel p-5 sm:p-6 space-y-3">
      <h1 className="text-2xl font-bold text-slate-900">{lang === 'en' ? 'AI assistance & review settings' : 'AI 輔助與覆核設定'}</h1>
      <p className="text-sm text-slate-700">{copy.noRunner}</p>
      <p className="text-sm text-slate-700"><ShieldCheck className="inline w-4 h-4 mr-2" />{copy.control}</p>
      <p className="text-sm font-semibold text-slate-800">{lang === 'en' ? `Background executor: ${GUIDED_GENERATION_AVAILABLE ? 'available' : 'unavailable'}. Existing job records describe preparation steps; they do not execute AI generation.` : '背景執行器：尚未提供。既有任務紀錄僅描述準備步驟，不會執行 AI 生成。'}</p>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        {GATE_A_STEPS.map((stage,index) => <li key={stage}><button type="button" onClick={() => setActiveView?.(stage)} className="underline text-teal-800 underline-offset-4 focus-visible:outline-2">{copy.steps[index]}</button></li>)}
      </ol>
      <p className="text-sm text-slate-600">{lang === 'en' ? 'Start in Topic Discovery: scan or review evidence and explicitly approve a chosen topic on the same page. Then accept the brief, choose UVZ positioning and draft the map. Saved outputs remain editable. Failed requests leave the previous draft intact. Automatic sequence, pause and resume controls are intentionally unavailable.' : '從題材探索開始：在同一頁掃描或審查證據並明確核准題材，再接受簡報、選擇 UVZ 定位並生成轉變地圖。已儲存內容皆可編輯，請求失敗保留原草稿。目前不提供自動串接、暫停或續跑控制。'}</p>
    </section>
    <form className="lab-panel p-5 sm:p-6 space-y-5" onSubmit={event => {
      event.preventDefault();
      onSavePreferences({...prefs, automationMode: 'manual_review', autoApproveNonCritical: false});
      setUpdated(true);
    }}>
      <h2 className="text-lg font-semibold">{lang === 'en' ? 'Project defaults · optional' : '專案預設值 · 選用'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 block"><span>{lang === 'en' ? 'Market' : '市場'}</span><select className="block w-full rounded-lg border border-slate-300 p-2.5" value={prefs.market} onChange={event => setPrefs({...prefs,market: event.target.value as any})}>
          {['US','UK','CA','AU','TW','GLOBAL_EN','CUSTOM'].map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <label className="space-y-1 block"><span>{lang === 'en' ? 'Product language' : '產品語言'}</span><select className="block w-full rounded-lg border border-slate-300 p-2.5" value={prefs.language} onChange={event => setPrefs({...prefs,language:event.target.value})}>
          <option value="English">English</option><option value="Traditional Chinese">繁體中文</option>
        </select></label>
        <label className="space-y-1 block"><span>{lang === 'en' ? 'Deliverable format' : '交付形式'}</span><select className="block w-full rounded-lg border border-slate-300 p-2.5" value={prefs.productFormat} onChange={event => setPrefs({...prefs,productFormat:event.target.value as any})}>
          {Object.entries({ebook_toolkit:'E-book + toolkit',ebook:'E-book',workbook:'Workbook',template_bundle:'Template bundle',mini_course:'Mini course',challenge:'Guided challenge'}).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="space-y-1 block"><span>{lang === 'en' ? 'Source target' : '來源目標篇數'}</span><select className="block w-full rounded-lg border border-slate-300 p-2.5" value={prefs.referenceTarget} onChange={event => setPrefs({...prefs,referenceTarget:Number(event.target.value) as 8|20|30})}>
          {[8,20,30].map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
      </div>
      <button type="submit" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-800 text-white focus-visible:outline-2 focus-visible:outline-offset-2"><Save size={16} />{lang === 'en' ? 'Apply defaults' : '套用預設值'}</button>
      {updated && <p role="status" className="text-sm text-slate-700">{lang === 'en' ? 'Defaults applied. The header shows cloud saving, saved or retry status.' : '已套用預設值；頁首顯示雲端儲存中、已儲存或重試狀態。'}</p>}
    </form>
  </div>;
};
